import {makeDemo,makeBlank} from './demo.js';
import {allCampaigns,getCampaign,saveCampaign,removeCampaign,saveBlob,getBlob,blobToDataUrl,exportCampaign,importCampaign} from './storage.js';
import {roll,uid} from './rules.js';
import {initBoard,invalidate,fitScene,makePublicMaps,scene,toWorld,zoomAt} from './board.js';
import {renderUI,initUI} from './ui.js';
import {createRoom,joinRoom,submitMaster,submitPlayer,subscribe} from './network.js';
const params=new URLSearchParams(location.search);
const toastEl=document.getElementById('toast');let toastTimeout=null;
export const app={
  role:'master',playerId:null,campaign:null,campaigns:[],camera:{x:0,y:0,zoom:1},tool:'select',showFog:true,
  selectedTokenId:null,selectedSheetId:null,selectedTab:'maps',panelOpen:window.innerWidth>750,online:null,
  roomInfo:null,rollInput:'1D20',rollPrivate:false,playerCode:'',roomInput:params.get('room')||'',volume:.75,loop:false,
  toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toastEl.classList.remove('show'),2800);},
  render(){renderUI(this);invalidate();},
  async changed(message='',mapChanged=false){if(this.role!=='master')return;
    clearTimeout(this.saveTimeout);this.saveTimeout=setTimeout(async()=>{try{await saveCampaign(this.campaign);this.campaigns=await allCampaigns();}catch(e){this.toast('Falha ao salvar: '+e.message);}},300);
    if(this.online?.session){this.syncPending=true;this.syncOnline();}
    if(message)this.toast(message);invalidate();
  },
  async syncOnline(){if(this.syncRunning)return;this.syncRunning=true;
    while(this.syncPending && this.online?.session && this.role==='master'){
      this.syncPending=false;
      try{await makePublicMaps(this.campaign);const c=structuredClone(this.campaign);c.connection=null;await submitMaster(this.online.session,c);document.getElementById('net-status').textContent='● Online';}
      catch(e){this.toast('Sincronização: '+e.message);document.getElementById('net-status').textContent='● Erro de rede';}
    }
    this.syncRunning=false;
  },
  async playerPatch(patch){if(this.role==='player'&&this.online?.session){try{return await submitPlayer(this.online.session,patch);}catch(e){this.toast('Permissão/rede: '+e.message);}}
    else this.toast('Conecte-se à sessão para movimentar.');
  },
  async makeOnline(){if(this.role!=='master')return;
    try{await makePublicMaps(this.campaign);const c=structuredClone(this.campaign);c.connection=null;const info=await createRoom(c);this.roomInfo=info;
      this.campaign.connection={roomId:info.roomId,masterCode:info.masterCode,playerCodes:info.playerCodes};this.roomInput=info.roomId;
      await this.connect('master',info.roomId,info.masterCode);this.changed('Sala online criada');this.selectedTab='session';this.render();}
    catch(e){this.toast('Servidor indisponível: '+e.message);}
  },
  async connect(role,room,code=''){
    try{this.online?.close?.();const data=await joinRoom(room.trim().toUpperCase(),role,code.trim());
      const localConnection=this.campaign?.connection||null;
      this.role=data.role;this.playerId=data.playerId;
      this.campaign=data.campaign;
      if(role==='master'&&localConnection)this.campaign.connection=localConnection;
      this.online={session:data.session,roomId:room.toUpperCase()};this.roomInput=room.toUpperCase();
      this.online.close=subscribe(data.session,c=>{
        const previous=this.campaign?.connection;
        this.campaign=c;if(role==='master'&&previous)this.campaign.connection=previous;
        this.render();if(role==='master')saveCampaign(this.campaign).catch(console.warn);
      },status=>{document.getElementById('net-status').textContent=`● ${status}`;document.getElementById('net-status').classList.toggle('online',status==='Conectado');});
      document.body.classList.toggle('projector',role==='projector');
      this.selectedTab=role==='projector'?'maps':role==='player'?'sheets':'session';this.render();fitScene();this.toast(`Sala ${this.roomInput} conectada`);
      return true;
    }catch(e){this.toast(`Falha na entrada: ${e.message}`);return false;}
  },
  async loadCampaign(id){const c=await getCampaign(id);if(!c){this.toast('Campanha não encontrada.');return;}
    this.online?.close?.();this.online=null;this.role='master';this.playerId=null;document.body.classList.remove('projector');this.campaign=c;this.selectedSheetId=c.sheets[0]?.id||null;this.selectedTokenId=null;
    localStorage.setItem('tenebria:lastCampaign',id);this.render();fitScene();
  },
  async newCampaign(name){const c=makeBlank(name);await saveCampaign(c);this.campaigns=await allCampaigns();await this.loadCampaign(c.id);},
  async restoreDemo(){const c=makeDemo();await saveCampaign(c);this.campaigns=await allCampaigns();await this.loadCampaign(c.id);this.toast('Demonstração carregada');},
  async deleteCampaign(){if(this.role!=='master')return;if(!confirm(`Excluir a campanha “${this.campaign.name}”?`))return;await removeCampaign(this.campaign.id);this.campaigns=await allCampaigns();if(this.campaigns.length)await this.loadCampaign(this.campaigns[0].id);else await this.restoreDemo();},
  async rollDice(formula,privateRoll=false){let r;try{r=roll(formula);}catch(e){this.toast(e.message);return;}
    if(this.role==='player'){const reply=await this.playerPatch({type:'dice',formula:r.formula});if(reply?.ok)this.toast(`🎲 Rolagem enviada: ${r.formula}`);return;}
    const by=this.role==='master'?'Mestre':this.campaign.slotNames?.[this.playerId]||'Jogador';const entry={...r,id:uid(),at:Date.now(),by,private:privateRoll&&this.role==='master'};
    this.campaign.rollHistory=[entry,...(this.campaign.rollHistory||[])].slice(0,100);
    if(this.role==='master')this.changed(`🎲 ${r.formula} = ${r.total}`);
    this.render();this.toast(`🎲 ${r.formula} → ${r.total}`);
  },
  async export(){try{const blob=await exportCampaign(this.campaign);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tenebria-${this.campaign.name.toLowerCase().replace(/[^a-z0-9à-ú-]+/gi,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}catch(e){this.toast(e.message);}},
  async import(file){try{const c=await importCampaign(await file.text());this.campaigns=await allCampaigns();await this.loadCampaign(c.id);this.toast('Campanha importada');}catch(e){this.toast(e.message);}},
  async importMap(file){if(this.role!=='master')return;if(file.size>15_000_000){this.toast('Imagem acima de 15 MB. Reduza o mapa.');return;}
    const bmp=await createImageBitmap(file);const cv=document.createElement('canvas'),factor=Math.min(1,1800/bmp.width,1300/bmp.height);cv.width=Math.max(1,Math.round(bmp.width*factor));cv.height=Math.max(1,Math.round(bmp.height*factor));cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);bmp.close();
    const s=scene();s.src=cv.toDataURL('image/webp',.81);s.width=cv.width;s.height=cv.height;s.fog=[];this.changed('Mapa importado');this.render();fitScene();
  },
  async importTokenImage(file){const s=scene(),t=s.tokens.find(t=>t.id===this.selectedTokenId);if(!t||this.role!=='master')return;
    const bitmap=await createImageBitmap(file),cv=document.createElement('canvas');cv.width=256;cv.height=256;cv.getContext('2d').drawImage(bitmap,0,0,256,256);bitmap.close();t.img=cv.toDataURL('image/webp',.82);this.changed('Imagem do token atualizada');this.render();
  },
  async importSheetPdf(file){if(this.role!=='master')return;const sheet=this.campaign.sheets.find(s=>s.id===this.selectedSheetId);if(!sheet)return;if(file.type!=='application/pdf'||file.size>15_000_000){this.toast('Selecione um PDF com até 15 MB.');return;}const key=uid();await saveBlob(key,file);sheet.pdfKey=key;sheet.pdfName=file.name;this.changed('PDF anexado à ficha');this.render();},
  async viewSheetPdf(){const sheet=this.campaign.sheets.find(s=>s.id===this.selectedSheetId);if(!sheet?.pdfKey)return;const blob=await getBlob(sheet.pdfKey);if(!blob){this.toast('PDF disponível apenas no dispositivo que anexou o arquivo.');return;}const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);},
  async importAudio(file){if(this.role!=='master')return;if(file.size>15_000_000){this.toast('Áudio acima de 15 MB.');return;}
    const key=uid();await saveBlob(key,file);this.campaign.audioFiles.push({id:uid(),name:file.name,category:'Importado',key});this.changed('Áudio importado');this.render();
  },
  activeSound:[],async playSound(id){const a=this.campaign.audioFiles.find(s=>s.id===id);if(!a)return;let url=a.url,objectUrl=null;
    if(a.key){const blob=await getBlob(a.key);if(!blob){this.toast('Arquivo de áudio indisponível neste dispositivo.');return;}objectUrl=URL.createObjectURL(blob);url=objectUrl;}
    const audio=new Audio(url);audio.loop=this.loop;audio.volume=this.volume;audio.onended=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);this.activeSound=this.activeSound.filter(x=>x.audio!==audio);};
    this.activeSound.push({audio,objectUrl});try{await audio.play();this.toast(`▶ ${a.name}`);}catch(e){this.toast('Toque em reproduzir novamente: '+e.message);}
  },
  stopSound(){for(const a of this.activeSound){a.audio.pause();a.audio.currentTime=0;if(a.objectUrl)URL.revokeObjectURL(a.objectUrl);}this.activeSound=[];this.toast('Áudio interrompido');}
};
async function init(){try{app.campaigns=await allCampaigns();const last=localStorage.getItem('tenebria:lastCampaign');let c=last?await getCampaign(last):null;if(!c)c=app.campaigns[0]||null;
    if(!c){c=makeDemo();await saveCampaign(c);app.campaigns=[c];}
    app.campaign=c;app.selectedSheetId=c.sheets?.[0]?.id||null;
    initBoard(app);initUI(app);app.render();fitScene();
    const room=params.get('room'),role=params.get('role');if(room&&role==='projector')await app.connect('projector',room,'');
    else if(room){app.roomInput=room;app.selectedTab='session';app.render();}
    if('serviceWorker' in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js').catch(console.warn);
  }catch(e){console.error(e);app.toast('Erro ao iniciar: '+e.message);}}
init();
