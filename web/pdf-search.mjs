import {pageCitation,matchPages} from './model.mjs';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
let disposeActive=()=>{};
addEventListener('pagehide',()=>disposeActive());
export async function verifyFile(file,output){
 output.textContent='Checking download access…';
 try{const response=await fetch(file.url,{headers:{Range:'bytes=0-0'},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});await response.body?.cancel();if(!response.ok)throw Error('HTTP '+response.status);if((response.headers.get('content-type')||'').includes('text/html'))throw Error('A web page was returned instead of the document');output.textContent='Download responded HTTP '+response.status+' · checked '+new Date().toLocaleString()+'. This checks availability, not file integrity.';}
 catch(error){output.textContent='Could not verify this download: '+error.message+'. Open the archive record to check access.';}
}
async function boundedPDF(url,signal){
 const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});
 if(!response.ok)throw Error('Download returned HTTP '+response.status);
 if(Number(response.headers.get('content-length'))>50*1024*1024){await response.body?.cancel();throw Error('This PDF exceeds the 50 MB local-search limit.');}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>50*1024*1024)throw Error('This PDF exceeds the 50 MB local-search limit.');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export function mountPDFSearch(container,item){
 disposeActive();
 const pdfs=(item.files||[]).filter(file=>/pdf/i.test(file.format));if(!pdfs.length)return;
 const section=el('section');section.className='pdf-search';
 section.append(el('h3','Search inside this PDF'),el('p','Search a public Archive PDF, or choose a downloaded PDF from your device if its server blocks browser access. Local files are never uploaded. Limit: 50 MB / 500 pages. Scanned pages need an existing text layer.'));
 const label=el('label','Document edition / file'),select=el('select');select.setAttribute('aria-label','PDF to search');
 for(const file of pdfs){const o=el('option',file.name);o.value=file.name;select.append(o);}label.append(select);
 const localLabel=el('label','Or choose a local PDF'),localInput=el('input');localInput.type='file';localInput.accept='application/pdf,.pdf';localInput.setAttribute('aria-label','Choose a local PDF');localLabel.append(localInput);
 const input=el('input');input.placeholder='Word or phrase, such as shutter speed';input.maxLength=160;input.setAttribute('aria-label','Find text in PDF');
 const status=el('p');status.setAttribute('role','status');const results=el('div');let pages=null,loaded='',generation=0,localFile=null,localUrl='',controller;
 function invalidate(){generation++;controller?.abort();pages=null;loaded='';if(localUrl){URL.revokeObjectURL(localUrl);localUrl='';}results.replaceChildren();}
 disposeActive=()=>{invalidate();};
 const run=button('Search PDF pages',async()=>{
  const own=++generation;results.replaceChildren();run.disabled=true;controller?.abort();controller=new AbortController();
  try{
   matchPages([],input.value);const file=pdfs.find(f=>f.name===select.value);const identity=localFile?'local:'+localFile.name+':'+localFile.lastModified+':'+localFile.size:file.name;
   if(loaded!==identity){
    status.textContent=localFile?'Reading the local PDF text layer…':'Downloading PDF and reading its text layer…';
    if(localFile?.size>50*1024*1024)throw Error('This PDF exceeds the 50 MB local-search limit.');
    const bytes=localFile?new Uint8Array(await localFile.arrayBuffer()):await boundedPDF(file.url,controller.signal);
    if(!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-'))throw Error('The selected file is not a PDF document.');
    if(own!==generation)return;
    const pdfjs=await import('./vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
    const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false});const pdf=await task.promise;
    try{if(pdf.numPages>500)throw Error('This PDF exceeds the 500-page local-search limit.');const next=[];for(let n=1;n<=pdf.numPages;n++){if(own!==generation)return;const p=await pdf.getPage(n),text=await p.getTextContent();next.push(text.items.map(x=>x.str||'').join(' '));p.cleanup();if(n%20===0)status.textContent='Reading page '+n+' of '+pdf.numPages+'…';}pages=next;loaded=identity;}finally{await task.destroy();}
   }
   if(own!==generation)return;
   const hits=matchPages(pages,input.value);status.textContent=hits.length+' matching PDF pages of '+pages.length+'. Printed page numbers may differ.'+(localFile?' Local file: '+localFile.name+'. Its identity has not been matched to the archive record.':'');
   if(!pages.some(text=>text.trim()))status.textContent='No searchable text layer was found. Open the scanned pages on Internet Archive.';
   if(localFile&&!localUrl)localUrl=URL.createObjectURL(localFile);
   for(const hit of hits.slice(0,100)){
    const article=el('article'),a=el('a',localFile?'Open local PDF page '+hit.page:'Open PDF page '+hit.page);a.href=(localFile?localUrl:file.url)+'#page='+hit.page;a.target='_blank';a.rel='noopener';
    const citation=localFile?`${localFile.name}. PDF file page ${hit.page} (local file; archive identity not verified).`:pageCitation(item,file,hit.page);
    article.append(a,el('p',hit.excerpt),button('Copy page citation',async()=>{try{await navigator.clipboard.writeText(citation);status.textContent='Page citation copied.';}catch{status.textContent=citation;}}));results.append(article);
   }
   if(hits.length>100)results.append(el('p','First 100 matching pages shown. Narrow the phrase for fewer results.'));
  }catch(error){if(own===generation)status.textContent='PDF search unavailable: '+error.message+'. If the archive download is blocked, open its original link, save the PDF and choose it locally above.';}
  finally{if(own===generation)run.disabled=false;}
 });
 select.onchange=()=>{invalidate();localFile=null;localInput.value='';run.disabled=false;status.textContent='Selected archive file changed. Search to load this edition.';};
 localInput.onchange=()=>{invalidate();localFile=localInput.files?.[0]||null;run.disabled=false;status.textContent=localFile?'Selected local file: '+localFile.name+'. It stays on this device and is not assumed to match the archive edition.':'Archive PDF selected.';};
 section.append(label,localLabel,input,run,status,results);container.append(section);
}
