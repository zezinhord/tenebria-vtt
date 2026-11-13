// Importador conservador de fichas: não inventa valores nem aplica bônus raciais implícitos.
import {RACES,RACE_NAMES,CLASS_NAMES,ATTRIBUTE_KEYS,validateAttributes,uid} from './rules.js';

const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const canonical=(value,known)=>known.find(v=>normalize(v)===normalize(value))||'';
const clean=s=>String(s??'').replace(/[\t ]+/g,' ').trim();
const number=v=>/^\d{1,4}$/.test(String(v??'').trim())?Number(v):null;
const LABELS={
  name:['nome do personagem','nome','personagem','character name','character'],
  race:['raca','raça','race','especie','espécie'],
  cls:['classe','class','profissao','profissão'],
  level:['nivel','nível','level','lvl'],
  physical:['fisico','físico','forca','força','fis'],
  skill:['habilidade','destreza','hab'],
  vigor:['vigor','vig'],
  mental:['mental','mente','men'],
  hp:['pontos de vida atuais','pv atuais','vida atual','hp atual','pvs atuais','pv','hp'],
  maxHp:['vida maxima','vida máxima','pvs maximos','pvs máximos','pv maximo','pv máximo','hp max','pv total'],
  armor:['bonus de defesa','bônus de defesa','armadura','armor'],
};
const LEADING=new RegExp('^\\s*(?:'+Object.values(LABELS).flat().sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','i');
function fieldLine(line,aliases){
  const label=aliases.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length).join('|');
  const m=clean(line).match(new RegExp('(?:^|[|;\\s])(?:'+label+')[ \\t]*[:=–—-][ \\t]*([^|;\\n]{1,130})','i'));
  if(m)return clean(m[1]);
  const whole=clean(line).match(new RegExp('^(?:'+label+')[ \\t]+([^|;\\n]{1,100})$','i'));
  return whole?clean(whole[1]):'';
}
function matchValue(lines,aliases){for(const line of lines){const v=fieldLine(line,aliases);if(v)return v;}return '';}
function candidateNumber(lines,aliases){for(const line of lines){const v=fieldLine(line,aliases);if(!v)continue;const m=v.match(/^(-?\d{1,4})(?:\b|\s*\/)/);if(m)return number(m[1]);}return null;}
function attributesFromText(lines){
  const attrs={};for(const key of ATTRIBUTE_KEYS)attrs[key]=candidateNumber(lines,LABELS[key]);
  // E.g. PDF rendering where the four values occur in a single row under F/H/V/M.
  for(const line of lines){
    const m=line.match(/\bF(?:IS(?:ICO)?)?\s*[:=]\s*(\d{1,2})\s+[|,; ]*H(?:AB(?:ILIDADE)?)?\s*[:=]\s*(\d{1,2})\s+[|,; ]*V(?:IG(?:OR)?)?\s*[:=]\s*(\d{1,2})\s+[|,; ]*M(?:EN(?:TAL)?)?\s*[:=]\s*(\d{1,2})/i);
    if(m){['physical','skill','vigor','mental'].forEach((k,i)=>{if(attrs[k]===null)attrs[k]=Number(m[i+1]);});break;}
  }
  return attrs;
}
const SECTION_ALIASES={skills:['pericias','perícias'],qualities:['qualidades'],flaws:['defeitos'],equipment:['equipamentos','inventario','inventário'],weapons:['armas','armaduras'],abilities:['habilidades'],spells:['magias','feitiços'],history:['historico','histórico'],notes:['anotacoes','anotações','observacoes','observações']};
function extractSections(lines){const out={};let section='';for(const line of lines){const raw=clean(line),normalized=normalize(raw.replace(/[:：]$/,''));let next='';for(const [k,aliases] of Object.entries(SECTION_ALIASES))if(aliases.map(normalize).includes(normalized)){next=k;break;}
    if(next){section=next;continue;}
    if(!raw||LEADING.test(raw)){section='';continue;}
    if(section&&out[section]?.length<1400){out[section]=(out[section]?out[section]+'\n':'')+raw.slice(0,300);}
  }return out;}
