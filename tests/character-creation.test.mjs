import test from 'node:test';
import assert from 'node:assert/strict';
import {RACES,RACE_NAMES,CLASS_NAMES,CHARACTER_CREATION,validateCreation,validateAttributes,qualityLimit,listedQualities,spentAbilityPoints,sheetSummary,testFormula} from '../src/rules.js';
import {makeDemo,makeBlank} from '../src/demo.js';
import {publicCampaign,applyPlayerPatch} from '../server/room.mjs';

const sample=(race='Humano')=>({race,cls:'Mago',level:1,attributes:{physical:2,skill:2,vigor:2,mental:2},qualities:'',classPowers:[],armor:3});
test('Livro 3.0: 27 raças verificadas, limites e deslocamentos',()=>{
 assert.equal(RACE_NAMES.length,27);
 assert.deepEqual([RACES.Humano.physical,RACES.Humano.skill,RACES.Humano.vigor,RACES.Humano.mental,RACES.Humano.movement],[5,5,5,5,8]);
 assert.deepEqual([RACES['Anão'].physical,RACES['Anão'].skill,RACES['Anão'].vigor,RACES['Anão'].mental,RACES['Anão'].movement],[6,5,6,3,6]);
 assert.deepEqual([RACES.Elfo.physical,RACES.Elfo.skill,RACES.Elfo.vigor,RACES.Elfo.mental,RACES.Elfo.movement],[4,7,4,4,9]);
 assert.deepEqual([RACES['Satirino'].movement,RACES['Satirino'].mental],[12,4]);
 assert.equal(RACES.Zetharin.movement,7);
 for(const [race,spec] of Object.entries(RACES)){assert.ok(Number.isInteger(spec.sourcePage));assert.ok(spec.movement>0);for(const k of ['physical','skill','vigor','mental'])assert.ok(spec[k]>0,`${race}: ${k}`);}
});
test('Livro 3.0: 27 classes disponíveis, sem improvisar PV de classe',()=>{
 assert.equal(CLASS_NAMES.length,27);
 for(const c of ['Espadachim Oriental','Mago','Monge','Armadilheiro','Sem Caminho','Torre Negra'])assert.ok(CLASS_NAMES.includes(c));
 const summary=sheetSummary(sample());assert.equal(Object.hasOwn(summary,'classHP'),false);
});
test('Subatributos, ataque e defesa base + equipamento',()=>{
 const summary=sheetSummary({...sample('Elfo'),attributes:{physical:1,skill:3,vigor:2,mental:2},armor:4});
 assert.equal(summary.initiative,5);assert.equal(summary.fatigue,3);assert.equal(summary.resistance,3);assert.equal(summary.will,5);
 assert.equal(summary.defenseTotal,6);assert.equal(summary.unarmedDamage,2);assert.equal(summary.movement,9);
 assert.equal(testFormula(sample(),'physical'),'1D20+2');assert.equal(testFormula(sample(),'initiative'),'1D20+4');
 assert.throws(()=>testFormula(sample(),'secret'),/desconhecido/);
});
test('Criação: 8 pontos base, 2 qualidades, Humano recebe mais uma',()=>{
 const elf=sample('Elfo');elf.qualities='Observador\nAtento';assert.equal(qualityLimit(elf),2);assert.equal(validateCreation(elf).length,0);
 elf.qualities+='\nTerceira';assert.match(validateCreation(elf).join(' '),/Qualidades: 3\/2/);
 const human=sample('Humano');human.qualities=elf.qualities;assert.equal(qualityLimit(human),3);assert.equal(listedQualities(human).length,3);assert.equal(validateCreation(human).length,0);
 assert.equal(CHARACTER_CREATION.attributePoints,8);
});
test('Habilidades compradas: custo × nível e teto inicial de 5 pontos',()=>{
 const sh=sample();sh.classPowers=[{id:'a',name:'Habilidade 1',levels:2,costPerLevel:2},{id:'b',name:'Habilidade 2',levels:1,costPerLevel:1}];
 assert.equal(spentAbilityPoints(sh),5);assert.deepEqual(validateCreation(sh),[]);
 sh.classPowers[1].levels=2;assert.match(validateCreation(sh).join(' '),/6\/5/);
 sh.classPowers[1].levels=0;assert.match(validateCreation(sh).join(' '),/inteiros positivos/);
 sh.level=2;assert.deepEqual(validateCreation(sh),[]); // progressão posterior não usa teto de criação
});
test('Campanhas antigas sem classPowers continuam válidas',()=>{
 const c=makeDemo();for(const sh of c.sheets){assert.deepEqual(validateCreation(sh),[]);assert.equal(spentAbilityPoints(sh),0);}
 const blank=makeBlank();assert.equal(blank.sheets.length,0);
 assert.deepEqual(validateAttributes(sample()),[]);
});
test('Jogador vê a própria ficha, mas não altera progressão do Mestre',()=>{
 const c=makeDemo();c.sheets[0].classPowers=[{id:'ability',name:'Treino',levels:1,costPerLevel:1}];
 const player=publicCampaign(c,'player','p1');const other=publicCampaign(c,'player','p2');
 assert.equal(player.sheets.length,1);assert.equal(other.sheets.length,1);
 assert.equal(player.sheets[0].classPowers[0].name,'Treino');assert.equal(other.sheets[0].classPowers?.length||0,0);
 assert.equal(applyPlayerPatch(c,'p1',{type:'sheet',sheetId:'s1',field:'classPowers',value:'[]'}),null);
});
