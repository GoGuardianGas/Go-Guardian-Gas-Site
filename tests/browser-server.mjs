// Local browser QA only. Never imported by production functions or copied to dist.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createPermitHandler } from '../netlify/lib/permit-core.mjs';
if (process.env.PERMIT_BROWSER_TEST !== '1' || process.env.CONTEXT === 'production' || process.env.NETLIFY === 'true') throw new Error('The synthetic browser harness may run only in local test mode.');
const data=new Map();let version=0;
const store={
 async get(key){return data.has(key)?structuredClone(data.get(key).data):null;},
 async getWithMetadata(key){return data.has(key)?structuredClone(data.get(key)):null;},
 async setJSON(key,value,options={}){if(options.onlyIfMatch&&data.get(key)?.etag!==options.onlyIfMatch)return {modified:false};data.set(key,{data:structuredClone(value),etag:String(++version)});return {modified:true};},
 async set(key,value){data.set(key,{data:structuredClone(value),etag:String(++version)});},
 async list({prefix}){return {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}
};
const handler=createPermitHandler({getStore:()=>store,getStaff:req=>(req.headers.get('cookie')||'').includes('ggs-qa-staff=1')?{id:'synthetic-staff',email:'qa@example.invalid',confirmedAt:'2026-01-01',roles:['permits-staff']}:null});
async function seed(action,value,caseId){
 const result=await handler(new Request(`http://qa.invalid/.netlify/functions/guardian-permits?action=${action}${caseId?'&caseId='+caseId:''}`,{method:'POST',headers:{Origin:'http://qa.invalid',Cookie:'ggs-qa-staff=1','Content-Type':'application/json'},body:JSON.stringify(value)}));
 if(!result.ok)throw new Error('Synthetic fixture setup failed.');return result.json();
}
const qaJurisdiction=await seed('jurisdictions',{county:'Orange',authorityType:'municipality',municipality:'QA Municipality',requirements:[{name:'Test permit application',instructions:'Upload the sample PDF.'},{name:'Test owner authorization'}]});
const qaCase=await seed('cases',{jurisdictionId:qaJurisdiction.jurisdiction.id,clientName:'QA Client Alpha',address:'Synthetic test address — no real property',reference:'QA-ALPHA',months:3});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.jpg':'image/jpeg','.pdf':'application/pdf'};
const root=resolve('dist');
http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/__test/'||pathname==='/') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Guardian Permits — synthetic QA</title><h1>Guardian Permits browser testing</h1><p>Local synthetic data only. These controls are not part of the deployed app.</p><p>Sample client access code: <code>${qaCase.code}</code></p><p><a href="/__test/staff">Open staff test workspace</a></p><p><a href="/__test/client">Open client test portal</a></p></html>`);return;}
  if(pathname==='/__test/staff'||pathname==='/__test/client'){res.writeHead(302,{'Set-Cookie':`ggs-qa-staff=${pathname.endsWith('staff')?'1':''}; Path=/; SameSite=Strict`,Location:pathname.endsWith('staff')?'/guardian-permits/staff.html':'/guardian-permits/'});res.end();return;}
  if(pathname==='/.netlify/functions/guardian-permits'){
   let origin;try{origin=(await readFile('tests/.browser-origin','utf8')).trim();}catch{origin=`http://${req.headers.host}`;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers=new Headers(req.headers);
   // The local preview is HTTP. Translate the synthetic cookie name only here;
   // production keeps its Secure __Host cookie with no such adapter.
   if(origin.startsWith('http:'))headers.set('cookie',(headers.get('cookie')||'').replaceAll('ggs-qa-client=','__Host-ggs-permits='));
   const response=await handler(new Request(origin+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}));
   const outgoing=Object.fromEntries(response.headers);
   if(origin.startsWith('http:')&&outgoing['set-cookie'])outgoing['set-cookie']=outgoing['set-cookie'].replace('__Host-ggs-permits=','ggs-qa-client=').replace('; Secure','');
   res.writeHead(response.status,outgoing);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const target=resolve(root,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!target.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Test resource unavailable.');}
}).listen(Number((process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:null) || process.env.PORT || 4173),'0.0.0.0',()=>console.log('Synthetic Guardian Permits browser harness ready.'));
