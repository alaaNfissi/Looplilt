"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { startPlayback, tick } from "@looplilt-studio/playback-engine";
import { graphRepository, useGraphEditorStore } from "@/state/graphEditorStore";
import { mixGraphAudio } from "./graphAudio";

export function useGraphTransport(){
 const context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),cancel=useRef<AbortController|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),animation=useRef<number|null>(null);
 const resumeTick=useRef<()=>void>(()=>{});
 const [preparing,setPreparing]=useState(false);const graph=useGraphEditorStore(s=>s.graph);
 const stop=useCallback(()=>{cancel.current?.abort();cancel.current=null;if(timer.current!==null)clearTimeout(timer.current);if(animation.current!==null)cancelAnimationFrame(animation.current);timer.current=null;animation.current=null;if(source.current){source.current.onended=null;try{source.current.stop();}catch{}source.current.disconnect();source.current=null;}useGraphEditorStore.setState({isPlaying:false});setPreparing(false);},[]);
 useEffect(()=>{stop();},[graph,stop]);
 useEffect(()=>()=>{stop();void context.current?.close();},[stop]);
 useEffect(()=>{const visibility=()=>resumeTick.current();document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
 const toggle=useCallback(async()=>{
  if(useGraphEditorStore.getState().isPlaying||cancel.current){stop();return;}
  const controller=new AbortController();cancel.current=controller;setPreparing(true);
  try{
   context.current??=new AudioContext({sampleRate:48000});await context.current.resume();
   const snapshot=useGraphEditorStore.getState(),document=snapshot.graph,start=snapshot.playhead>=document.durationFrames-1?0:snapshot.playhead;
   const buffer=await mixGraphAudio(document,graphRepository(),{startFrame:start,signal:controller.signal});controller.signal.throwIfAborted();
   const clock=context.current,origin=startPlayback(start,clock.currentTime+.025,{durationFrames:document.durationFrames,loop:false});
   if(buffer){const player=clock.createBufferSource();player.buffer=buffer;player.connect(clock.destination);player.start(origin.startedAtSeconds);source.current=player;}
   useGraphEditorStore.setState({isPlaying:true});setPreparing(false);
   const step=()=>{if(controller.signal.aborted)return;const next=tick(origin,clock.currentTime,document.frameRate.numerator/document.frameRate.denominator,{durationFrames:document.durationFrames,loop:false});useGraphEditorStore.getState().setPlayhead(Math.floor(next.frame));if(next.ended){stop();return;}if(globalThis.document.hidden)timer.current=setTimeout(step,50);else animation.current=requestAnimationFrame(step);};
   resumeTick.current=()=>{if(controller.signal.aborted)return;if(timer.current!==null)clearTimeout(timer.current);if(animation.current!==null)cancelAnimationFrame(animation.current);step();};
   step();
  }catch(error){if(!controller.signal.aborted)useGraphEditorStore.setState({error:error instanceof Error?error.message:String(error)});stop();}
 },[stop]);
 return {toggle,stop,preparing};
}
