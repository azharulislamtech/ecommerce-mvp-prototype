import { spawn } from "node:child_process";
import { once } from "node:events";
import { startDatabaseFixture } from "../tests/support/supabase-fixture.mjs";

const port=Number(process.env.E2E_PORT??3107);
const fixturePort=Number(process.env.E2E_FIXTURE_PORT??54329);
const fixture=await startDatabaseFixture(fixturePort);
const env={...process.env,
  NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${fixturePort}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-test-public-key',
  SUPABASE_SERVICE_ROLE_KEY:'isolated-test-service-key',
  NEXT_PUBLIC_SITE_URL:`http://127.0.0.1:${port}`,
  APP_BASE_URL:`http://127.0.0.1:${port}`,
  TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',ENABLE_ONLINE_PAYMENTS:'false',NEXT_PUBLIC_ENABLE_ANALYTICS:'false',
  E2E_BASE_URL:`http://127.0.0.1:${port}`,E2E_ISOLATED:'1',E2E_FIXTURE_PORT:String(fixturePort),
  E2E_ADMIN_EMAIL:'admin@example.invalid',E2E_ADMIN_PASSWORD:'isolated-test-password'
};
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
    try {if((await fetch(env.E2E_BASE_URL,{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}} catch { /* Wait for startup. */ }
    if(app.exitCode!==null) throw new Error('Test app exited before readiness');
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!ready) throw new Error('Isolated app did not start');
  const runner=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test'],{env,stdio:'inherit',windowsHide:true});
  const [code]=await once(runner,'exit');process.exitCode=code??1;
} finally {
  if(app) {
    if(process.platform==='win32') {
      const killer=spawn('taskkill',['/pid',String(app.pid),'/t','/f'],{stdio:'ignore',windowsHide:true});await once(killer,'exit');
    } else app.kill('SIGTERM');
  }
  await fixture.close();
}
