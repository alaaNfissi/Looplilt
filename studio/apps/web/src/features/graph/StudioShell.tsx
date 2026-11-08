"use client";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, Import, Plus, Play, Pause, Undo2, Redo2, Download, Layers, Film, Type, Circle, Square, X, AudioLines, Image as ImageIcon, FileCode2 } from "lucide-react";
import { TimelinePanel } from "@/features/timeline/TimelinePanel";
import { graphRepository, useGraphEditorStore } from "@/state/graphEditorStore";
import {importProjectBundle} from "@graph/project-import.mjs";
import { isProjectBundle } from "@graph/bundle.mjs";
import { ProjectMenu } from "./ProjectMenu";
import { serializeGraph } from "@graph/transactions.mjs";
import { validateGraph } from "@graph/schema.mjs";
import { createNodeOperations } from "@graph/commands.mjs";
import type { GraphDocument } from "@graph/types.mjs";
import { GraphPreview } from "./GraphPreview";
import { GraphLayers } from "./GraphLayers";
import {StudioStart} from "./StudioStart";
import stories from "../../../../../stories.json";
import { GraphInspector } from "./GraphInspector";
import { prepareLegacyImport } from "./legacyImport";
import { inspectLocalMedia } from "./GraphMediaProvider";
import { useGraphTransport } from "./useGraphTransport";
import type { ExportProgress } from "@looplilt-studio/export-engine";
import { exportGraph } from "./graphExport";
import "./studio.css";

