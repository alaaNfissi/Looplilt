import {readProjectBundle} from './bundle.mjs';
import {graphFingerprint} from './transactions.mjs';

/** Import fully checked bytes. Reopening an interrupted import resumes the same
 * unchanged copy; existing creative edits always get a distinct destination. */
export async function importProjectBundle(blob,repository,{signal,onProgress}={}){
 const bundle=await readProjectBundle(blob,{signal,onProgress:(completed,total)=>onProgress?.({stage:'checking',completed,total})});
 const original=bundle.document,sourceFingerprint=await graphFingerprint(original),projects=await repository.list(),byId=new Map(projects.map(item=>[item.id,item]));
 let document=original,existing=byId.get(document.id);
 if(existing&&existing.fingerprint!==sourceFingerprint){
  const title=(original.title+' (imported copy)').slice(0,200);let selected=false;
  for(let index=0;index<100;index++){
   document={...original,id:'import-'+sourceFingerprint.slice(0,32)+(index?'-'+index:''),title};existing=byId.get(document.id);
   if(!existing||existing.fingerprint===await graphFingerprint(document)){selected=true;break;}
  }
  if(!selected)throw new Error('This project already has100 edited import copies. Choose another workspace.');
 }
 signal?.throwIfAborted();
 if(!existing)await repository.create(document);
 let completed=0;
 try{
  for(const [id,data]of bundle.assets){signal?.throwIfAborted();onProgress?.({stage:'saving',completed,total:bundle.assets.size});await repository.putAsset(document.assets[id],data,{signal,projectId:document.id});completed++;}
  signal?.throwIfAborted();onProgress?.({stage:'saving',completed,total:bundle.assets.size});
  return {projectId:document.id,title:document.title,mediaCount:completed,created:!existing};
 }catch(error){
  throw Object.assign(new Error('Could not finish importing “'+document.title+'”. Saved media is kept. Open the same .looplilt file again to retry. '+String(error.message??error)),{code:'INCOMPLETE_IMPORT',projectId:document.id,completedMedia:completed,totalMedia:bundle.assets.size,cause:error});
 }
}
