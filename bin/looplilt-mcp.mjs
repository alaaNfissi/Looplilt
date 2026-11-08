#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { GraphWorkspace } from '../lib/graph/workspace.mjs';
import { createLoopliltServer } from '../lib/mcp/server.mjs';

const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--workspace'||!args[1]){
 console.error('Usage: looplilt-mcp --workspace <existing-directory>');
 process.exitCode=2;
}else{
 try{
  const workspace=await GraphWorkspace.open(args[1]);
  const transport=new StdioServerTransport(process.stdin,process.stdout,{maxBufferSize:8*1024*1024});
  const handle=serveStdio(()=>createLoopliltServer(workspace),{transport,maxSubscriptions:32,onerror:error=>{console.error(`Looplilt MCP: ${error.message}`);}});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void handle.close().catch(error=>{console.error(error.message);process.exitCode=1;});});
 }catch(error){console.error(`Looplilt MCP could not open the selected workspace: ${error.message}`);process.exitCode=1;}
}