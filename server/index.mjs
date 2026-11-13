import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {publicCampaign,createRoom,verifyJoin,applyPlayerPatch,applyMasterMove} from './room.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DATA=path.resolve(process.env.TENEBRIA_DATA_DIR||path.join(ROOT,'.local-rooms'));
fs.mkdirSync(DATA,{recursive:true});
const rooms=new Map(),sessions=new Map(),listeners=new Map();
const allowedOrigins=new Set((process.env.TENEBRIA_ALLOWED_ORIGINS||'https://zezinhord.github.io').split(',').map(v=>v.trim()).filter(Boolean));
const ttl=24*60*60*1000;
for(const name of fs.readdirSync(DATA)){
  if(!/^[A-F0-9]{8}\.json$/.test(name))continue;
  try{const room=JSON.parse(fs.readFileSync(path.join(DATA,name),'utf8'));if(room.id&&room.campaign)rooms.set(room.id,room);}catch{}
}
function persist(room){const filename=path.join(DATA,`${room.id}.json`);fs.writeFileSync(filename+'.tmp',JSON.stringify(room),{mode:0o600});fs.renameSync(filename+'.tmp',filename);}
function reply(res,status,payload){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(payload));}
async function parse(req){return await new Promise((resolve,reject)=>{let chunks=[],size=0;req.on('data',c=>{size+=c.length;if(size>9_000_000){reject(Error('Payload acima de 9 MB.'));req.destroy();}else chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(Error('JSON inválido.'));}});req.on('error',reject);});}
function session(id){const s=sessions.get(id);if(!s||s.expires<Date.now()){sessions.delete(id);return null;}s.expires=Date.now()+ttl;return s;}
function view(s,room){return {session:s.id,role:s.role,playerId:s.playerId||null,roomId:room.id,mode:room.mode||'presencial',closed:!!room.closed,revision:room.revision||0,campaign:publicCampaign(room.campaign,s.role,s.playerId)};}
function broadcast(room,type='snapshot',data=null){
  for(const sub of listeners.get(room.id)||[]){const s=session(sub.session);if(!s){sub.res.end();listeners.get(room.id).delete(sub);continue;}
    if(type==='audio'){
      if(data.target==='projector'&&s.role!=='projector'||data.target==='players'&&s.role!=='player')continue;
      if(data.target==='all'&&s.role==='master')continue;
      if(s.role==='master')continue;
    }
    let packet;
    if(type==='move'){
      const safe=publicCampaign(room.campaign,s.role,s.playerId);
      const token=safe.scenes.find(x=>x.id===data.sceneId)?.tokens.find(x=>x.id===data.tokenId)||null;
      packet={type:'move',sceneId:data.sceneId,tokenId:data.tokenId,token};
    }else if(type==='snapshot')packet={type:'snapshot',revision:room.revision||0,closed:!!room.closed,campaign:publicCampaign(room.campaign,s.role,s.playerId)};
    else packet={type,command:data};
    try{sub.res.write(`data: ${JSON.stringify(packet)}\n\n`);}catch{sub.res.end();listeners.get(room.id).delete(sub);}
  }
}
async function api(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true,application:'tenebria-vtt',protocol:2});
  if(req.method==='POST'&&url.pathname==='/api/rooms'){
    const body=await parse(req);if(!body.campaign||!Array.isArray(body.campaign.scenes)||!Array.isArray(body.campaign.sheets))return reply(res,400,{error:'Campanha inválida.'});
    if(!['online','presencial'].includes(body.mode))return reply(res,400,{error:'Modalidade inválida.'});
    const r=createRoom(body.campaign,body.mode);rooms.set(r.room.id,r.room);persist(r.room);return reply(res,201,{roomId:r.room.id,mode:r.room.mode,masterCode:r.masterCode,projectorCode:r.projectorCode,playerCodes:r.playerCodes});
  }
  if(req.method==='POST'&&url.pathname==='/api/join'){
    const b=await parse(req),room=rooms.get(String(b.roomId||'').trim().toUpperCase());if(!room)return reply(res,404,{error:'Sala não encontrada.'});
    if(room.closed&&b.role!=='master')return reply(res,410,{error:'A sala foi encerrada pelo Mestre.'});
    const access=verifyJoin(room,b.role,b.code);if(!access)return reply(res,403,{error:'Código ou perfil inválido.'});
    const id=randomBytes(24).toString('hex');const s={id,roomId:room.id,...access,expires:Date.now()+ttl};sessions.set(id,s);
    return reply(res,200,view(s,room));
  }
  if(req.method==='POST'&&url.pathname==='/api/resume'){
    const b=await parse(req),s=session(b.session);if(!s)return reply(res,401,{error:'Sessão expirada.'});const room=rooms.get(s.roomId);
    if(!room)return reply(res,404,{error:'Sala indisponível.'});if(room.closed&&s.role!=='master')return reply(res,410,{error:'Sessão encerrada.'});
    return reply(res,200,view(s,room));
  }
  if(req.method==='POST'&&url.pathname==='/api/room-status'){
    const b=await parse(req),s=session(b.session);if(!s)return reply(res,401,{error:'Sessão expirada.'});if(s.role!=='master')return reply(res,403,{error:'Apenas o Mestre pode encerrar ou retomar.'});
    const room=rooms.get(s.roomId);room.closed=!!b.closed;room.updatedAt=Date.now();room.revision=(room.revision||0)+1;persist(room);broadcast(room);return reply(res,200,{ok:true,closed:room.closed});
  }
  if(req.method==='POST'&&url.pathname==='/api/patch'){
    const b=await parse(req),s=session(b.session);if(!s)return reply(res,401,{error:'Sessão expirada.'});
    const room=rooms.get(s.roomId);if(!room)return reply(res,404,{error:'Sala indisponível.'});
    if(room.closed)return reply(res,410,{error:'Sala encerrada.'});
    let reason='state';
    if(s.role==='master'&&b.patch?.type==='move'){const updated=applyMasterMove(room.campaign,b.patch);if(!updated)return reply(res,403,{error:'Movimento inválido.'});room.campaign=updated;reason='move';}
    else if(s.role==='master'&&b.campaign){if(!Array.isArray(b.campaign.scenes)||!Array.isArray(b.campaign.sheets))return reply(res,400,{error:'Campanha inválida.'});
      if(b.campaign.id!==room.campaign.id)return reply(res,400,{error:'Campanha não corresponde à sala.'});
      room.campaign=b.campaign;room.campaign.connection=null;
    }else if(s.role==='player'){
      const updated=applyPlayerPatch(room.campaign,s.playerId,b.patch||{});if(!updated)return reply(res,403,{error:'Movimento ou alteração não autorizado.'});room.campaign=updated;reason=b.patch?.type==='move'?'move':'state';
    }else return reply(res,403,{error:'Ação não autorizada.'});
    room.updatedAt=Date.now();room.revision=(room.revision||0)+1;persist(room);broadcast(room,reason==='move'?'move':'snapshot',reason==='move'?b.patch:null);return reply(res,200,{ok:true,revision:room.revision});
  }
  if(req.method==='POST'&&url.pathname==='/api/control'){
    const b=await parse(req),s=session(b.session);if(!s)return reply(res,401,{error:'Sessão expirada.'});
    if(s.role!=='master')return reply(res,403,{error:'Apenas o Mestre controla o áudio.'});const room=rooms.get(s.roomId);
    if(room.closed)return reply(res,410,{error:'Sala encerrada.'});
    const c=b.command||{},builtin=(room.campaign.audioFiles||[]).find(a=>a.id===c.id&&!a.key&&typeof a.url==='string'&&/^assets\/[\w-]+\.wav$/.test(a.url));
    if(!['play','stop'].includes(c.action)||!['projector','players','all'].includes(c.target)||c.action==='play'&&!builtin)return reply(res,400,{error:'Comando ou áudio não compartilhável.'});
    const cmd={action:c.action,target:c.target,id:c.action==='play'?builtin.id:null,volume:Math.min(1,Math.max(0,Number(c.volume)||0)),loop:!!c.loop};broadcast(room,'audio',cmd);return reply(res,200,{ok:true});
  }
  if(req.method==='GET'&&url.pathname==='/api/events'){
    const s=session(url.searchParams.get('session')),room=s&&rooms.get(s.roomId);if(!room)return reply(res,401,{error:'Sessão expirada.'});
    if(room.closed&&s.role!=='master')return reply(res,410,{error:'Sala encerrada.'});
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','connection':'keep-alive','x-accel-buffering':'no','referrer-policy':'no-referrer'});
    res.write(`data: ${JSON.stringify({type:'snapshot',revision:room.revision||0,closed:!!room.closed,campaign:publicCampaign(room.campaign,s.role,s.playerId)})}\n\n`);
    if(!listeners.has(room.id))listeners.set(room.id,new Set());const sub={session:s.id,res};listeners.get(room.id).add(sub);
    req.on('close',()=>listeners.get(room.id)?.delete(sub));return;
  }
  return reply(res,404,{error:'Endpoint inexistente.'});
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),origin=req.headers.origin;
  res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');
  const expectedOrigin=`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  const originAuthorized=!origin||origin===expectedOrigin||allowedOrigins.has(origin);
  if(origin&&originAuthorized){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-methods','GET, POST, OPTIONS');res.setHeader('access-control-allow-headers','content-type');}
  if(req.method==='OPTIONS')return res.writeHead(originAuthorized?204:403).end();
  if(url.pathname.startsWith('/api/')){if(!originAuthorized)return reply(res,403,{error:'Origem não autorizada.'});
    try{return await api(req,res,url);}catch(e){console.error(e.message);if(!res.headersSent)return reply(res,400,{error:e.message});return;}}
  if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'Método inválido.'});
  let urlPath;try{urlPath=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);}catch{return reply(res,400,{error:'Caminho inválido.'});}
  const filename=path.resolve(ROOT,'.'+urlPath);
  if(!filename.startsWith(ROOT+path.sep)||filename.startsWith(DATA+path.sep)||urlPath.includes('/.')||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);return res.end('Arquivo não encontrado');}
  res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream','cache-control':urlPath.includes('/assets/')?'public, max-age=3600':'no-cache'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(filename).pipe(res);
});
setInterval(()=>{for(const [id,s] of sessions)if(Date.now()>s.expires)sessions.delete(id);for(const subs of listeners.values())for(const sub of subs)try{sub.res.write(': heartbeat\n\n');}catch{}},20000).unref();
const port=Number(process.env.PORT||4173);server.listen(port,'0.0.0.0',()=>console.log(`Tenebria VTT em http://localhost:${port}`));
