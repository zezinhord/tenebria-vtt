// PDF.js Mozilla (Apache 2.0), versão fixa. O PDF permanece no dispositivo do Mestre.
// `npm install` copia o módulo e seu worker para vendor/; Pages publica ambos.
export async function extractPdfText(file,{maxPages=8}={}){
  if(!file||file.size>12_000_000)throw Error('Selecione um PDF de até 12 MB.');
  if(!file.name?.toLowerCase().endsWith('.pdf')&&file.type!=='application/pdf')throw Error('Formato de arquivo não é PDF.');
  let pdfjs;
  try{pdfjs=await import('../vendor/pdf.min.mjs');}
  catch{throw Error('Leitor PDF não instalado neste servidor. Execute npm install e atualize o aplicativo.');}
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.min.mjs',import.meta.url).href;
  const bytes=new Uint8Array(await file.arrayBuffer());let task=null,pdf=null;
  try{
    task=pdfjs.getDocument({data:bytes,useSystemFonts:true,stopAtErrors:false,isEvalSupported:false,enableScripting:false});pdf=await task.promise;
    const extracted=[];const fields=await pdf.getFieldObjects?.();
    for(const [label,values] of Object.entries(fields||{})){
      for(const f of values||[]){const value=f?.value;if(typeof value==='string'&&value.trim())extracted.push(`${label}: ${value.trim()}`);}
    }
    const count=Math.min(pdf.numPages,maxPages);
    for(let i=1;i<=count;i++){
      const page=await pdf.getPage(i);const txt=await page.getTextContent();
      const chunks=(txt.items||[]).filter(x=>typeof x.str==='string'&&x.str.trim());
      const lines=[];let row=[],lastY=null;
      const flush=()=>{if(row.length){row.sort((a,b)=>a.x-b.x);lines.push(row.map(e=>e.str).join(' '));row=[];}};
      for(const item of chunks){const y=item.transform?.[5]??0,x=item.transform?.[4]??0;
        if(lastY!==null&&Math.abs(y-lastY)>2.75)flush();
        row.push({str:item.str,x});lastY=y;
        if(item.hasEOL){flush();lastY=null;}
      }flush();extracted.push(...lines);
    }
    const text=extracted.join('\n');
    if(text.replace(/[^\p{L}\p{N}]/gu,'').length<20)throw Error('Este PDF parece ser uma imagem digitalizada ou não contém texto selecionável. OCR ainda não está disponível; anexe um PDF com texto ou importe TXT/JSON.');
    return {text,pagesRead:count,pagesTotal:pdf.numPages,truncated:pdf.numPages>count};
  }catch(e){if(/PDF|OCR|Leitor/.test(e.message))throw e;throw Error('Não foi possível interpretar o PDF: '+e.message);}
  finally{try{await pdf?.destroy();}catch{}}
}
