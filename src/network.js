async function request(url,payload){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});let data={};try{data=await r.json();}catch{}if(!r.ok)throw Error(data.error||`HTTP ${r.status}`);return data;}
export const createRoom=campaign=>request('api/rooms',{campaign});
export const joinRoom=(roomId,role,code='')=>request('api/join',{roomId,role,code});
export const submitMaster=(session,campaign)=>request('api/patch',{session,campaign});
export const submitPlayer=(session,patch)=>request('api/patch',{session,patch});
export function subscribe(session,onCampaign,onStatus){const eventStream=new EventSource(`api/events?session=${encodeURIComponent(session)}`);
  eventStream.onopen=()=>onStatus('Conectado');eventStream.onerror=()=>onStatus('Reconectando…');eventStream.onmessage=ev=>{try{const d=JSON.parse(ev.data);if(d.type==='snapshot')onCampaign(d.campaign);}catch(e){console.error('Snapshot inválido',e);}};
  return ()=>eventStream.close();
}
