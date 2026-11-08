"use client";
import { useRef,useState } from "react";
import type {PropertyMetadata} from "@graph/registry.mjs";
import {useGraphEditorStore} from "@/state/graphEditorStore";
type Commit=(value:string|number|boolean,fingerprint:string)=>Promise<boolean>;
export function Field({name,value,meta,onCommit}:{name:string;value:string|number|boolean;meta:PropertyMetadata;onCommit:Commit}){
 const [draft,setDraft]=useState(String(value)),[active,setActive]=useState(false),[working,setWorking]=useState(false),[unsaved,setUnsaved]=useState(false);
 const caption=name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase());
 const focus=useRef({value:String(value),fingerprint:''});
 const begin=()=>{focus.current={value:String(value),fingerprint:useGraphEditorStore.getState().fingerprint};if(!unsaved)setDraft(String(value));setActive(true);};
 const save=async(fingerprint=focus.current.fingerprint)=>{setActive(false);if(!unsaved&&draft===focus.current.value)return;setWorking(true);try{const ok=await onCommit(meta.kind==='number'?Number(draft):draft,fingerprint);setUnsaved(!ok);}finally{setWorking(false);}};
 if(meta.kind==='boolean')return <label className="graph-check"><span>{caption}</span><input aria-label={caption} type="checkbox" checked={Boolean(value)} onChange={e=>void onCommit(e.target.checked,useGraphEditorStore.getState().fingerprint)}/></label>;
 if(meta.kind==='enum')return <label className="graph-field"><span>{caption}</span><select aria-label={caption} value={String(value)} onChange={e=>void onCommit(e.target.value,useGraphEditorStore.getState().fingerprint)}>{meta.values?.map(v=><option key={v}>{v}</option>)}</select></label>;
 const shown=active||working||unsaved?draft:String(value);
 return <div className="graph-field-wrap"><label className="graph-field"><span>{caption}</span>{meta.kind==='string'&&['text','path','d'].includes(name)?<textarea aria-label={caption} value={shown} maxLength={meta.maxLength} rows={3} onFocus={begin} onChange={e=>setDraft(e.target.value)} onBlur={()=>void save()}/>:<input aria-label={caption} value={shown} type={meta.kind==='number'?'number':'text'} min={meta.min} max={meta.max} step={meta.integer?1:'any'} maxLength={meta.maxLength} onFocus={begin} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={()=>void save()}/>}</label>{unsaved&&<div className="graph-unsaved"><span>Value not saved. Current: {String(value).slice(0,80)}</span><button onClick={()=>{setDraft(String(value));setUnsaved(false);}}>Use current</button><button onClick={()=>void save(useGraphEditorStore.getState().fingerprint)}>Apply my value</button></div>}</div>;
}
