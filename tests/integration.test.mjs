import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeDemo} from '../src/demo.js';

const dir=mkdtempSync(path.join(os.tmpdir(),'tenebria-vtt-sessions-'));
const port=51940+Math.floor(Math.random()*800);
const base=`http://127.0.0.1:${port}`;
let server;
async function boot(){server=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),TENEBRIA_DATA_DIR:dir,TENEBRIA_ALLOWED_ORIGINS:'https://zezinhord.github.io'},stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error('Servidor não iniciou.');}
const post=async(path,data,headers={})=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(data)});return {status:r.status,body:await r.json(),headers:r.headers};};
const stream=async session=>{const controller=new AbortController();const res=await fetch(base+'/api/events?session='+session,{signal:controller.signal});if(!res.ok){controller.abort();throw Error('SSE '+res.status);}const reader=res.body.getReader();const decoder=new TextDecoder();let pending='';const next=async()=>{for(let i=0;i<20;i++){const done=await reader.read();if(done.done)throw Error('SSE fechado');pending+=decoder.decode(done.value);const end=pending.indexOf('\n\n');if(end>=0){const data=pending.slice(0,end);pending=pending.slice(end+2);if(data.startsWith('data: '))return JSON.parse(data.slice(6));}}throw Error('SSE sem evento');};return {next,close:()=>controller.abort()};};

test('Mesa presencial: Mestre + projetor independentes, sigilo, mapas, tokens, rolagens, áudio e reconexão',async()=>{
  await boot();let projectorEvents=null,playerEvents=null;
  try{
    const c=makeDemo();c.notes='TOP_SECRET_MASTER_NOTE';c.scenes[0].publicSrc='data:image/png;base64,U0FGRV9QT0s=';
    const made=await post('/api/rooms',{campaign:c,mode:'presencial'});assert.equal(made.status,201);const room=made.body;
    assert.match(room.roomId,/^[0-9A-F]{8}$/);assert.equal(room.mode,'presencial');
    assert.equal((await post('/api/join',{roomId:room.roomId,role:'projector',code:''})).status,403);
    assert.equal((await post('/api/join',{roomId:room.roomId,role:'master',code:'invalid'})).status,403);
    const m=(await post('/api/join',{roomId:room.roomId,role:'master',code:room.masterCode})).body;
    const p=(await post('/api/join',{roomId:room.roomId,role:'projector',code:room.projectorCode})).body;
    assert.equal(m.campaign.notes,'TOP_SECRET_MASTER_NOTE');assert.equal(p.campaign.notes,'');assert.equal(p.campaign.sheets.length,0);
    assert.equal(p.campaign.scenes[0].src,c.scenes[0].publicSrc);
    assert.ok(!JSON.stringify(p.campaign).includes('TOP_SECRET_MASTER_NOTE'));
    assert.ok(!JSON.stringify(p.campaign).includes('Sentinela Corrompida'));
    assert.equal(p.campaign.audioFiles.length,3);
    projectorEvents=await stream(p.session);await projectorEvents.next();
    const changed=structuredClone(c);changed.name='Cripta revelada';changed.scenes[0].tokens.find(t=>t.id==='t1').x=330;
    changed.sceneId='village';
    assert.equal((await post('/api/patch',{session:m.session,campaign:changed})).status,200);
    const next=await projectorEvents.next();assert.equal(next.campaign.name,'Cripta revelada');assert.equal(next.campaign.sceneId,'village');
    assert.equal(next.campaign.scenes[0].tokens.find(t=>t.id==='vt1').ownerId,'p1');
    assert.equal((await post('/api/patch',{session:p.session,patch:{type:'move',sceneId:'village',tokenId:'vt1',x:333,y:333}})).status,403);
    assert.equal((await post('/api/patch',{session:m.session,patch:{type:'move',sceneId:'village',tokenId:'vt1',x:333,y:333}})).status,200);
    const motion=await projectorEvents.next();assert.equal(motion.type,'move');assert.equal(motion.token.x,330);assert.ok(!JSON.stringify(motion).includes('TOP_SECRET_MASTER_NOTE'));
    const reopened=await post('/api/resume',{session:p.session});assert.equal(reopened.status,200);assert.equal(reopened.body.campaign.sceneId,'village');
    assert.equal((await post('/api/control',{session:p.session,command:{action:'stop',target:'all'}})).status,403);
    assert.equal((await post('/api/control',{session:m.session,command:{action:'play',target:'projector',id:'sound-bell',volume:.5,loop:false}})).status,200);
    const audio=await projectorEvents.next();assert.equal(audio.type,'audio');assert.equal(audio.command.id,'sound-bell');
    assert.equal((await post('/api/room-status',{session:m.session,closed:true})).status,200);
    assert.equal((await post('/api/join',{roomId:room.roomId,role:'projector',code:room.projectorCode})).status,410);
    assert.equal((await post('/api/room-status',{session:m.session,closed:false})).status,200);
    assert.equal((await post('/api/join',{roomId:room.roomId,role:'projector',code:room.projectorCode})).status,200);
    assert.equal((await post('/api/patch',{session:m.session,campaign:changed})).status,200);
  }finally{projectorEvents?.close();server.kill();}
},{timeout:20000});

