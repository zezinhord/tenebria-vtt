import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {roll} from '../src/rules.js';
import {snapTokenPosition} from '../src/grid.js';
const random=n=>randomBytes(n).toString('base64url');
export const digest=s=>createHash('sha256').update(String(s)).digest('hex');
export const secureMatch=(x,y)=>{const a=Buffer.from(digest(x),'hex'),b=Buffer.from(y,'hex');return timingSafeEqual(a,b);};
export function publicCampaign(c,role='projector',playerId=null){
  if(role==='master')return c;
  const seenTokenIds=new Set();
  const hiddenByFog=(s,t)=> (s.fog||[]).some(f=>t.x>=f.x-(t.size||40)/2 && t.x<=f.x+f.w+(t.size||40)/2 && t.y>=f.y-(t.size||40)/2 && t.y<=f.y+f.h+(t.size||40)/2);
  const scenes=(c.scenes||[]).filter(s=>s.id===c.sceneId).map(s=>({id:s.id,name:s.name,width:s.width,height:s.height,grid:s.grid,
    // Never expose original imported image underneath unrevealed fog.
    src:s.publicSrc||(s.fog?.length?'':s.src),
    fog:[],tokens:(s.tokens||[]).filter(t=>t.visible!==false&&!hiddenByFog(s,t)).map(t=>{seenTokenIds.add(t.id);return {...t,notes:undefined,secret:undefined};}),
    markers:(s.markers||[]).filter(m=>m.visible!==false&&!hiddenByFog(s,{...m,size:1}))}));
  const allowedSheets=role==='player'?(c.sheets||[]).filter(s=>s.playerId===playerId).map(s=>({...s})):[];
  return {id:c.id,name:c.name,description:c.description,sceneId:c.sceneId,scenes,sheets:allowedSheets,
    rollHistory:(c.rollHistory||[]).filter(r=>!r.private).slice(-60),combat:{...c.combat,entries:(c.combat?.entries||[]).filter(e=>seenTokenIds.has(e.tokenId)),index:0},logs:(c.logs||[]).filter(x=>!x.private).slice(-80),
    slotNames:c.slotNames,settings:{animations:c.settings?.animations??true,snap:c.settings?.snap??true},audioFiles:[],notes:''};
}
export function createRoom(c){
  const roomId=randomBytes(4).toString('hex').toUpperCase(),masterCode=random(18),playerCodes={};
  for(const slot of Object.keys(c.slotNames||{p1:1,p2:1,p3:1,p4:1}))playerCodes[slot]=random(8);
  const room={id:roomId,createdAt:Date.now(),updatedAt:Date.now(),masterHash:digest(masterCode),
    playerHashes:Object.fromEntries(Object.entries(playerCodes).map(([k,v])=>[k,digest(v)])),campaign:c};
  return {room,masterCode,playerCodes};
}
export function verifyJoin(room,role,code){
  if(role==='projector')return {role};
  if(role==='master'&&secureMatch(code||'',room.masterHash))return {role};
  if(role==='player')for(const [id,hash] of Object.entries(room.playerHashes))if(secureMatch(code||'',hash))return {role,playerId:id};
  return null;
}
export function applyPlayerPatch(c,playerId,patch){
  const out=structuredClone(c);
  if(patch.type==='move'){
    const scene=out.scenes.find(s=>s.id===patch.sceneId);const token=scene?.tokens.find(t=>t.id===patch.tokenId);
    if(!token||token.ownerId!==playerId||token.locked)return null;
    if(!Number.isFinite(patch.x)||!Number.isFinite(patch.y))return null;
    const pos=snapTokenPosition(patch.x,patch.y,scene,out.settings?.snap);
    token.x=pos.x;token.y=pos.y;return out;
  }
  if(patch.type==='dice'){
    if(typeof patch.formula!=='string')return null;
    let result;try{result=roll(patch.formula);}catch{return null;}
    out.rollHistory=[{id:random(7),...result,by:out.slotNames?.[playerId]||playerId,private:false,at:Date.now()},...(out.rollHistory||[])].slice(0,100);return out;
  }
  if(patch.type==='sheet'){
    const sheet=out.sheets.find(s=>s.id===patch.sheetId && s.playerId===playerId);
    if(!sheet)return null;
    const fields=['notes','history','equipment','weapons','skills','abilities','spells'];
    if(!fields.includes(patch.field)||typeof patch.value!=='string')return null;
    sheet[patch.field]=patch.value.slice(0,10000);return out;
  }
  return null;
}
