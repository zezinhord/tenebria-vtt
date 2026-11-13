export const RACES = {
  'Humano': { physical:5, skill:5, vigor:5, mental:5, movement:8 },
  'Anão': { physical:6, skill:5, vigor:6, mental:3, movement:6 },
  'Elfo': { physical:4, skill:7, vigor:4, mental:4, movement:9 },
  'Gnomo': { physical:5, skill:4, vigor:4, mental:7, movement:6 },
  'Zetharin': { physical:5, skill:5, vigor:5, mental:5, movement:7 }
};
export const ATTRIBUTE_KEYS = ['physical','skill','vigor','mental'];
export const ATTRIBUTE_LABELS = {physical:'Físico', skill:'Habilidade', vigor:'Vigor', mental:'Mental'};
export function derived(a){ return {
  initiative:(+a.skill||0)+(+a.mental||0), fatigue:(+a.physical||0)+(+a.vigor||0),
  will:(+a.mental||0)+(+a.skill||0), resistance:(+a.mental||0)+(+a.physical||0),
  defense:(+a.vigor||0)
}; }
export function validateAttributes(sheet){
  const errors=[]; const race=RACES[sheet.race]; const a=sheet.attributes||{};
  for(const k of ATTRIBUTE_KEYS){const n=Number(a[k]); if(!Number.isInteger(n)||n<1)errors.push(`${ATTRIBUTE_LABELS[k]} deve ser inteiro e maior que zero.`);
    if(race && n>race[k])errors.push(`${ATTRIBUTE_LABELS[k]} ultrapassa o limite ${race[k]} da raça ${sheet.race}.`); }
  const total=ATTRIBUTE_KEYS.reduce((s,k)=>s+(Number(a[k])||0),0);
  if(sheet.level===1 && total!==8) errors.push(`No nível 1, a soma dos atributos-base deve ser 8 (atual: ${total}).`);
  return errors;
}
export function roll(expression, rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
  const compact=String(expression).replace(/\s/g,'').toUpperCase();
  if(!/^[+\-]?\d*(?:D(?:4|6|8|10|12|20))?(?:[+\-]\d*(?:D(?:4|6|8|10|12|20))?)*$/.test(compact) || !/D(?:4|6|8|10|12|20)/.test(compact)) throw Error('Fórmula inválida. Ex.: 2D6+3');
  const parts=compact.match(/[+-]?[^+-]+/g)||[];
  let total=0, details=[], diceCount=0;
  for(const p of parts){let sign=p.startsWith('-')?-1:1, s=p.replace(/^[+-]/,'');
    if(s.includes('D')){const [countText,facesText]=s.split('D'),n=countText===''?1:Number(countText),faces=Number(facesText);
      if(!Number.isInteger(n)||n<1||n>50 || (diceCount+=n)>100)throw Error('Máximo de 50 dados por termo, 100 por rolagem.');
      const values=[];for(let i=0;i<n;i++){const num=1+Math.floor(rng()*faces);values.push(num);total+=sign*num;}
      details.push(`${sign===-1?'-':''}${n}D${faces} [${values.join(', ')}]`);
    }else {const amount=Number(s);if(!Number.isFinite(amount)||amount>100000)throw Error('Modificador inválido.');total+=sign*amount; details.push(`${sign<0?'-':'+'}${amount}`);} }
  return {formula:compact,total,details};
}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function uid(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
