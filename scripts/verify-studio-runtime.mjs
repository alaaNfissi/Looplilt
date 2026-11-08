import {fileURLToPath} from 'node:url';
import {verifyStudioRuntime} from '../lib/studio/distribution.mjs';
const manifest=await verifyStudioRuntime(fileURLToPath(new URL('../',import.meta.url)));
console.log(JSON.stringify({valid:true,version:manifest.packageVersion,files:manifest.files.length,sources:manifest.sources}));
