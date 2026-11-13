// Leitura dos campos AcroForm do modelo de ficha TENEBRIA REVISADO 3.0.
// Não usa OCR nem envia conteúdo do PDF para servidores.
import {RACE_NAMES,CLASS_NAMES} from './compendium.js';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const canon=(value,options)=>options.find(o=>norm(o)===norm(value))||'';
function val(fields,key){
  const item=fields?.[key],items=Array.isArray(item)?item:[item];
  for(const entry of items){const value=typeof entry==='object'&&entry!==null?entry.value:entry;if(typeof value==='string'&&value.trim())return value.replace(/\r/g,'').trim();}
  return '';
}
const number=(fields,key)=>{const x=val(fields,key);return /^\d{1,4}$/.test(x)?Number(x):null;};
const values=(fields,keys)=>keys.map(k=>val(fields,k)).filter(Boolean);
const abilityFields=[
  ['text_60xxxm','text_158jctf','text_159mmpe','text_160qfy'],
  ['text_88iwzl','text_161ghxe','text_161mtmg','text_161frnv'],
  ['text_89nfni','text_164yfpe','text_164pszs','text_164sjov'],
  ['text_89fadq','text_164pmhv','text_164qmwr','text_164uyh']
];
const skillBoxes={
 'checkbox_42dg':'Atletismo','checkbox_43mbfa':'Intimidar','checkbox_44sxoo':'Adestrar','checkbox_44xzil':'Ofícios',
 'checkbox_46utuu':'Atuação','checkbox_46qxzd':'Ladinagem','checkbox_46bjhl':'Mecanismos','checkbox_46ibcv':'Sobrevivência',
 'checkbox_50phui':'Arkanismo','checkbox_50fzls':'Diplomacia','checkbox_50wwjq':'Lábia','checkbox_50vnxf':'Percepção',
 'checkbox_54oxib':'Religião','checkbox_54qpqz':'Avaliar','checkbox_54tiri':'Medicina','checkbox_54ntgd':'Natureza',
 'checkbox_58zixh':'Ocultismo','checkbox_58uagm':'Planos'
};
export function extractTenebriaForm(fields){
  const signature=['text_2opme','text_4zsso','text_9imwr','text_21pnbi','text_22bowd','text_23kkos','text_24fppm'];
  if(signature.filter(k=>val(fields,k)).length<3)return null;
  const data={
    name:val(fields,'text_9imwr'),race:canon(val(fields,'text_2opme'),RACE_NAMES),
    cls:canon(val(fields,'text_4zsso'),CLASS_NAMES),level:number(fields,'text_38qyjj')??1,
    attributes:{physical:number(fields,'text_21pnbi'),skill:number(fields,'text_22bowd'),vigor:number(fields,'text_23kkos'),mental:number(fields,'text_24fppm')},
    hp:number(fields,'text_27lzal'),maxHp:number(fields,'text_27lzal'),armor:null,
    skills:Object.entries(skillBoxes).filter(([key])=>/^(yes|on|true|1)/i.test(val(fields,key))).map(([,skill])=>skill).join('\n'),
    qualities:values(fields,['text_65okmq','text_71fpiw','text_72jl']).join('\n'),
    flaws:values(fields,['text_61nnsi','text_62desq']).join('\n'),
    equipment:values(fields,['text_321wbrj','text_324qbuc','text_327zgbp','text_327rvel','text_333ldzx','text_333m','text_333gmzs','text_333lgad']).join('\n'),
    history:'',spells:''
  };
  const powers=abilityFields.map(([id,cost,level,page])=>{
    const title=val(fields,id);if(!title)return '';
    return title+(val(fields,level)?' · nível '+val(fields,level):'')+(val(fields,cost)?' · custo '+val(fields,cost):'')+(val(fields,page)?' · pág. '+val(fields,page):'');
  }).filter(Boolean);
  data.abilities=powers.join('\n');
  const weapons=[['text_98lgkd','text_101htaw','text_104yvws'],['text_105dykw','text_105gvrx','text_105oyrs']].map(([name,damage,traits])=>{
    const n=val(fields,name);return n?n+(val(fields,damage)?' · dano '+val(fields,damage):'')+(val(fields,traits)?' · '+val(fields,traits):''):'';
  }).filter(Boolean);
  if(val(fields,'text_126efqf'))weapons.push('Armadura: '+val(fields,'text_126efqf')+' (conferir bônus defensivo no PDF)');
  data.weapons=weapons.join('\n');
  data.notes=[
    val(fields,'textarea_40ewip')?'Traços raciais registrados no PDF:\n'+val(fields,'textarea_40ewip'):'',
    val(fields,'textarea_41jfku')?'Marca da escuridão:\n'+val(fields,'textarea_41jfku'):'',
    val(fields,'textarea_77udfg')
  ].filter(Boolean).join('\n\n');
  const warnings=['Equipamento defensivo e recursos especiais exigem conferência com o PDF.'];
  if(!data.name)warnings.push('Nome não encontrado.');
  if(!data.race)warnings.push('Raça não reconhecida.');
  if(!data.cls)warnings.push('Classe não reconhecida.');
  for(const [key,label] of Object.entries({physical:'Físico',skill:'Habilidade',vigor:'Vigor',mental:'Mental'}))if(data.attributes[key]===null)warnings.push(label+' não identificado.');
  const detected=['name','race','cls',...Object.keys(data.attributes)].filter(k=>k in data.attributes?data.attributes[k]!==null:!!data[k]);
  return {data,detected,warnings,template:'tenebria-revisado-3.0-acroform'};
}
