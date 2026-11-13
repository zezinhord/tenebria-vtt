import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDemo} from '../src/demo.js';

function fakeContext() {
  const calls={drawImage:0};
  const ctx=new Proxy({calls},{get(target,key){
    if(key in target)return target[key];
    return (...args)=>{if(key==='drawImage')calls.drawImage++;};
  },set(target,key,value){target[key]=value;return true;}});
  return ctx;
}

test('O tabuleiro não reinicia o Canvas nem recria o mapa a cada movimento de token',async()=>{
  const events=new Map(),ctx=fakeContext();
  let width=0,height=0,resets=0,rect={left:0,top:0,width:390,height:660},contextOptions;
  const board={id:'board',parentElement:{id:'stage'},get width(){return width;},set width(v){width=v;resets++;},
    get height(){return height;},set height(v){height=v;resets++;},
    getBoundingClientRect:()=>rect,
    getContext:(type,options)=>{contextOptions=options;return ctx;},
    addEventListener:(event,handler)=>events.set(event,handler),setPointerCapture:()=>{}};
  let offscreenCreated=0;
  globalThis.document={getElementById:()=>board,createElement:(tag)=>{
    assert.equal(tag,'canvas');offscreenCreated++;
    return {width:0,height:0,getContext:()=>fakeContext()};
  }};
  globalThis.window={devicePixelRatio:1.75,addEventListener:()=>{}};
  globalThis.Image=class {set src(value){this.url=value;}};
  let resizeHandler;
  globalThis.ResizeObserver=class {constructor(cb){resizeHandler=cb;}observe(target){assert.equal(target,board.parentElement);}};
  let nextFrame;
  globalThis.requestAnimationFrame=(fn)=>{nextFrame=fn;};
  const {initBoard,fitScene}=await import('../src/board.js');
  const campaign=makeDemo();
  const app={campaign,role:'master',playerId:null,camera:{x:0,y:0,zoom:1},selectedTokenId:null,
    tool:'select',showFog:true,changed:()=>{},render:()=>{}};
  initBoard(app);
  assert.deepEqual(contextOptions,{alpha:false},'Quadros devem ser sincronizados com o navegador');
  assert.equal(resets,2,'O bitmap é configurado apenas na montagem');
  fitScene();nextFrame();
  assert.equal(offscreenCreated,1,'O fundo do mapa é preparado uma vez');
  for(let i=0;i<15;i++)resizeHandler();
  assert.equal(resets,2,'ResizeObserver sem alteração de tamanho não pode limpar o Canvas');
  const token=campaign.scenes[0].tokens[0];
  const start={x:app.camera.x+token.x*app.camera.zoom,y:app.camera.y+token.y*app.camera.zoom};
  const ev=(x,y)=>({pointerId:1,clientX:x,clientY:y,preventDefault(){}});
  events.get('pointerdown')(ev(start.x,start.y));
  for(let i=1;i<=20;i++){
    events.get('pointermove')(ev(start.x+i*2,start.y+i));
    nextFrame();
  }
  events.get('pointerup')(ev(start.x+40,start.y+20));nextFrame();
  assert.equal(resets,2,'O arrasto não pode reinicializar o Canvas');
  assert.equal(offscreenCreated,1,'O arrasto não pode recriar o bitmap do mapa');
  assert.notEqual(token.x,150,'O token realmente precisa ser movimentado');
  assert.equal((token.x - 30) % 60,0,'O centro do token deve cair no centro da coluna');
  assert.equal((token.y - 30) % 60,0,'O centro do token deve cair no centro da linha');
  rect={...rect,width:360};resizeHandler();
  assert.equal(resets,3,'Alteração real da largura ajusta apenas uma dimensão');
});
