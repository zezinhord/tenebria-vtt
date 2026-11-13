import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSheetText,parseSheetJson,buildImportedSheet} from '../src/sheet-import.js';
import {RACES,validateCreation} from '../src/rules.js';

const valid=`Nome: Kenshin Kyoraku\nRaça: Humano\nClasse: Espadachim Oriental\nNível: 1\nFísico: 3\nHabilidade: 2\nVigor: 2\nMental: 1\nPV: 11/15\nArmadura: 1`;
test('Lê ficha de personagem preenchida em português',()=>{
  const parsed=parseSheetText(valid,{filename:'ficha-tenebria.txt'});
  assert.equal(parsed.data.name,'Kenshin Kyoraku');assert.equal(parsed.data.race,'Humano');
  assert.equal(parsed.data.cls,'Espadachim Oriental');assert.deepEqual(parsed.data.attributes,{physical:3,skill:2,vigor:2,mental:1});
  assert.equal(parsed.data.hp,11);assert.equal(parsed.data.maxHp,15);
  const {sheet,errors}=buildImportedSheet(parsed);assert.deepEqual(errors,[]);assert.equal(sheet.armor,1);
  assert.deepEqual(validateCreation(sheet),[]);assert.equal(sheet.sourceImport.name,'ficha-tenebria.txt');
});
test('Aceita variantes de rótulos e classes oficiais sem diferença de acentos',()=>{
  const parsed=parseSheetText('Nome: Brom\nRaca: Anao\nClasse: Guerreiro\nNivel: 1\nFisico: 3\nHabilidade: 1\nVigor: 3\nMental: 1');
  assert.equal(parsed.data.race,'Anão');assert.equal(parsed.data.cls,'Guerreiro');
  assert.deepEqual(buildImportedSheet(parsed).errors,[]);
});
test('Suporta JSON estruturado e preenche somente valores explícitos',()=>{
  const data=parseSheetJson(JSON.stringify({nome:'Maelis',raça:'Gnomo',classe:'Mago',nivel:1,atributos:{fisico:1,habilidade:1,vigor:1,mental:5},hp:9}),{filename:'maelis.json'});
  assert.equal(data.data.race,'Gnomo');assert.equal(data.data.armor,null);
  const {sheet,errors}=buildImportedSheet(data);assert.deepEqual(errors,[]);assert.equal(sheet.hp,9);assert.equal(sheet.maxHp,9);
});
test('Não inventa atributos faltantes e exige revisão antes de criar',()=>{
  const draft=parseSheetText('Nome: Sem Dados\nRaça: Humano\nClasse: Guerreiro');
  assert.equal(draft.data.attributes.mental,null);
  assert.ok(draft.warnings.some(w=>w.includes('Atributo')));
  assert.ok(buildImportedSheet(draft).errors.some(w=>w.includes('deve ser inteiro')));
  const corrected=buildImportedSheet(draft,{physical:'2',skill:'2',vigor:'2',mental:'2',name:'Corrigido'});
  assert.deepEqual(corrected.errors,[]);assert.equal(corrected.sheet.name,'Corrigido');
});
test('Bloqueia raça/classe não reconhecidas e distribuição inválida',()=>{
  const draft=parseSheetText(valid.replace('Raça: Humano','Raça: Desconhecida').replace('Classe: Espadachim Oriental','Classe: Inexistente'));
  assert.ok(buildImportedSheet(draft).errors.some(w=>w.includes('raça oficial')));
  assert.ok(buildImportedSheet(draft).errors.some(w=>w.includes('classe oficial')));
  const broken=parseSheetText(valid.replace('Físico: 3','Físico: 7'));
  assert.ok(buildImportedSheet(broken).errors.some(w=>w.includes('soma dos atributos')));
  assert.ok(buildImportedSheet(broken).errors.some(w=>w.includes('limite')));
});
test('Bloqueia PV impossíveis e não elimina fichas da campanha ao importar',()=>{
  const draft=parseSheetText(valid);const broken=buildImportedSheet(draft,{hp:'90',maxHp:'15'});
  assert.ok(broken.errors.some(w=>w.includes('PV atuais e máximos')));
  const fixed=buildImportedSheet(draft,{hp:'9',maxHp:'15'});assert.deepEqual(fixed.errors,[]);
  assert.ok(RACES[fixed.sheet.race]);
});
test('Rejeita fichas sem texto',()=>{
  assert.throws(()=>parseSheetText('   \n '),/sem texto legível/);
  assert.throws(()=>parseSheetJson('[1,2,3]'),/personagem/);
});
