import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSheetPdf,buildImportedSheet} from '../src/sheet-import.js';
import {creationAttributeBudget,validateCreation} from '../src/rules.js';
function form(o){return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,[{value:v}]]));}
const fields=form({
 text_9imwr:'Haru da Lua',text_2opme:'Humano',text_4zsso:'Espadachim Oriental',text_38qyjj:'1',
 text_21pnbi:'3',text_22bowd:'2',text_23kkos:'3',text_24fppm:'1',text_27lzal:'15',
 text_65okmq:'Tutor',text_71fpiw:'Meio-Antigo +1 ponto de atributo',text_72jl:'Item herdado (Katana)',
 text_61nnsi:'Código dos Heróis',text_62desq:'Complexo de culpa',
 text_60xxxm:'Estilo lâmina dupla',text_158jctf:'3',text_159mmpe:'1',
 text_98lgkd:'Katana',text_101htaw:'1d10 +1',text_105dykw:'Katana',text_105gvrx:'1d10',
 text_321wbrj:'Traje comum',text_324qbuc:'Cantil',
 checkbox_42dg:'Yes_tftn',checkbox_46qxzd:'Yes_tftn',checkbox_50fzls:'Yes_tftn',checkbox_50phui:'Off'
});
test('Reconhece o formulário Tenebria e os atributos sem trocar colunas',()=>{
 const p=parseSheetPdf('texto da camada visual',{filename:'ficha.pdf',fields});
 assert.equal(p.template,'tenebria-revisado-3.0-acroform');
 assert.equal(p.data.name,'Haru da Lua');
 assert.equal(p.data.race,'Humano');assert.equal(p.data.cls,'Espadachim Oriental');
 assert.deepEqual(p.data.attributes,{physical:3,skill:2,vigor:3,mental:1});
 assert.equal(p.data.hp,15);assert.equal(p.data.maxHp,15);
 assert.match(p.data.skills,/Atletismo/);assert.match(p.data.skills,/Ladinagem/);
 assert.match(p.data.skills,/Diplomacia/);assert.doesNotMatch(p.data.skills,/Arkanismo/);
 assert.match(p.data.weapons,/1d10 \+1/);assert.match(p.data.equipment,/Cantil/);
});
test('Meio-Antigo com mais um ponto valida nove atributos sem liberar outros personagens',()=>{
 const p=parseSheetPdf('',{fields}),built=buildImportedSheet(p);
 assert.deepEqual(built.errors,[]);assert.deepEqual(validateCreation(built.sheet),[]);
 assert.equal(creationAttributeBudget(built.sheet),9);
 const without={...built.sheet,qualities:'Tutor\nItem herdado'};
 assert.equal(creationAttributeBudget(without),8);
 assert.ok(validateCreation(without).some(e=>e.includes('deve ser 8')));
});
test('Mantém fallback para PDF genérico e alerta sobre dados ausentes',()=>{
 const p=parseSheetPdf('Nome: Lia\nRaça: Humano\nClasse: Mago\nFísico: 2\nHabilidade: 2\nVigor: 2\nMental: 2',{fields:{outro:[{value:'irrelevante'}]}});
 assert.equal(p.template,undefined);assert.equal(p.data.name,'Lia');
 const bad=parseSheetPdf('Nome: Lia\nRaça: Humano\nClasse: Mago',{fields:{}});
 assert.equal(bad.data.attributes.physical,null);
});
test('Campos vazios não são inventados e exigem revisão',()=>{
 const p=parseSheetPdf('texto',{fields:form({text_9imwr:'Sem Classe',text_2opme:'Humano',text_21pnbi:'2'})});
 assert.equal(p.data.cls,'');assert.ok(p.warnings.some(w=>w.includes('Classe')));
 assert.ok(buildImportedSheet(p).errors.length);
});
