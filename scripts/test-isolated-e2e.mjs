import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { startDatabaseFixture } from "../tests/support/supabase-fixture.mjs";

// Each run gets its own free ports unless E2E_PORT / E2E_FIXTURE_PORT pin them, so two runs
// (two sessions, or CI and a laptop) can never share a fixture or an app. A pinned port that
// is busy fails the run instead of silently testing another run's server.
async function freePort() {
  const probe=createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
  const {port}=probe.address();
  await new Promise(resolve=>probe.close(resolve));
  return port;
}

async function assertPortFree(port) {
  const probe=createServer();
  try {
    await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});
  } catch(error) {
    throw new Error(`App port 127.0.0.1:${port} is already in use (${error.code??error.message}); another test run may be active.`);
  }
  await new Promise(resolve=>probe.close(resolve));
}

const port=process.env.E2E_PORT?Number(process.env.E2E_PORT):await freePort();
await assertPortFree(port);
const fixture=await startDatabaseFixture(process.env.E2E_FIXTURE_PORT?Number(process.env.E2E_FIXTURE_PORT):0);
const fixturePort=fixture.port;
const env={...process.env,
  NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${fixturePort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-test-public-key',
  SUPABASE_SERVICE_ROLE_KEY:'isolated-test-service-key',
  NEXT_PUBLIC_SITE_URL:`http://127.0.0.1:${port}`,
  APP_BASE_URL:`http://127.0.0.1:${port}`,
  TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',ENABLE_ONLINE_PAYMENTS:'false',NEXT_PUBLIC_ENABLE_ANALYTICS:'false',
  E2E_BASE_URL:`http://127.0.0.1:${port}`,E2E_ISOLATED:'1',E2E_FIXTURE_PORT:String(fixturePort),
  E2E_ADMIN_EMAIL:'admin@example.invalid',E2E_ADMIN_PASSWORD:'isolated-test-password',CRON_SECRET:'isolated-test-cron-secret'
};
console.log(`Isolated e2e: app on ${port}, fixture on ${fixturePort}`);
let app;
try {
  const production=process.argv.includes('--production');
  if(production) {
    const build=spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{env,stdio:'inherit',windowsHide:true});
    const [code]=await once(build,'exit');if(code!==0) throw new Error('Isolated production build failed');
  }
  app=spawn(process.execPath,['node_modules/next/dist/bin/next',production?'start':'dev','-H','127.0.0.1','-p',String(port)],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  app.stdout.on('data',chunk=>process.stdout.write(chunk));app.stderr.on('data',chunk=>process.stderr.write(chunk));
  let ready=false;
  for(let attempt=0;attempt<120;attempt++) {
    if(app.exitCode!==null) throw new Error(`Test app exited (code ${app.exitCode}) before it was ready`);
    try {
      // The port was free and our own process is still alive, so this answer is our app.
      const response=await fetch(env.E2E_BASE_URL,{signal:AbortSignal.timeout(2000)});
      if(response.ok&&app.exitCode===null){ready=true;break;}
    } catch { /* Wait for startup. */ }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready) throw new Error('Isolated app did not start');
  const runner=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2).filter(arg=>arg!=='--production')],{env,stdio:'inherit',windowsHide:true});
  const [code]=await once(runner,'exit');process.exitCode=code??1;
} catch(error) {
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
} finally {
  if(app&&app.exitCode===null) {
    if(process.platform==='win32') {
      const killer=spawn('taskkill',['/pid',String(app.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});await once(killer,'exit');
    } else app.kill('SIGTERM');
  }
  await fixture.close();
}