test('Mesa online: acesso remoto autorizado, atualização SSE, rolagem no servidor, retomada e CORS',async()=>{
  await boot();let playerEvents=null;
  try{
    const c=makeDemo();c.notes='NÃO COMPARTILHAR';c.scenes[0].publicSrc='data:image/png;base64,QUJD';
    const made=await post('/api/rooms',{campaign:c,mode:'online'});assert.equal(made.status,201);const room=made.body;
    const m=(await post('/api/join',{roomId:room.roomId,role:'master',code:room.masterCode})).body;
    const j=(await post('/api/join',{roomId:room.roomId,role:'player',code:room.playerCodes.p1})).body;
    assert.equal(j.mode,'online');assert.equal(j.campaign.sheets.length,1);assert.equal(j.campaign.sheets[0].playerId,'p1');assert.equal(j.campaign.notes,'');
    playerEvents=await stream(j.session);await playerEvents.next();
    assert.equal((await post('/api/patch',{session:j.session,patch:{type:'move',sceneId:'dungeon',tokenId:'t2',x:240,y:390}})).status,403);
    assert.equal((await post('/api/patch',{session:j.session,patch:{type:'move',sceneId:'dungeon',tokenId:'t1',x:240,y:390}})).status,200);
    let state=await playerEvents.next();assert.equal(state.type,'move');assert.equal(state.token.x,270);
    const r=await post('/api/patch',{session:j.session,patch:{type:'dice',formula:'2D6+3',total:999999}});assert.equal(r.status,200);
    state=await playerEvents.next();assert.equal(state.campaign.rollHistory[0].formula,'2D6+3');assert.ok(state.campaign.rollHistory[0].total<=15);assert.notEqual(state.campaign.rollHistory[0].total,999999);
    assert.equal((await post('/api/patch',{session:j.session,patch:{type:'sheet',sheetId:'s2',field:'notes',value:'no'} })).status,403);
    assert.equal((await post('/api/resume',{session:j.session})).status,200);
    const sameOrigin=await post('/api/patch',{session:m.session,campaign:c},{origin:base});assert.equal(sameOrigin.status,200);
    const denied=await post('/api/patch',{session:m.session,campaign:c},{origin:'https://evil.example'});assert.equal(denied.status,403);
    const allowed=await post('/api/patch',{session:m.session,campaign:c},{origin:'https://zezinhord.github.io'});assert.equal(allowed.status,200);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://zezinhord.github.io');
  }finally{playerEvents?.close();server.kill();rmSync(dir,{recursive:true,force:true});}
},{timeout:20000});
