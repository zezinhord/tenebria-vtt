import {test} from 'node:test';
import assert from 'node:assert/strict';
import {snapToCellCenter,snapTokenPosition} from '../src/grid.js';
import {makeDemo} from '../src/demo.js';
import {applyPlayerPatch} from '../server/room.mjs';

const scene={width:1200,height:800,grid:{enabled:true,size:60}};

test('O encaixe usa o centro de cada quadrado, não as bordas ou interseções',()=>{
  for(const [x,expected] of [[0,30],[29,30],[59,30],[60,90],[80,90],[119,90],[120,150],[185,210],[1199,1170]]){
    assert.equal(snapTokenPosition(x,145,scene,true).x,expected,`x=${x}`);
  }
  assert.deepEqual(snapTokenPosition(60,60,scene,true),{x:90,y:90});
  assert.deepEqual(snapTokenPosition(179,439,scene,true),{x:150,y:450});
  assert.deepEqual(snapTokenPosition(37,49,scene,false),{x:37,y:49});
  assert.deepEqual(snapTokenPosition(-90,2000,scene,false),{x:0,y:800});
});

test('A função controla os limites do tabuleiro e tamanhos de grade irregulares',()=>{
  assert.equal(snapToCellCenter(999,125,60),90);
  assert.equal(snapToCellCenter(13,40,60),20);
  assert.equal(snapToCellCenter(-10,120,60),30);
  assert.equal(snapToCellCenter(125,120,60),90);
});

test('Todos os tokens de demonstração começam centralizados',()=>{
  const campaign=makeDemo();
  for(const s of campaign.scenes){
    for(const t of s.tokens){
      const position=snapTokenPosition(t.x,t.y,s,true);
      assert.deepEqual({x:t.x,y:t.y},position,`${s.name} / ${t.name}`);
    }
  }
});

test('A sincronização de jogadores também arredonda coordenadas para centros',()=>{
  const c=makeDemo();
  const moved=applyPlayerPatch(c,'p1',{type:'move',sceneId:'dungeon',tokenId:'t1',x:60,y:60});
  const t=moved.scenes[0].tokens.find(x=>x.id==='t1');
  assert.deepEqual([t.x,t.y],[90,90]);
  assert.equal(c.scenes[0].tokens[0].x,150,'Não muta a campanha de origem');
  c.settings.snap=false;
  const free=applyPlayerPatch(c,'p1',{type:'move',sceneId:'dungeon',tokenId:'t1',x:61,y:73});
  assert.deepEqual([free.scenes[0].tokens[0].x,free.scenes[0].tokens[0].y],[61,73]);
});
