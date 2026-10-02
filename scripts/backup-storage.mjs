import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const target=path.resolve(process.argv[2]??'.private-backups/storage');
const boundary=path.resolve('.private-backups')+path.sep;
if(!target.startsWith(boundary)) throw new Error('Backup target must stay inside .private-backups.');
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),{auth:{persistSession:false}});
await mkdir(target,{recursive:true});
let count=0,bytes=0;
async function visit(prefix='') {
  for(let offset=0;;offset+=100) {
    const {data,error}=await client.storage.from('product-images').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
    if(error) throw new Error(`Storage listing failed: ${error.statusCode??'unknown'}`);
    for(const item of data) {
      const object=prefix?`${prefix}/${item.name}`:item.name;
      if(!item.id) { await visit(object);continue; }
      const file=path.resolve(target,...object.split('/'));
      if(!file.startsWith(target+path.sep)) throw new Error('Unsafe storage object path.');
      const result=await client.storage.from('product-images').download(object);
      if(result.error) throw new Error('Storage file download failed.');
      await mkdir(path.dirname(file),{recursive:true});
      const content=Buffer.from(await result.data.arrayBuffer());await writeFile(file,content);
      count++;bytes+=content.length;
    }
    if(data.length<100) break;
  }
}
await visit();
await writeFile(path.join(target,'backup-manifest.json'),JSON.stringify({bucket:'product-images',files:count,bytes,createdAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({storageFiles:count,bytes}));