function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function StudioShell(){
 const graph=useGraphEditorStore(s=>s.graph),ready=useGraphEditorStore(s=>s.ready),busy=useGraphEditorStore(s=>s.busy),dirty=useGraphEditorStore(s=>s.dirty),error=useGraphEditorStore(s=>s.error),history=useGraphEditorStore(s=>s.history),playhead=useGraphEditorStore(s=>s.playhead),playing=useGraphEditorStore(s=>s.isPlaying),saved=useGraphEditorStore(s=>s.lastSavedAt);
 const relinkInput=useRef<HTMLInputElement>(null),relinkTarget=useRef<{projectId:string;assetId:string}|null>(null),legacyInput=useRef<HTMLInputElement>(null),importInput=useRef<HTMLInputElement>(null),projectInput=useRef<HTMLInputElement>(null),exportCancel=useRef<AbortController|null>(null),importCancel=useRef<AbortController|null>(null);
 const [tab,setTab]=useState<'layers'|'media'>('layers'),[mobilePane,setMobilePane]=useState('canvas'),[importing,setImporting]=useState(false),[opening,setOpening]=useState<string|null>(null),[progress,setProgress]=useState<ExportProgress|null>(null),[format,setFormat]=useState<'mp4'|'webm'>('mp4');
 const [exportNote,setExportNote]=useState<string|null>(null);
 const transport=useGraphTransport();
 useEffect(()=>{void useGraphEditorStore.getState().initialize();return()=>{exportCancel.current?.abort();importCancel.current?.abort();};},[]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName))return;
   if(event.code==='Space'&&target?.closest('button,summary,a'))return;
   const state=useGraphEditorStore.getState();if(!state.ready||state.busy)return;
   if(event.code==='Space'){event.preventDefault();void transport.toggle();}else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?state.redo():state.undo();}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();state.deleteSelected();}else if(event.key.toLowerCase()==='s'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();state.splitAtPlayhead();}else if(event.key.toLowerCase()==='n'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();state.toggleSnap();}else if(event.key.toLowerCase()==='i'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();state.setInPoint(state.playhead);}else if(event.key.toLowerCase()==='o'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();state.setOutPoint(state.playhead);}else if(event.key==='Home'){event.preventDefault();state.setPlayhead(0);}else if(event.key==='End'){event.preventDefault();state.setPlayhead(state.graph.durationFrames-1);}else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();state.setPlayhead(state.playhead+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?10:1));}else if(event.key==='Escape'){state.cancelGesture();transport.stop();}
  };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[transport.toggle,transport.stop]);
 const importFiles=async(files:FileList|File[])=>{
  if(importing)return;const destination=useGraphEditorStore.getState().graph.id;setImporting(true);try{for(const file of Array.from(files)){const asset=await inspectLocalMedia(file);await graphRepository().putAsset(asset,file,{projectId:destination});if(useGraphEditorStore.getState().graph.id!==destination)throw new Error('The active project changed. Media was kept with the original project; select it and import again.');if(!useGraphEditorStore.getState().graph.assets[asset.id]&&!await useGraphEditorStore.getState().edit(`Import ${asset.name}`,[{op:'asset.add',asset}]))throw new Error(useGraphEditorStore.getState().error??'Asset import was not saved');}setTab('media');setMobilePane('layers');}catch(failure){useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});}finally{setImporting(false);}
 };
 const importLegacy=async(files:File[])=>{
  setImporting(true);transport.stop();
  try{if(!await useGraphEditorStore.getState().flush())return;const state=useGraphEditorStore.getState(),id=state.graph.id,fp=state.fingerprint;
   const prepared=await prepareLegacyImport(files,state.graph,graphRepository(),state.playhead);
   const current=useGraphEditorStore.getState();if(current.graph.id!==id)throw new Error('The active project changed. Select the original project and import again.');
   if(await current.edit('Import editable Canvas film',prepared.operations,fp)){useGraphEditorStore.getState().selectClips([prepared.nodeId]);setTab('layers');}
  }catch(failure){useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});}finally{setImporting(false);}
 };
 const addMedia=async(id:string)=>{
  const current=useGraphEditorStore.getState(),asset=current.graph.assets[id];if(!['audio','video','image'].includes(asset.kind))return;
  const duration=Math.max(1,Math.min(current.graph.durationFrames-current.playhead,Math.floor(Number(asset.metadata.durationSeconds??(current.graph.durationFrames/current.project.settings.frameRate))*current.project.settings.frameRate)));
  const nodeId=`${asset.kind}_${crypto.randomUUID()}`,selected=current.graph.nodes[current.selectedClipIds[0]];
  const compatible=selected&&selected.type==='track'&&(selected.props.kind==='audio')===(asset.kind==='audio');
  const parentId=compatible?selected.id:`track_${crypto.randomUUID()}`;
  const specifications=[];
  if(!compatible)specifications.push({id:parentId,type:'track',name:asset.kind==='audio'?'Soundtrack':asset.name,props:{kind:asset.kind==='audio'?'audio':'visual'}});
  specifications.push({id:nodeId,type:asset.kind,name:asset.name,parentId,start:current.playhead,duration,props:{asset:id,...(asset.kind==='audio'?{}:{width:current.graph.width,height:current.graph.height})}});
  if(await current.edit(`Place ${asset.name}`,createNodeOperations(current.graph,specifications)))useGraphEditorStore.getState().selectClips([nodeId]);
 };
 const beginExport=async()=>{
  if(exportCancel.current)return;setExportNote(null);transport.stop();const controller=new AbortController();exportCancel.current=controller;
  try{if(!await useGraphEditorStore.getState().flush())return;const current=useGraphEditorStore.getState();const result=await exportGraph(current.graph,graphRepository(),{format,startFrame:current.inPoint??0,endFrame:current.outPoint??current.graph.durationFrames,signal:controller.signal,onProgress:setProgress});download(result.blob,result.filename);if(format==='mp4'&&result.audioCodec==='opus')setExportNote('This browser used Opus sound in MP4. For wider player support, export MP4 with the local tools, or choose WebM here.');}
  catch(failure){if(!controller.signal.aborted)useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});}
  finally{setProgress(null);exportCancel.current=null;}
 };
 const openFile=async(file:File)=>{
  if(importCancel.current||importing)return;const cancellation=new AbortController();importCancel.current=cancellation;setImporting(true);setOpening('Checking your project…');transport.stop();
  try{
   if(await isProjectBundle(file)){
    const imported=await importProjectBundle(file,graphRepository(),{signal:cancellation.signal,onProgress:value=>setOpening((value.stage==='checking'?'Checking media ':'Saving media ')+value.completed+' / '+value.total)});
    await useGraphEditorStore.getState().openSaved(imported.projectId);
   }else{
    if(file.size>8*1024*1024)throw new Error('Project JSON files are limited to 8 MiB');
    const value=JSON.parse(await file.text());cancellation.signal.throwIfAborted();validateGraph(value,{allowUnsupported:true});await useGraphEditorStore.getState().openGraph(value as GraphDocument);
   }
  }catch(failure){useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});}finally{setImporting(false);setOpening(null);importCancel.current=null;}
 };
 const relink=async(file:File)=>{
  const target=relinkTarget.current;if(!target)return;
  setImporting(true);
  try{const state=await graphRepository().read(target.projectId),asset=state.document.assets[target.assetId];if(!asset)throw new Error('The asset was removed from this project.');
   await graphRepository().putAsset(asset,file,{projectId:target.projectId});
   if(useGraphEditorStore.getState().graph.id===target.projectId)await useGraphEditorStore.getState().openSaved(target.projectId);
  }catch(failure){useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});}finally{setImporting(false);relinkTarget.current=null;}
 };
 const storyOpened=useRef(false);
 const openStory=async(slug:string)=>{
  const story=stories.find(item=>item.slug===slug);if(!story||importCancel.current||importing||busy)return false;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('The example download timed out. Try opening it again.')),60000);importCancel.current=controller;setImporting(true);setOpening('Opening '+story.title+'…');transport.stop();
  try{
   if(!await useGraphEditorStore.getState().flush())return false;
   const response=await fetch('/studio/stories/'+story.slug+'.looplilt',{signal:controller.signal,credentials:'omit',cache:'no-cache'});
   if(!response.ok||!response.body)throw new Error('The example is unavailable. Please try again.');
   const reader=response.body.getReader(),parts:Uint8Array<ArrayBuffer>[]=[],limit=32*1024*1024;let total=0;
   try{while(true){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.byteLength;if(total>limit)throw new Error('The example exceeds its32MiB download limit.');parts.push(new Uint8Array(chunk.value));setOpening('Downloading '+story.title+' · '+(total/1048576).toFixed(1)+' MB');}}finally{await reader.cancel();reader.releaseLock();}
   const imported=await importProjectBundle(new Blob(parts),graphRepository(),{signal:controller.signal,onProgress:value=>setOpening((value.stage==='checking'?'Checking media ':'Saving media ')+value.completed+' / '+value.total)});
   if(!await useGraphEditorStore.getState().openSaved(imported.projectId))return false;
   // A blank workspace hides its timeline. Wait for the opened document to reveal
   // the layout, then measure the container before the canvas ResizeObserver runs.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   const timeline=document.querySelector('canvas[aria-label="Timeline"]');
   const width=timeline?.parentElement?.clientWidth||timeline?.clientWidth||900;
   useGraphEditorStore.getState().setZoom(width/(useGraphEditorStore.getState().graph.durationFrames+2));useGraphEditorStore.getState().setScrollFrame(0);
   setMobilePane('canvas');setTab('layers');return true;
  }catch(failure){if(!controller.signal.aborted||controller.signal.reason instanceof Error)useGraphEditorStore.setState({error:failure instanceof Error?failure.message:String(failure)});return false;}
  finally{clearTimeout(timer);setImporting(false);setOpening(null);importCancel.current=null;}
 };
 useEffect(()=>{
  if(!ready||storyOpened.current)return;storyOpened.current=true;
  const url=new URL(window.location.href),slug=url.searchParams.get('story');if(!slug)return;
  if(!stories.some(story=>story.slug===slug)){useGraphEditorStore.setState({error:'That example is not in this Studio release. Choose a film from looplilt.com.'});return;}
  void openStory(slug).then(ok=>{if(ok){url.searchParams.delete('story');window.history.replaceState(null,'',url);}});
 // Initial navigation runs once after the repository has opened.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready]);

 const saveProject=async()=>{if(!await useGraphEditorStore.getState().flush())return;const current=useGraphEditorStore.getState().graph;download(new Blob([serializeGraph(current)],{type:'application/json'}),current.title.replace(/[^a-zA-Z0-9_-]+/g,'-')+'.looplilt.json');};

 const hasSelection=useGraphEditorStore(s=>s.selectedClipIds.length>0);
 const welcome=ready&&!hasSelection&&Object.keys(graph.nodes).length===1&&Object.keys(graph.assets).length===0;
 return <main className="looplilt-studio" data-mobile-pane={mobilePane} data-welcome={welcome}>
  <header className="studio-header"><a className="studio-brand" href="https://looplilt.com/" title="Looplilt home"><img src="/studio/mark.svg" width="32" height="32" alt=""/><span>Looplilt <small>STUDIO</small></span></a><span className="studio-divider"/>
   <ProjectTitle key={graph.id}/>
   <span className="studio-local"><i/>{!ready?'Opening workspace':busy?'Saving…':dirty?'Editing…':'Saved on this device'}</span>
   <div className="studio-header-actions"><ProjectMenu disabled={importing} onOpenFile={()=>projectInput.current?.click()} onSaveJson={saveProject}/><button aria-label="New project" title="New project" disabled={!ready||busy||importing} onClick={()=>void useGraphEditorStore.getState().newProject()}><Plus size={17}/></button><button aria-label="Open project" title="Open project" onClick={()=>projectInput.current?.click()} disabled={!ready||importing}><FolderOpen size={17}/></button>
    <button aria-label="Undo" title="Undo · Ctrl / Cmd Z" disabled={!history.undo.length||busy} onClick={()=>useGraphEditorStore.getState().undo()}><Undo2 size={17}/></button><button aria-label="Redo" title="Redo · Ctrl / Cmd Shift Z" disabled={!history.redo.length||busy} onClick={()=>useGraphEditorStore.getState().redo()}><Redo2 size={17}/></button>
    <button className="studio-save" disabled={!ready} onClick={()=>void saveProject()}>Project file</button>
    <select aria-label="Export format" value={format} onChange={e=>setFormat(e.target.value as 'mp4'|'webm')}><option value="mp4">MP4</option><option value="webm">WebM</option></select>
    <button className="studio-primary" disabled={!ready||busy||!!progress} onClick={()=>void beginExport()}><Download size={15}/>Export film</button>
   </div>
  </header>
  <input ref={relinkInput} aria-label="Relink original media" className="studio-hidden-input" type="file" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void relink(file);}}/>
  <input ref={legacyInput} aria-label="Import Canvas source files" className="studio-hidden-input" type="file" multiple accept=".json,.js" onChange={e=>{if(e.target.files)void importLegacy(Array.from(e.target.files));e.target.value='';}}/>
  <input ref={importInput} aria-label="Import local media" className="studio-hidden-input" type="file" multiple accept="video/*,audio/*,image/png,image/jpeg,image/webp,image/gif,.woff,.woff2,.ttf,.otf" onChange={e=>{if(e.target.files)void importFiles(e.target.files);e.target.value='';}}/>
  <input ref={projectInput} aria-label="Open editable project" className="studio-hidden-input" type="file" accept=".json,.looplilt" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void openFile(file);}}/>
  <nav className="studio-mobile-tabs" aria-label="Workspace panels">{['layers','canvas','properties'].map(name=><button key={name} aria-pressed={mobilePane===name} onClick={()=>setMobilePane(name)}>{name}</button>)}</nav>
  <div className="studio-workspace">
   <aside className="studio-library"><div className="studio-library-tabs"><button aria-pressed={tab==='layers'} onClick={()=>setTab('layers')}><Layers size={14}/>Layers</button><button aria-pressed={tab==='media'} onClick={()=>setTab('media')}><Film size={14}/>Media <span>{Object.keys(graph.assets).length}</span></button></div>
    <div className="studio-add-tools"><button title="Add title" aria-label="Add title" disabled={!ready||busy} onClick={()=>void useGraphEditorStore.getState().addNode('text')}><Type size={17}/></button><button title="Add rectangle" aria-label="Add rectangle" disabled={!ready||busy} onClick={()=>void useGraphEditorStore.getState().addNode('rectangle')}><Square size={16}/></button><button title="Add ellipse" aria-label="Add ellipse" disabled={!ready||busy} onClick={()=>void useGraphEditorStore.getState().addNode('ellipse')}><Circle size={16}/></button><button title="Add group" aria-label="Add group" disabled={!ready||busy} onClick={()=>void useGraphEditorStore.getState().addNode('group')}><Layers size={16}/></button><button className="studio-import" disabled={!ready||importing} onClick={()=>importInput.current?.click()}><Import size={14}/>{importing?'Reading…':'Import'}</button></div>
    <button className="studio-source-import" disabled={!ready||busy||importing} onClick={()=>legacyInput.current?.click()}>Open a Looplilt Canvas film <span>project.json + draw.js</span></button>
    <div className="studio-library-scroll">{tab==='layers'?<GraphLayers key={graph.id}/>:<div className="studio-media-grid">{Object.values(graph.assets).map(asset=><div key={asset.id} className="studio-media-item"><button className="studio-media-card" disabled={busy||!['audio','video','image'].includes(asset.kind)} onClick={()=>void addMedia(asset.id)}><span className={`studio-media-icon ${asset.kind}`}>{asset.kind==="audio"||asset.kind==="score"?<AudioLines size={24}/>:asset.kind==="image"?<ImageIcon size={24}/>:asset.kind==="font"?<Type size={24}/>:asset.kind.startsWith("legacy-")?<FileCode2 size={24}/>:<Film size={24}/>}</span><strong>{asset.name}</strong><small>{asset.kind} · {(asset.bytes/1048576).toFixed(1)} MB</small><span className="studio-media-add">{['audio','video','image'].includes(asset.kind)?'+ Add to scene':asset.kind==='font'?'Available in typography':'Editable source retained'}</span></button><button className="studio-relink" disabled={importing} aria-label={'Relink '+asset.name} onClick={()=>{relinkTarget.current={projectId:graph.id,assetId:asset.id};relinkInput.current?.click();}}>Relink original file</button></div>)}{!Object.keys(graph.assets).length&&<div className="studio-library-empty"><Import size={28}/><h3>Your footage. Your device.</h3><p>Bring video, images, audio, and fonts into your story.</p><button onClick={()=>importInput.current?.click()}>Choose files</button></div>}</div>}</div>
    <div className="studio-library-foot"><i/>Local by design. No account needed.</div>
   </aside>
   <section className="studio-stage"><div className="studio-stage-heading"><span>COMPOSITION</span><span>{graph.width} × {graph.height} <b>·</b> {Number((graph.frameRate.numerator/graph.frameRate.denominator).toFixed(3))} fps</span></div><GraphPreview/>{welcome&&<StudioStart disabled={busy||importing} onImport={()=>importInput.current?.click()} onTitle={()=>void useGraphEditorStore.getState().addNode("text")} onStory={slug=>{void openStory(slug);}}/>}
    <div className="studio-transport"><button className="studio-play" aria-label={playing?'Pause':'Play'} disabled={!ready} onClick={()=>void transport.toggle()}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><span className="studio-timecode">{String(Math.floor(playhead/(graph.frameRate.numerator/graph.frameRate.denominator)/60)).padStart(2,'0')}:{String(Math.floor(playhead/(graph.frameRate.numerator/graph.frameRate.denominator))%60).padStart(2,'0')}<small> / {(graph.durationFrames/(graph.frameRate.numerator/graph.frameRate.denominator)).toFixed(1)}s</small></span><span className="studio-transport-hint">{transport.preparing?'Preparing soundtrack…':'Space to play · S to split'}</span><button onClick={()=>useGraphEditorStore.getState().setPlayhead(0)}>↤ Start</button></div>
   </section>
   <GraphInspector/>
  </div>
  <section className="studio-timeline" aria-label="Timeline"><TimelinePanel/></section>
  <footer className="studio-footer"><span><i/>{busy?'Saving changes…':dirty?'Editing changes…':saved?'All changes saved':'Ready to create'}</span><span>{Object.keys(graph.nodes).length-1} layers <b>·</b> Revision {graph.revision}</span><a href="https://github.com/alaaNfissi/Looplilt/blob/main/docs/studio.md" target="_blank" rel="noreferrer">Help & documentation ↗</a></footer>
  {exportNote&&!error&&<div className="studio-error studio-export-note" role="status"><strong>Your film is exported.</strong><p>{exportNote} <a href="https://github.com/alaaNfissi/Looplilt/blob/main/docs/studio.md" target="_blank" rel="noopener noreferrer">Export options ↗</a></p><button aria-label="Dismiss export note" onClick={()=>setExportNote(null)}><X size={16}/></button></div>}
  {error&&<div className="studio-error" role="alert"><strong>Couldn’t finish that action.</strong><p>{error}</p><button aria-label="Dismiss error" onClick={()=>useGraphEditorStore.getState().dismissError()}><X size={16}/></button></div>}
  {opening&&<div className="studio-export-progress" role="status"><strong>Opening your story</strong><p>{opening}</p><button onClick={()=>importCancel.current?.abort()}>Cancel import</button></div>}
  {progress&&<div className="studio-export-progress" role="status"><strong>Exporting your film</strong><p>{progress.phase} · {Math.round(progress.ratio*100)}%</p><progress max={1} value={progress.ratio} aria-label="Export progress"/><button onClick={()=>exportCancel.current?.abort()}>Cancel export</button></div>}
 </main>;
}
function ProjectTitle(){
 const title=useGraphEditorStore(state=>state.graph.title),ready=useGraphEditorStore(state=>state.ready);
 const [draft,setDraft]=useState(title),[active,setActive]=useState(false),[unsaved,setUnsaved]=useState(false),[working,setWorking]=useState(false);
 const focus=useRef({title,fingerprint:''}),skip=useRef(false);
 return <input className="studio-project-name" aria-label="Project title" data-unsaved={unsaved} disabled={!ready||working} value={active||unsaved||working?draft:title} maxLength={200} title={unsaved?'This title was not saved. Edit it again after reviewing the current project.':title}
 onFocus={()=>{focus.current={title,fingerprint:useGraphEditorStore.getState().fingerprint};if(!unsaved)setDraft(title);setActive(true);}}
 onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){skip.current=true;setDraft(title);setUnsaved(false);event.currentTarget.blur();}}}
 onBlur={async()=>{setActive(false);if(skip.current){skip.current=false;return;}if(!unsaved&&draft===focus.current.title)return;setWorking(true);try{const ok=await useGraphEditorStore.getState().edit('Rename project',[{op:'project.patch',changes:{title:draft}}],focus.current.fingerprint);setUnsaved(!ok);}finally{setWorking(false);}}}/>;
}
