import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {publicCampaign,createRoom,verifyJoin,applyPlayerPatch} from './room.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DATA=process.env.TENEBRIA_DATA_DIR||path.join(ROOT,'.local-rooms');fs.mkdirSync(DATA,{recursive:true});
const rooms=new Map(),sessions=new Map(),listeners=new Map();
for(const n of fs.readdirSync(DATA)){if(!/^[A-F0-9]{8}\.json$/.test(n))continue;try{const v=JSON.parse(fs.readFileSync(path.join(DATA,n),'utf8'));if(v.id&&v.campaign)rooms.set(v.id,v);}catch{}}
function persist(r){const file=path.join(DATA,`${r.id}.json`);fs.writeFileSync(file+'.tmp',JSON.stringify(r),{mode:0o600});fs.renameSync(file+'.tmp',file);}
function respond(res,status,o){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(o));}
async function read(req){return await new Promise((resolve,reject)=>{let chunks=[],size=0;req.on('data',c=>{size+=c.length;if(size>9_000_000){reject(Error('Payload acima de 9 MB.'));req.destroy();}else chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(Error('JSON inválido.'));}});req.on('error',reject);});}
function sess(sid){const s=sessions.get(sid);if(!s||Date.now()>s.expiry)return null;s.expiry=Date.now()+24*60*60*1000;return s;}
function notify(room){const subs=listeners.get(room.id)||new Map();for(const [sid,res] of subs){const s=sess(sid);if(!s){try{res.end();}catch{}subs.delete(sid);continue;}const data=JSON.stringify({type:'snapshot',campaign:publicCampaign(room.campaign,s.role,s.playerId)});try{res.write(`data: ${data}\n\n`);}catch{try{res.end();}catch{}subs.delete(sid);}}}
async function api(req,res,url){
  if(req.method==='POST'&&url.pathname==='/api/rooms'){
    const body=await read(req);if(!body.campaign||!Array.isArray(body.campaign.scenes))return respond(res,400,{error:'Campanha inválida.'});
    const x=createRoom(body.campaign);rooms.set(x.room.id,x.room);persist(x.room);return respond(res,201,{roomId:x.room.id,masterCode:x.masterCode,playerCodes:x.playerCodes});
  }
  if(req.method==='POST'&&url.pathname==='/api/join'){
    const body=await read(req),r=rooms.get(String(body.roomId||'').toUpperCase());if(!r)return respond(res,404,{error:'Sala não encontrada.'});
    const access=verifyJoin(r,body.role,body.code);if(!access)return respond(res,403,{error:'Código ou perfil inválido.'});
    const sid=randomBytes(24).toString('hex');sessions.set(sid,{roomId:r.id,...access,expiry:Date.now()+24*60*60*1000});return respond(res,200,{session:sid,role:access.role,playerId:access.playerId??null,campaign:publicCampaign(r.campaign,access.role,access.playerId)});
  }
  if(req.method==='POST'&&url.pathname==='/api/patch'){
    const body=await read(req),s=sess(body.session);if(!s)return respond(res,401,{error:'Sessão expirada.'});
    const room=rooms.get(s.roomId);if(!room)return respond(res,404,{error:'Sala indisponível.'});
    if(s.role==='master' && body.campaign){if(!Array.isArray(body.campaign.scenes))return respond(res,400,{error:'Estado inválido.'});
      room.campaign=body.campaign;room.campaign.connection=null;
    }else if(s.role==='player'){
      const c=applyPlayerPatch(room.campaign,s.playerId,body.patch||{});if(!c)return respond(res,403,{error:'Movimento/alteração não autorizado.'});room.campaign=c;
    }else return respond(res,403,{error:'Ação não autorizada.'});
    room.updatedAt=Date.now();persist(room);notify(room);return respond(res,200,{ok:true});
  }
  if(req.method==='GET'&&url.pathname==='/api/events'){
    const id=url.searchParams.get('session'),s=sess(id);if(!s)return respond(res,401,{error:'Sessão inválida.'});
    const room=rooms.get(s.roomId);if(!room)return respond(res,404,{error:'Sala não encontrada.'});
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','connection':'keep-alive','x-accel-buffering':'no','referrer-policy':'no-referrer'});
    res.write(`data: ${JSON.stringify({type:'snapshot',campaign:publicCampaign(room.campaign,s.role,s.playerId)})}\n\n`);
    if(!listeners.has(room.id))listeners.set(room.id,new Map());listeners.get(room.id).set(id,res);
    req.on('close',()=>{listeners.get(room.id)?.delete(id);});return;
  }
  return respond(res,404,{error:'Endpoint inexistente.'});
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');
  if(url.pathname.startsWith('/api/')){try{return await api(req,res,url);}catch(e){console.error(e.message);if(!res.headersSent)return respond(res,400,{error:e.message});return;}}
  if(req.method!=='GET'&&req.method!=='HEAD')return respond(res,405,{error:'Método inválido.'});
  const urlPath=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const filename=path.resolve(ROOT,'.'+urlPath);
  if(!filename.startsWith(ROOT+path.sep)||filename.startsWith(DATA+path.sep)||urlPath.includes('/.')||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);return res.end('Arquivo não encontrado');}
  res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream','cache-control':urlPath.includes('/assets/')?'public, max-age=3600':'no-cache'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(filename).pipe(res);
});
setInterval(()=>{for(const [id,s] of sessions)if(Date.now()>s.expiry)sessions.delete(id);for(const subs of listeners.values())for(const res of subs.values())try{res.write(': heartbeat\n\n');}catch{}},20000).unref();
const port=Number(process.env.PORT||4173);server.listen(port,'0.0.0.0',()=>console.log(`Tenebria VTT em http://localhost:${port}`));
