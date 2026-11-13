import {uid} from './rules.js';
const DB_NAME='tenebria-vtt-010';
export async function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('campaigns'))d.createObjectStore('campaigns',{keyPath:'id'});if(!d.objectStoreNames.contains('blobs'))d.createObjectStore('blobs');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(store,mode,work){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,mode),s=t.objectStore(store),r=work(s);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);t.oncomplete=()=>d.close();t.onerror=()=>{d.close();rej(t.error);};});}
export const saveCampaign=c=>transaction('campaigns','readwrite',s=>s.put(c));
export const getCampaign=id=>transaction('campaigns','readonly',s=>s.get(id));
export const allCampaigns=()=>transaction('campaigns','readonly',s=>s.getAll());
export const removeCampaign=id=>transaction('campaigns','readwrite',s=>s.delete(id));
export const saveBlob=(key,blob)=>transaction('blobs','readwrite',s=>s.put(blob,key));
export const getBlob=key=>transaction('blobs','readonly',s=>s.get(key));
export const blobToDataUrl=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});
export const urlToBlob=async url=>(await fetch(url)).blob();
export async function exportCampaign(c){const data=structuredClone(c);data.connection=null;for(const audio of data.audioFiles||[]){if(!audio.key)continue;const blob=await getBlob(audio.key);if(blob)audio.data=await blobToDataUrl(blob);}for(const sheet of data.sheets||[]){if(!sheet.pdfKey)continue;const blob=await getBlob(sheet.pdfKey);if(blob)sheet.pdfData=await blobToDataUrl(blob);}return new Blob([JSON.stringify({format:'tenebria-vtt',version:1,campaign:data})],{type:'application/json'});}
export async function importCampaign(text){const o=JSON.parse(text);if(o.format!=='tenebria-vtt'||!o.campaign?.scenes||!Array.isArray(o.campaign.sheets))throw Error('Arquivo de campanha incompatível.');const c=o.campaign;c.id=uid();c.connection=null;for(const a of c.audioFiles||[]){if(a.data){a.key=uid();await saveBlob(a.key,await urlToBlob(a.data));delete a.data;}}for(const sheet of c.sheets||[]){if(sheet.pdfData){sheet.pdfKey=uid();await saveBlob(sheet.pdfKey,await urlToBlob(sheet.pdfData));delete sheet.pdfData;}}await saveCampaign(c);return c;}
