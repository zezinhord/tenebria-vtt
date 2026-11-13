import {uid} from './rules.js';
let canvas,ctx,app,cache=new Map(),pointers=new Map(),drag=null,pinch=null,dirty=true;
export function scene(){return app.campaign?.scenes.find(s=>s.id===app.campaign.sceneId)||app.campaign?.scenes[0];}
export function invalidate(){dirty=true;}
export function initBoard(a){app=a;canvas=document.getElementById('board');ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{fitSize();invalidate();}).observe(canvas);else window.addEventListener('resize',()=>{fitSize();invalidate();});fitSize();
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('dblclick',()=>fitScene());
  canvas.addEventListener('contextmenu',e=>e.preventDefault());requestAnimationFrame(frame);
}
function fitSize(){const box=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}
const imgFor=src=>{if(!src)return null;if(!cache.has(src)){const im=new Image();const obj={im,ready:false};cache.set(src,obj);im.onload=()=>{obj.ready=true;invalidate();};im.onerror=()=>{obj.failed=true;invalidate();};im.src=src;}return cache.get(src);};
export function fitScene(){const s=scene();if(!s)return;const b=canvas.getBoundingClientRect();const z=Math.min(b.width/s.width,b.height/s.height)*.97;app.camera={zoom:z,x:(b.width-s.width*z)/2,y:(b.height-s.height*z)/2};invalidate();}
const bounds=()=>canvas.getBoundingClientRect();
function point(e){const r=bounds();return {x:e.clientX-r.left,y:e.clientY-r.top};}
export function toWorld(p){return {x:(p.x-app.camera.x)/app.camera.zoom,y:(p.y-app.camera.y)/app.camera.zoom};}
export function zoomAt(p,mult){const cam=app.camera,w=toWorld(p);cam.zoom=Math.max(.12,Math.min(4.5,cam.zoom*mult));cam.x=p.x-w.x*cam.zoom;cam.y=p.y-w.y*cam.zoom;invalidate();}
function tokenAt(w){const s=scene();return [...s.tokens].reverse().find(t=>Math.hypot(t.x-w.x,t.y-w.y)<(t.size||50)*.65);}
export function permitted(t){return app.role==='master'||(app.role==='player'&&t.ownerId===app.playerId&&!t.locked);}
const snap=(v,s)=>app.campaign.settings?.snap&&s.grid?.enabled?Math.round(v/s.grid.size)*s.grid.size:v;
function down(e){if(!scene())return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));
  if(pointers.size===2){const pair=[...pointers.values()];pinch={distance:Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y),zoom:app.camera.zoom};drag=null;return;}
  const pos=point(e),w=toWorld(pos),s=scene();if(app.role==='projector')return;
  if(app.role==='master'&&app.tool==='add-token'){const id=uid();const t={id,name:'Novo token',x:snap(w.x,s),y:snap(w.y,s),size:54,hp:10,maxHp:10,visible:true,locked:false,ownerId:null,color:'#cda268',conditions:[]};s.tokens.push(t);app.selectedTokenId=id;app.tool='select';app.changed('Token adicionado');app.render();invalidate();return;}
  if(app.role==='master'&&['fog-add','fog-reveal'].includes(app.tool)){drag={type:app.tool,start:w,end:w};invalidate();return;}
  const t=tokenAt(w);if(t){app.selectedTokenId=t.id;app.render();if(permitted(t)&&!t.locked){drag={type:'token',id:t.id,dx:t.x-w.x,dy:t.y-w.y};}invalidate();return;}
  app.selectedTokenId=null;app.render();drag={type:'pan',p:pos,origX:app.camera.x,origY:app.camera.y};
}
function move(e){if(!pointers.has(e.pointerId))return;const pos=point(e);pointers.set(e.pointerId,pos);
  if(pointers.size===2){const pair=[...pointers.values()];const dst=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);if(pinch){const center={x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2};zoomAt(center,dst/pinch.distance);pinch.distance=dst;}return;}
  if(!drag)return;const w=toWorld(pos),s=scene();
  if(drag.type==='pan'){app.camera.x=drag.origX+pos.x-drag.p.x;app.camera.y=drag.origY+pos.y-drag.p.y;}
  else if(drag.type==='token'){const t=s.tokens.find(t=>t.id===drag.id);if(t){t.x=Math.max(0,Math.min(s.width,snap(w.x+drag.dx,s)));t.y=Math.max(0,Math.min(s.height,snap(w.y+drag.dy,s)));}}
  else drag.end=w;invalidate();
}
function subtract(rect,cut){const l=Math.max(rect.x,cut.x),r=Math.min(rect.x+rect.w,cut.x+cut.w),t=Math.max(rect.y,cut.y),b=Math.min(rect.y+rect.h,cut.y+cut.h);if(l>=r||t>=b)return [rect];return [
  {x:rect.x,y:rect.y,w:rect.w,h:t-rect.y},{x:rect.x,y:b,w:rect.w,h:rect.y+rect.h-b},
  {x:rect.x,y:t,w:l-rect.x,h:b-t},{x:r,y:t,w:rect.x+rect.w-r,h:b-t}
].filter(v=>v.w>1&&v.h>1);}
function up(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;
  if(!drag)return;const d=drag;drag=null;const s=scene();if(d.type==='token'){
    const t=s.tokens.find(t=>t.id===d.id);if(!t)return;
    if(app.role==='player')app.playerPatch({type:'move',sceneId:s.id,tokenId:t.id,x:t.x,y:t.y});else app.changed('Token movido');
    app.render();
  }
  else if(['fog-add','fog-reveal'].includes(d.type)&&app.role==='master'){
    const x=Math.min(d.start.x,d.end.x),y=Math.min(d.start.y,d.end.y);
    let cut={x,y,w:Math.abs(d.start.x-d.end.x),h:Math.abs(d.start.y-d.end.y)};
    if(cut.w<16||cut.h<16)cut={x:d.end.x-45,y:d.end.y-45,w:90,h:90};
    if(d.type==='fog-add')s.fog.push(cut);else s.fog=s.fog.flatMap(f=>subtract(f,cut));
    app.changed('Névoa atualizada',true);app.render();
  }
  invalidate();
}
function wheel(e){e.preventDefault();zoomAt(point(e),e.deltaY<0?1.12:.89);}
function frame(){if(dirty)paint();requestAnimationFrame(frame);}
function paint(){dirty=false;if(!canvas.width||!canvas.height)return;const box=bounds(),dpr=canvas.width/box.width,w=box.width,h=box.height,s=scene();ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#121317';ctx.fillRect(0,0,w,h);if(!s)return;
  ctx.save();ctx.translate(app.camera.x,app.camera.y);ctx.scale(app.camera.zoom,app.camera.zoom);
  const image=imgFor(s.src);ctx.fillStyle='#393532';ctx.fillRect(0,0,s.width,s.height);
  if(image?.ready)try{ctx.drawImage(image.im,0,0,s.width,s.height);}catch{}
  if(!s.src){ctx.fillStyle='#605144';ctx.font='32px Georgia';ctx.textAlign='center';ctx.fillText('IMPORTE UM MAPA',s.width/2,s.height/2);}
  if(s.grid?.enabled){const step=Math.max(10,s.grid.size||60);ctx.beginPath();for(let x=0;x<=s.width;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,s.height);}for(let y=0;y<=s.height;y+=step){ctx.moveTo(0,y);ctx.lineTo(s.width,y);}ctx.lineWidth=1/Math.max(.2,app.camera.zoom);ctx.strokeStyle='rgba(224,197,150,.23)';ctx.stroke();}
  for(const marker of s.markers||[]){ctx.fillStyle='#e0b976';ctx.beginPath();ctx.arc(marker.x,marker.y,8,0,Math.PI*2);ctx.fill();ctx.font='17px system-ui';ctx.fillText(marker.text||'Marcador',marker.x+12,marker.y);}
  for(const t of s.tokens||[]){if(app.role!=='master' && t.visible===false)continue;const r=(t.size||54)/2;
    ctx.save();ctx.translate(t.x,t.y);ctx.rotate((t.rotation||0)*Math.PI/180);
    const active=app.campaign.combat?.entries?.[app.campaign.combat.index]?.tokenId===t.id;
    if(active){ctx.beginPath();ctx.arc(0,0,r+10,0,7);ctx.strokeStyle='#f4c16a';ctx.lineWidth=5;ctx.stroke();}
    if(app.selectedTokenId===t.id){ctx.beginPath();ctx.arc(0,0,r+7,0,7);ctx.strokeStyle='#80cdd1';ctx.lineWidth=4;ctx.stroke();}
    ctx.fillStyle='#13161b';ctx.beginPath();ctx.arc(2,4,r+2,0,7);ctx.fill();
    ctx.fillStyle=t.color||'#ca9c6d';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.strokeStyle='#e4d5bd';ctx.lineWidth=3;ctx.stroke();
    if(t.img){const ti=imgFor(t.img);if(ti?.ready){ctx.save();ctx.beginPath();ctx.arc(0,0,r-3,0,Math.PI*2);ctx.clip();ctx.drawImage(ti.im,-r,-r,2*r,2*r);ctx.restore();}}
    else{ctx.fillStyle='#171820';ctx.font=`bold ${r*.94}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.name?.slice(0,1).toUpperCase()||'?',0,-1);}
    ctx.restore();
    ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='bold 17px system-ui';ctx.strokeStyle='#15161b';ctx.lineWidth=5;ctx.strokeText((t.name||'Token').slice(0,23),t.x,t.y+r+25);ctx.fillStyle='#f1e7d7';ctx.fillText((t.name||'Token').slice(0,23),t.x,t.y+r+25);
    if(Number.isFinite(t.hp)&&Number.isFinite(t.maxHp)&&t.maxHp>0){ctx.fillStyle='#202223';ctx.fillRect(t.x-r,t.y-r-15,r*2,8);ctx.fillStyle='#7fb68d';ctx.fillRect(t.x-r,t.y-r-15,r*2*Math.max(0,Math.min(1,t.hp/t.maxHp)),8);}
  }
  // Fog drawn after tokens: concealed areas also conceal token positions.
  if(app.role==='master'&&app.showFog===false){}else{for(const f of s.fog||[]){ctx.fillStyle='rgba(6,7,12,.96)';ctx.fillRect(f.x,f.y,f.w,f.h);ctx.strokeStyle='rgba(184,137,84,.4)';ctx.lineWidth=3;ctx.strokeRect(f.x,f.y,f.w,f.h);}}
  if(drag&&['fog-add','fog-reveal'].includes(drag.type)){const x=Math.min(drag.start.x,drag.end.x),y=Math.min(drag.start.y,drag.end.y),pw=Math.abs(drag.start.x-drag.end.x),ph=Math.abs(drag.start.y-drag.end.y);ctx.fillStyle=drag.type==='fog-add'?'rgba(12,12,20,.55)':'rgba(131,193,183,.32)';ctx.fillRect(x,y,pw,ph);ctx.strokeStyle='#b9cebc';ctx.lineWidth=3;ctx.strokeRect(x,y,pw,ph);}
  ctx.restore();
  ctx.fillStyle='rgba(15,16,21,.8)';ctx.fillRect(12,h-31,193,23);ctx.fillStyle='#d9c4a2';ctx.textAlign='left';ctx.font='12px system-ui';ctx.fillText(`Zoom ${Math.round(app.camera.zoom*100)}% · ${s.grid?.size||60}px/casa`,20,h-15);
}
export async function makePublicMaps(c){for(const s of c.scenes){if(!s.fog?.length){delete s.publicSrc;continue;}const img=new Image();await new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;img.src=s.src||'';if(!s.src)resolve();});const canvas=document.createElement('canvas');canvas.width=Math.min(s.width,1800);canvas.height=Math.round(canvas.width*s.height/s.width);const x=canvas.getContext('2d');const scale=canvas.width/s.width;x.scale(scale,scale);x.fillStyle='#37333a';x.fillRect(0,0,s.width,s.height);try{if(img.complete&&img.naturalWidth)x.drawImage(img,0,0,s.width,s.height);}catch{}for(const f of s.fog){x.fillStyle='#08090d';x.fillRect(f.x,f.y,f.w,f.h);}s.publicSrc=canvas.toDataURL('image/webp',.77);}}
