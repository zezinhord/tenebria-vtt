import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {makeDemo} from '../src/demo.js';
const port=51940+Math.floor(Math.random()*500),root=`http://127.0.0.1:${port}`;
const dir=mkdtempSync(path.join(os.tmpdir(),'tenebria-test-'));
const server=spawn(process.execPath,['server/index.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),TENEBRIA_DATA_DIR:dir},stdio:'ignore'});
const request=async(p,o)=>{const r=await fetch(root+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(o)});return [r.status,await r.json()];};
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(root+'/')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Servidor não iniciou.');}
test('Fluxo HTTP real: sala, códigos, projeção segura, movimentação e rolagem',async()=>{
 try{
  await wait();const raw=await fetch(root+'/src/main.js');assert.equal(raw.status,200);assert.ok((await raw.text()).includes('makeDemo'));
  const c=makeDemo();c.notes='SENHA_SECRETA_123';c.scenes[0].publicSrc='data:image/png;base64,QUJD';
  const [status,room]=await request('/api/rooms',{campaign:c});assert.equal(status,201);assert.ok(room.roomId);
  let [code,invalid]=await request('/api/join',{roomId:room.roomId,role:'master',code:'incorrect'});assert.equal(code,403);
  const [a,master]=await request('/api/join',{roomId:room.roomId,role:'master',code:room.masterCode});assert.equal(a,200);assert.equal(master.campaign.notes,'SENHA_SECRETA_123');
  const [v,projector]=await request('/api/join',{roomId:room.roomId,role:'projector'});assert.equal(v,200);assert.equal(projector.campaign.notes,'');assert.equal(projector.campaign.sheets.length,0);assert.equal(projector.campaign.scenes.length,1);assert.equal(projector.campaign.scenes[0].src,c.scenes[0].publicSrc);assert.ok(!JSON.stringify(projector.campaign).includes('SENHA_SECRETA_123'));
  const [q,player]=await request('/api/join',{roomId:room.roomId,role:'player',code:room.playerCodes.p1});assert.equal(q,200);assert.equal(player.campaign.sheets.length,1);assert.equal(player.campaign.sheets[0].playerId,'p1');
  assert.equal((await request('/api/patch',{session:projector.session,patch:{type:'move',sceneId:'dungeon',tokenId:'t1',x:250,y:390}}))[0],403);
  assert.equal((await request('/api/patch',{session:player.session,patch:{type:'move',sceneId:'dungeon',tokenId:'t2',x:250,y:390}}))[0],403);
  assert.equal((await request('/api/patch',{session:player.session,patch:{type:'move',sceneId:'dungeon',tokenId:'t1',x:250,y:390}}))[0],200);
  const [qr,playerAgain]=await request('/api/join',{roomId:room.roomId,role:'player',code:room.playerCodes.p1});assert.equal(qr,200);assert.equal(playerAgain.campaign.scenes[0].tokens.find(t=>t.id==='t1').x,250);
  assert.equal((await request('/api/patch',{session:player.session,patch:{type:'dice',formula:'2D6+3',total:9999,details:['hacked']}}))[0],200);
  const [,projectorAgain]=await request('/api/join',{roomId:room.roomId,role:'projector'});const r=projectorAgain.campaign.rollHistory[0];assert.ok(r.total>=5&&r.total<=15);assert.notEqual(r.total,9999);
  const controller=new AbortController();const es=await fetch(root+'/api/events?session='+projector.session,{signal:controller.signal});assert.equal(es.headers.get('content-type'),'text/event-stream');const reader=es.body.getReader();const chunk=await reader.read();assert.ok(new TextDecoder().decode(chunk.value).includes('snapshot'));
  const changed=structuredClone(c);changed.name='Cripta em andamento';
  assert.equal((await request('/api/patch',{session:master.session,campaign:changed}))[0],200);
  const next=await reader.read();assert.ok(new TextDecoder().decode(next.value).includes('Cripta em andamento'));controller.abort();
 }finally{server.kill();rmSync(dir,{recursive:true,force:true});}
},{timeout:20000});