export function parseSheetText(text,{filename='',format='txt'}={}){
  const input=String(text||'').replace(/\r/g,'\n').replace(/[\u00a0\u202f]/g,' ');
  if(input.length>200_000)throw Error('Ficha com texto excessivamente grande (limite 200 mil caracteres).');
  const lines=input.split('\n').flatMap(l=>l.split(/\s+[|]\s+/g)).map(clean).filter(Boolean);
  if(!lines.length)throw Error('Arquivo sem texto legível. PDFs digitalizados precisam de OCR, ainda não disponível.');
  const rawName=matchValue(lines,LABELS.name),rawRace=matchValue(lines,LABELS.race),rawClass=matchValue(lines,LABELS.cls);
  let name=rawName.replace(/\s+(?:raça|raca|classe|nivel|nível)\s*[:=].*/i,'').slice(0,100);
  const race=canonical(rawRace,RACE_NAMES)||RACE_NAMES.find(v=>lines.some(l=>new RegExp('(?:^|\\s|[|,])'+normalize(v).replace(/\s+/g,'\\s+')+'(?:$|\\s|[|,])','i').test(normalize(l))))||'';
  const cls=canonical(rawClass,CLASS_NAMES)||CLASS_NAMES.find(v=>lines.some(l=>normalize(l)===normalize(v)))||'';
  const level=candidateNumber(lines,LABELS.level),attributes=attributesFromText(lines);
  const hpRaw=matchValue(lines,LABELS.hp);const pair=hpRaw.match(/^(\d{1,4})\s*\/\s*(\d{1,4})/);
  const hp=pair?Number(pair[1]):candidateNumber(lines,LABELS.hp);
  const maxHp=pair?Number(pair[2]):candidateNumber(lines,LABELS.maxHp);
  const armor=candidateNumber(lines,LABELS.armor);
  const sections=extractSections(lines);
  const data={name,race,cls,level:level??1,attributes,hp,maxHp,armor,...sections};
  const detected=['name','race','cls',...ATTRIBUTE_KEYS].filter(k=>k in attributes?attributes[k]!==null:!!data[k]);
  const warnings=[];
  if(!name)warnings.push('Nome não encontrado.');
  if(!race)warnings.push(rawRace?`Raça não reconhecida: ${rawRace.slice(0,60)}.`:'Raça não identificada.');
  if(!cls)warnings.push(rawClass?`Classe não reconhecida: ${rawClass.slice(0,60)}.`:'Classe não identificada.');
  for(const k of ATTRIBUTE_KEYS)if(attributes[k]===null)warnings.push(`Atributo ${k} não identificado.`);
  if(data.level===1&&ATTRIBUTE_KEYS.every(k=>attributes[k]!==null)){
    const issues=validateAttributes({race,level:1,attributes});if(issues.length)warnings.push(...issues);
  }
  return {filename,format,data,detected,warnings,extractedChars:input.length};
}
export function parseSheetJson(text,{filename=''}={}){
  const raw=JSON.parse(text);const o=raw?.sheet||raw?.character||raw?.personagem||raw;
  if(!o||typeof o!=='object'||Array.isArray(o))throw Error('JSON não contém um personagem.');
  const att=o.attributes||o.atributos||{};
  const data={name:clean(o.name||o.nome||''),race:canonical(o.race||o.raca||o['raça']||'',RACE_NAMES),cls:canonical(o.cls||o.class||o.classe||'',CLASS_NAMES),
    level:number(o.level??o.nivel)??1,hp:number(o.hp??o.pv),maxHp:number(o.maxHp??o.pvMaximo??o.pvMax),armor:number(o.armor??o.armadura),attributes:{
      physical:number(att.physical??att.fisico??att['físico']??o.physical),skill:number(att.skill??att.habilidade??o.skill),vigor:number(att.vigor??o.vigor),mental:number(att.mental??o.mental)},
    ...Object.fromEntries(Object.keys(SECTION_ALIASES).map(k=>[k,typeof o[k]==='string'?o[k].slice(0,1400):'']))};
  const detected=['name','race','cls',...ATTRIBUTE_KEYS].filter(k=>k in data.attributes?data.attributes[k]!==null:!!data[k]);
  return {filename,format:'json',data,detected,warnings:[],extractedChars:text.length};
}
export function buildImportedSheet(draft,overrides={}){
  const d=draft.data||{},a=d.attributes||{},fields={...d,...overrides};
  const attributes=Object.fromEntries(ATTRIBUTE_KEYS.map(k=>[k,number(overrides[k]??a[k])]));
  const race=canonical(fields.race,RACE_NAMES),cls=canonical(fields.cls,CLASS_NAMES);
  const sheet={id:uid(),name:clean(fields.name).slice(0,100),race,cls,level:number(fields.level),attributes,hp:number(fields.hp)??0,maxHp:number(fields.maxHp)??number(fields.hp)??0,armor:number(fields.armor)??0,
    playerId:fields.playerId||'',skills:d.skills||'',qualities:d.qualities||'',flaws:d.flaws||'',equipment:d.equipment||'',weapons:d.weapons||'',abilities:d.abilities||'',spells:d.spells||'',history:d.history||'',notes:d.notes||'',classPowers:[],sourceImport:{name:draft.filename||'',format:draft.format||'txt',at:Date.now()}};
  const errors=[];
  if(!sheet.name)errors.push('Informe o nome.');
  if(!race)errors.push('Selecione uma raça oficial.');
  if(!cls)errors.push('Selecione uma classe oficial.');
  if(!Number.isInteger(sheet.level)||sheet.level<1||sheet.level>30)errors.push('Nível precisa estar entre 1 e 30.');
  if(fields.hp!==''&&fields.hp!==null&&fields.hp!==undefined&&number(fields.hp)===null)errors.push('PV atuais inválidos.');
  if(sheet.hp<0||sheet.maxHp<0||sheet.hp>sheet.maxHp)errors.push('Confira PV atuais e máximos.');
  if(sheet.armor<0)errors.push('Bônus de defesa não pode ser negativo.');
  if(!errors.length)errors.push(...validateAttributes(sheet));
  return {sheet,errors};
}
