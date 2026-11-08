"use client";
import {useEffect,useRef,useState} from "react";
import {MoreHorizontal,Package,FolderOpen,Plus,Check} from "lucide-react";
import {createProjectBundle} from "@graph/bundle.mjs";
import {graphRepository,useGraphEditorStore} from "@/state/graphEditorStore";
type ProjectItem={id:string;title:string;revision:number;savedAt:number};
export function ProjectMenu({onOpenFile,onSaveJson,disabled=false}:{onOpenFile:()=>void;onSaveJson:()=>Promise<void>;disabled?:boolean}){
 const graph=useGraphEditorStore(s=>s.graph),ready=useGraphEditorStore(s=>s.ready),busy=useGraphEditorStore(s=>s.busy),history=useGraphEditorStore(s=>s.history);
 const details=useRef<HTMLDetailsElement>(null),controller=useRef<AbortController|null>(null),alive=useRef(true),generation=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;controller.current?.abort();};},[]);
 const [projects,setProjects]=useState<ProjectItem[]>([]),[search,setSearch]=useState(''),[working,setWorking]=useState<string|null>(null),[loading,setLoading]=useState(false),[unavailable,setUnavailable]=useState(0);
 const fail=(error:unknown)=>useGraphEditorStore.setState({error:error instanceof Error?error.message:String(error)});
 const close=()=>{if(details.current)details.current.open=false;};
 const loadProjects=async()=>{
  const current=++generation.current;setLoading(true);
  try{
   const result=await graphRepository().list();
   if(!alive.current||current!==generation.current)return;
   const valid=result.filter(project=>typeof project.title==='string'&&typeof project.id==='string');
   setProjects(valid);setUnavailable(result.length-valid.length);
  }catch(error){if(alive.current&&current===generation.current)fail(error);}
  finally{if(alive.current&&current===generation.current)setLoading(false);}
 };
 const saveBundle=async()=>{
  if(controller.current||disabled)return;const cancellation=new AbortController();controller.current=cancellation;setWorking('Checking project media…');
  try{
   if(!await useGraphEditorStore.getState().flush())return;
   const current=useGraphEditorStore.getState().graph;
   const blob=await createProjectBundle(current,graphRepository(),{signal:cancellation.signal,onProgress:(done,total)=>{if(alive.current)setWorking('Packing media '+done+' / '+total);}});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=current.title.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,100)+'.looplilt';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);close();
  }catch(error){if(!cancellation.signal.aborted)fail(error);}finally{controller.current=null;if(alive.current)setWorking(null);}
 };
 const matches=projects.filter(project=>project.title.toLowerCase().includes(search.toLowerCase())),locked=disabled||busy||!!working;
 return <details ref={details} className="studio-project-menu" onToggle={event=>{if(event.currentTarget.open&&ready)void loadProjects();}}>
  <summary aria-label="Project options" title="Project options"><MoreHorizontal size={18}/><span className="studio-project-trigger-label">Project</span></summary>
  <div className="studio-project-popover">
   <p className="studio-menu-eyebrow">YOUR WORKSPACE</p><strong>{graph.title}</strong>
   <button disabled={!ready||locked} onClick={()=>{close();void useGraphEditorStore.getState().newProject();}}><Plus size={15}/>New project</button>
   <button disabled={!ready||locked} onClick={()=>{close();onOpenFile();}}><FolderOpen size={15}/>Open project file</button>
   <button disabled={!ready||locked} onClick={()=>void saveBundle()}><Package size={15}/>Save project with media <small>.looplilt</small></button>
   <button disabled={!ready||locked} onClick={()=>{close();void onSaveJson();}}>Save editable JSON <small>media stays here</small></button>
   <div className="studio-mobile-history"><button disabled={locked||!history.undo.length} onClick={()=>{close();void useGraphEditorStore.getState().undo();}}>Undo latest change</button><button disabled={locked||!history.redo.length} onClick={()=>{close();void useGraphEditorStore.getState().redo();}}>Redo latest change</button></div>
   {working&&<div className="studio-menu-progress" role="status">{working}<button onClick={()=>controller.current?.abort()}>Cancel</button></div>}
   <label className="studio-project-search"><span>Projects on this device</span><input type="search" aria-label="Find a saved project" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find a story…"/></label>
   <div className="studio-recent-projects" aria-busy={loading}>
    {loading?<p role="status">Loading your saved stories…</p>:matches.map(project=><button key={project.id} disabled={locked} onClick={()=>{close();void useGraphEditorStore.getState().openSaved(project.id);}}><span><b>{project.title}</b><small>Revision {project.revision}</small></span>{project.id===graph.id&&<Check size={14}/>}</button>)}
    {!loading&&!matches.length&&<p>{search?'No saved stories match your search.':'Your saved stories will appear here.'}</p>}
    {!loading&&unavailable>0&&<p role="status">{unavailable} project {unavailable===1?'file could':'files could'} not be opened. Check the workspace files.</p>}
   </div>
  </div>
 </details>;
}
