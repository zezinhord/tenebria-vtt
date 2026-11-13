// The same session protocol serves local Wi-Fi sessions and remote HTTPS rooms.
const KEY='tenebria:server-url';
export const serverURL=()=>localStorage.getItem(KEY)||'';
export function setServerURL(value){const clean=String(value||'').trim().replace(/\/+$/,'');
  if(!clean){localStorage.removeItem(KEY);return '';}
  const u=new URL(clean);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Informe apenas a origem HTTP(S) do servidor, sem caminhos.');
  if(location.protocol==='https:'&&u.protocol!=='https:')throw Error('No GitHub Pages, o servidor remoto precisa usar HTTPS. Para rede local HTTP, abra o próprio endereço do servidor no navegador.');
  localStorage.setItem(KEY,u.origin);return u.origin;
}
export function apiOrigin(){const configured=serverURL();if(configured)return configured;
  if(location.hostname.endsWith('.github.io'))throw Error('Configure o endereço HTTPS do servidor em Sessão para usar salas entre dispositivos. O GitHub Pages não hospeda o servidor.');
  return location.origin;
}
function endpoint(path){return apiOrigin()+path;}
async function request(path,payload){let response;
  try{response=await fetch(endpoint(path),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});}
  catch(e){throw Error(`Não foi possível acessar o servidor: ${e.message}`);}
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);return data;
}
export const createRoom=(campaign,mode='presencial')=>request('/api/rooms',{campaign,mode});
export const joinRoom=(roomId,role,code='')=>request('/api/join',{roomId,role,code});
export const resumeRoom=session=>request('/api/resume',{session});
export const closeRoom=(session,closed=true)=>request('/api/room-status',{session,closed});
export const submitMaster=(session,campaign)=>request('/api/patch',{session,campaign});
export const submitPlayer=(session,patch)=>request('/api/patch',{session,patch});
export const submitMovement=(session,patch)=>request('/api/patch',{session,patch});
export const sendAudio=(session,command)=>request('/api/control',{session,command});
export const checkServer=async()=>{
  const response=await fetch(endpoint('/api/health'),{cache:'no-store'});if(!response.ok)throw Error('Servidor não respondeu corretamente.');
  const data=await response.json();if(data.application!=='tenebria-vtt')throw Error('O endereço não aponta para um servidor Tenebria.');return data;
};
export function subscribe(session,onCampaign,onStatus,onEvent=()=>{}){
  const stream=new EventSource(endpoint(`/api/events?session=${encodeURIComponent(session)}`));
  stream.onopen=()=>onStatus('Conectado');stream.onerror=()=>onStatus('Reconectando…');
  stream.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='snapshot')onCampaign(data.campaign,data);else onEvent(data);}catch(err){console.error('Evento SSE inválido:',err);}};
  return ()=>stream.close();
}
export function inviteURL(roomId,role,code){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',roomId);url.searchParams.set('role',role);
  const secret=new URLSearchParams();secret.set('code',code);if(serverURL())secret.set('api',serverURL());
  url.hash=secret.toString();return url.toString();
}
export function readInvitation(){const query=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,''));return {
  room:query.get('room')||'',role:query.get('role')||'',code:hash.get('code')||'',api:hash.get('api')||''
};}
