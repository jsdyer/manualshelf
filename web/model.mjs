export const SCHEMA='manualshelf.cabinet.v1';
export const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(id);
export const text=(v,max=2000)=>String(Array.isArray(v)?v.join('; '):v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function searchURL(query,{page=1,rows=24,scope='manuals',sort='relevance'}={}){
 const words=text(query,160).match(/[\p{L}\p{N}][\p{L}\p{N}._-]*/gu)||[];
 if(!words.length)throw Error('Enter a manufacturer, model or manual title.');
 if(!Number.isInteger(page)||page<1||page>10000||!Number.isInteger(rows)||rows<1||rows>50)throw Error('Invalid search page.');
 const terms=words.slice(0,20).map(w=>'"'+w+'"').join(' AND ');
 const q='mediatype:texts'+(scope==='all'?'':' AND (collection:manuals OR title:manual OR title:instructions OR title:handbook)')+' AND ('+terms+')';
 const u=new URL('https://archive.org/advancedsearch.php');u.searchParams.set('q',q);for(const f of ['identifier','title','creator','year','date','language','description'])u.searchParams.append('fl[]',f);u.searchParams.set('rows',rows);u.searchParams.set('page',page);u.searchParams.set('output','json');
 if(sort==='newest')u.searchParams.append('sort[]','date desc');if(sort==='oldest')u.searchParams.append('sort[]','date asc');return u.href;
}
export function normalizeItem(item,checkedAt=new Date().toISOString()){
 if(!item||!validId(item.identifier))throw Error('The archive returned an invalid item identifier.');
 return {id:item.identifier,title:text(item.title,500)||item.identifier,creator:text(item.creator,400),year:text(item.year||item.date,80),language:text(item.language,120),description:text(item.description,2500),checkedAt,kind:manualKind(text(item.title))};
}
export function manualKind(title){if(/service|repair|maintenance/i.test(title))return 'Service / repair';if(/install|setup|assembly/i.test(title))return 'Installation / setup';if(/owner|user|instruction|operating/i.test(title))return 'Owner / operation';return 'Unclassified';}
export function parseSearch(data,checkedAt){if(!data?.response||!Array.isArray(data.response.docs)||!Number.isFinite(data.response.numFound))throw Error('Unexpected archive search response.');return {total:Math.max(0,data.response.numFound),items:data.response.docs.filter(d=>validId(d.identifier)).map(d=>normalizeItem(d,checkedAt))};}
export const itemURL=id=>{if(!validId(id))throw Error('Invalid archive identifier.');return 'https://archive.org/details/'+encodeURIComponent(id);};
export const metadataURL=id=>{itemURL(id);return 'https://archive.org/metadata/'+encodeURIComponent(id);};
export function fileURL(id,name){itemURL(id);if(typeof name!=='string'||!name||name.length>1000||/[\u0000-\u001f\\]/.test(name)||name.split('/').some(s=>s==='.'||s==='..'))throw Error('Invalid file name.');return 'https://archive.org/download/'+encodeURIComponent(id)+'/'+name.split('/').map(encodeURIComponent).join('/');}
export function parseDetail(data,id,checkedAt=new Date().toISOString()){
 if(!data||Array.isArray(data)||data.is_dark||!data.metadata||!Array.isArray(data.files))throw Error('This item is unavailable or its metadata could not be read.');
 if(data.metadata.identifier&&data.metadata.identifier!==id)throw Error('Archive item identity did not match.');
 const item=normalizeItem({...data.metadata,identifier:id},checkedAt);
 const files=data.files.filter(f=>f.name&&!['true','1'].includes(String(f.private))&&/PDF|Text|DjVu|EPUB|Document|Kindle/i.test(f.format||'')&&!/metadata|scandata/i.test(f.format||''))
 .slice(0,1000).map(f=>({name:text(f.name,1000),format:text(f.format,100),original:f.source==='original',bytes:Number.isFinite(Number(f.size))?Math.max(0,Number(f.size)):null,sha1:/^[0-9a-f]{40}$/i.test(f.sha1||'')?f.sha1:'',url:fileURL(id,f.name)}));
 return {...item,files,rights:text(data.metadata.rights||data.metadata.licenseurl,1000),restricted:['true','1'].includes(String(data.metadata['access-restricted-item'])),collection:text(data.metadata.collection,400)};
}
export function bytes(n){if(n===null||!Number.isFinite(n))return 'Size unknown';if(n<1024)return n+' B';return n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';}
export function savedItem(item,equipment='',notes=''){if(!validId(item?.id))throw Error('Invalid manual.');return {id:item.id,title:text(item.title,500)||item.id,creator:text(item.creator,400),year:text(item.year,80),language:text(item.language,120),kind:manualKind(text(item.title)),checkedAt:typeof item.checkedAt==='string'&&Number.isFinite(Date.parse(item.checkedAt))?item.checkedAt:null,equipment:String(equipment).trim().slice(0,200),notes:String(notes).slice(0,5000),savedAt:new Date().toISOString()};}
export function parseCabinet(value){const d=typeof value==='string'?JSON.parse(value):value;if(d?.schema!==SCHEMA||!Array.isArray(d.items)||d.items.length>300)throw Error('Choose a Manual Shelf cabinet with at most 300 saved manuals.');const seen=new Set();return d.items.map(v=>{if(!v||!validId(v.id)||seen.has(v.id))throw Error('Cabinet has invalid or duplicate manual identifiers.');seen.add(v.id);const item=savedItem(v,v.equipment||'',v.notes||'');if(typeof v.savedAt==='string'&&Number.isFinite(Date.parse(v.savedAt)))item.savedAt=v.savedAt;return item;});}
export function mergeCabinet(old,incoming){const byId=new Map(old.map(i=>[i.id,i]));for(const i of incoming)if(!byId.has(i.id))byId.set(i.id,i);if(byId.size>300)throw Error('A cabinet can hold up to 300 manuals.');return [...byId.values()];}
export function csv(rows){return rows.map(r=>r.map(v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export function cabinetCSV(items){return csv([['Equipment','Manual','Creator','Record date','Type inferred from title','Source','Metadata checked','Notes'],...items.map(i=>[i.equipment,i.title,i.creator,i.year,i.kind,itemURL(i.id),i.checkedAt,i.notes])]);}
