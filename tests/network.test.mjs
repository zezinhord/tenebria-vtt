import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setServerURL,serverURL,inviteURL,readInvitation,apiOrigin} from '../src/network.js';

test('Convites usam o fragmento da URL para não registrar os códigos no servidor',()=>{
  const oldLocation=globalThis.location,oldStorage=globalThis.localStorage;
  const saved=new Map();
  globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  globalThis.location=new URL('https://zezinhord.github.io/tenebria-vtt/');
  try{
    assert.throws(()=>apiOrigin(),/Configure/);
    assert.equal(setServerURL('https://tenebria.example.com/'),'https://tenebria.example.com');
    assert.equal(serverURL(),'https://tenebria.example.com');
    assert.equal(apiOrigin(),'https://tenebria.example.com');
    assert.throws(()=>setServerURL('http://192.168.1.5:4173'),/HTTPS/);
    assert.throws(()=>setServerURL('https://example.com/hack'),/origem HTTP/);
    const link=inviteURL('F00DBA12','projector','PROJETOR_SEGURO');
    assert.equal(new URL(link).searchParams.get('code'),null);
    assert.equal(new URL(link).hash.includes('code=PROJETOR_SEGURO'),true);
    globalThis.location=new URL(link);
    assert.deepEqual(readInvitation(),{room:'F00DBA12',role:'projector',code:'PROJETOR_SEGURO',api:'https://tenebria.example.com'});
  }finally{globalThis.location=oldLocation;globalThis.localStorage=oldStorage;}
});

test('Servidor da rede local é padrão quando a aplicação é aberta por HTTP',()=>{
  const oldLocation=globalThis.location,oldStorage=globalThis.localStorage;
  globalThis.location=new URL('http://192.168.1.7:4173/');
  globalThis.localStorage={getItem:()=>null,removeItem:()=>{},setItem:()=>{}};
  try{assert.equal(apiOrigin(),'http://192.168.1.7:4173');}finally{globalThis.location=oldLocation;globalThis.localStorage=oldStorage;}
});
