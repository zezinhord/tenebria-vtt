import {uid} from './rules.js';
const exampleSheet=(id,name,race,cls,a,hp,playerId,notes='')=>({id,name,race,cls,level:1,attributes:a,hp,maxHp:hp,armor:0,playerId,
  skills:'',qualities:'',flaws:'',equipment:'',weapons:'',abilities:'',spells:'',history:notes,notes:'',portrait:'',manualBonuses:''});
export function makeDemo(){
  const sheets=[
    exampleSheet('s1','Serena, a Vigia','Elfo','Patrulheiro',{physical:1,skill:4,vigor:1,mental:2},12,'p1','Cartógrafa de uma caravana desaparecida.'),
    exampleSheet('s2','Brom, o Ferreiro','Anão','Guerreiro',{physical:3,skill:1,vigor:3,mental:1},16,'p2','Guarda um juramento feito nas minas.'),
    exampleSheet('s3','Maelis, a Erudita','Gnomo','Mago',{physical:1,skill:1,vigor:1,mental:5},9,'p3','Procura mapas do antigo observatório.'),
    exampleSheet('s4','Kael, o Errante','Humano','Armadilheiro',{physical:2,skill:3,vigor:1,mental:2},11,'p4','Reconhece sinais dos cultistas nas ruínas.')
  ];
  const heroes=sheets.map((s,i)=>({id:`t${i+1}`,sheetId:s.id,name:s.name,x:150+i*60,y:450,size:54,rotation:0,visible:true,locked:false,ownerId:s.playerId,hp:s.hp,maxHp:s.maxHp,color:['#68cfd0','#e1aa72','#ae95da','#8ac78b'][i],conditions:[]}));
  const foes=[{id:'g1',name:'Sentinela Corrompida',x:690,y:330,size:60,hp:15,maxHp:15,color:'#c36a62',visible:false,locked:false,ownerId:null,conditions:[]},
    {id:'g2',name:'Rastejante',x:750,y:390,size:48,hp:8,maxHp:8,color:'#8a667e',visible:true,locked:false,ownerId:null,conditions:[]}];
  return {id:uid(),name:'Ecos de Obscure — demonstração',description:'Um povoado abandonado, uma masmorra e uma presença sob a pedra.',
    version:1,createdAt:Date.now(),notes:'SEGREDO DO MESTRE: o sino do povoado desperta a sentinela corrompida.',
    sceneId:'dungeon',scenes:[
      {id:'dungeon',name:'Cripta sob a Vigília',src:'assets/dungeon.svg',width:1200,height:800,grid:{enabled:true,size:60},fog:[{x:590,y:145,w:520,h:435}],tokens:[...heroes,...foes],markers:[]},
      {id:'village',name:'Povoado de Corval',src:'assets/village.svg',width:1200,height:800,grid:{enabled:true,size:60},fog:[],tokens:heroes.map(t=>({...t,id:`v${t.id}`,x:210+(Number(t.id[1])-1)*60,y:510})),markers:[]}
    ],sheets,rollHistory:[],audioFiles:[{id:'sound-bell',name:'Sino da cripta',category:'Narrativa',url:'assets/sino_cripta.wav'},{id:'sound-sword',name:'Golpe de espada',category:'Combate',url:'assets/espada.wav'},{id:'sound-wind',name:'Vento sombrio',category:'Ambiente',url:'assets/vento_sombrio.wav'}],combat:{round:1,index:0,entries:[...heroes,...foes].map((t,i)=>({tokenId:t.id,name:t.name,initiative:12-i*2,hp:t.hp,maxHp:t.maxHp,conditions:[],id:uid()}))},
    logs:[],slotNames:{p1:'Jogador 1',p2:'Jogador 2',p3:'Jogador 3',p4:'Jogador 4'},settings:{animations:true,snap:true},connection:null};
}
export function makeBlank(name='Nova campanha'){
  const c=makeDemo();c.name=name;c.description='';c.notes='';c.scenes=[{id:'scene1',name:'Primeira cena',src:'',width:1200,height:800,grid:{enabled:true,size:60},fog:[],tokens:[],markers:[]}];c.sceneId='scene1';c.sheets=[];c.rollHistory=[];c.audioFiles=[];c.combat={round:1,index:0,entries:[]};c.logs=[];return c;
}
