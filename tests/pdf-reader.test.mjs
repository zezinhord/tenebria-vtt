import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {extractPdfText} from '../src/pdf-reader.js';

function makePdf(){
  const body='BT /F1 14 Tf 55 720 Td (Nome: Kael da Ordem do Ultimo Selo) Tj ET';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let text='%PDF-1.4\n';const offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const start=Buffer.byteLength(text);text+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for(const ofs of offsets.slice(1))text+=`${String(ofs).padStart(10,'0')} 00000 n \n`;
  text+=`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(text);
}
test('Leitor de PDF.js extrai texto de PDF nativo (após npm install)',{skip:!existsSync(new URL('../vendor/pdf.min.mjs',import.meta.url))},async()=>{
  const pdf=makePdf();const fakeFile={name:'ficha.pdf',size:pdf.length,type:'application/pdf',arrayBuffer:async()=>pdf.buffer.slice(pdf.byteOffset,pdf.byteOffset+pdf.byteLength)};
  const result=await extractPdfText(fakeFile);
  assert.equal(result.pagesRead,1);
  assert.match(result.text,/Nome: Kael/);
});
test('Leitor rejeita formatos incorretos sem processar',async()=>{
  await assert.rejects(extractPdfText({name:'img.png',size:100,type:'image/png'}),/não é PDF/);
  await assert.rejects(extractPdfText({name:'enorme.pdf',size:20_000_000,type:'application/pdf'}),/até 12 MB/);
});
