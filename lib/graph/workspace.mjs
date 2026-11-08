import {atomicRename} from '../atomic-file.mjs';
import {compareGraphDocuments} from './compare.mjs';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { assetPath, stableId, validateGraph, GRAPH_LIMITS } from './schema.mjs';
import { graphFingerprint, serializeGraph, applyTransaction, RevisionConflict } from './transactions.mjs';

const FILE = 'project.looplilt.json';
const HASH = /^[a-f0-9]{64}$/;
const missing = error => error?.code === 'ENOENT';
const cancelled = signal => signal?.throwIfAborted();

/** Resolve only ordinary descendants of an explicitly authorized directory. */
export async function scopedPath(root, relative, { missingLeaf = false } = {}) {
  assetPath(relative);
  let current = root;
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    let info;
    try { info = await fs.lstat(current); }
    catch (error) {
      if (missing(error) && missingLeaf && index === parts.length - 1) return current;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error('Symbolic links and junctions are not permitted inside a project workspace');
    if (index < parts.length - 1 && !info.isDirectory()) throw new Error('A path component is not a directory');
    if (index === parts.length - 1 && !info.isDirectory() && !info.isFile()) throw new Error('Only regular files and directories are supported');
  }
  const resolved = await fs.realpath(current), relativeReal = path.relative(root, resolved);
  if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) throw new Error('Path escaped its authorized workspace');
  return current;
}

// A metadata hint, never a replacement for fingerprint validation on edits.
// Nanosecond values and the file identity distinguish atomic replacements.
function storageStamp(stat) { return [stat.dev,stat.ino,stat.mtimeNs,stat.ctimeNs,stat.size].join(':'); }
function checkProjectFile(stat) {
  if (!stat.isFile() || stat.size > BigInt(GRAPH_LIMITS.bytes)) throw new Error('Project must be a regular JSON file of at most 8 MiB');
}

async function readDocument(file) {
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat({bigint:true});
    checkProjectFile(stat);
    const size = Number(stat.size);
    // The stamp belongs to this open file, not a newer file at the same path.
    // Read at most the bound plus one byte even if another process grows it.
    const buffer = Buffer.alloc(Math.min(size + 1, GRAPH_LIMITS.bytes + 1));
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (!bytesRead) break;
      total += bytesRead;
    }
    if (total > size) throw new Error('Project changed while it was being read; inspect it again');
    const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, total)));
    validateGraph(document, { allowUnsupported: true });
    return { document, fingerprint: await graphFingerprint(document), storageStamp: storageStamp(stat) };
  } finally { await handle.close(); }
}

async function durableFile(file, text) {
  const handle = await fs.open(file, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); }
  finally { await handle.close(); }
}

async function directorySync(directory) {
  // Windows does not expose directory fsync through Node. The file itself is
  // flushed on both platforms; atomic rename protects process interruptions.
  if (process.platform === 'win32') return;
  const handle = await fs.open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

async function ensureDirectory(root, relative) {
  const target = await scopedPath(root, relative, { missingLeaf: true });
  try { await fs.mkdir(target); } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const checked = await scopedPath(root, relative);
  if (!(await fs.stat(checked)).isDirectory()) throw new Error('Expected a project directory');
  return checked;
}

/**
 * Disk authority shared by CLI, local Studio companion and MCP. Each mutation
 * takes an exclusive per-project lock, reads the current document, checks its
 * fingerprint, and atomically replaces one canonical JSON file. History files
 * are immutable recovery copies, never an independently edited project model.
 */
export class GraphWorkspace {
  #root;
  #queues = new Map();
  constructor(root) { this.#root = root; }
  static async open(directory) {
    const root = await fs.realpath(directory);
    if (!(await fs.stat(root)).isDirectory()) throw new Error('Workspace must be an existing directory');
    return new GraphWorkspace(root);
  }
  get root() { return this.#root; }
  #relative(id) {
    stableId(id); assetPath(id);
    if (id !== id.toLowerCase()) throw new Error('Project IDs in a workspace use lowercase for portable filenames');
    return `projects/${id}`;
  }
  async #directory(id) { return scopedPath(this.#root, this.#relative(id)); }
  async read(id) {
    const relative = `${this.#relative(id)}/${FILE}`;
    const state = await readDocument(await scopedPath(this.#root, relative));
    if (state.document.id !== id) throw new Error('Project ID does not match its workspace directory');
    const journal = await this.#journal(await this.#directory(id), state);
    return { ...state, history: this.#historyLabels(journal), savedAt: journal.savedAt };
  }
  async revisionStamp(id) {
    const file = await scopedPath(this.#root, this.#relative(id) + '/' + FILE);
    const stat = await fs.stat(file, {bigint:true});
    checkProjectFile(stat);
    return {storageStamp: storageStamp(stat)};
  }
  async list() {
    let directory;
    try { directory = await scopedPath(this.#root, 'projects'); }
    catch (error) { if (missing(error)) return []; throw error; }
    const result = [];
    for await (const entry of await fs.opendir(directory)) {
      if (result.length >= 1000) throw new Error('Workspace listing exceeds 1000 projects');
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      try {
        const state = await this.read(entry.name);
        result.push({ id: entry.name, title: state.document.title, revision: state.document.revision, fingerprint: state.fingerprint, savedAt: state.savedAt });
      } catch (error) { result.push({ id: entry.name, error: error.message }); }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }
  async create(document) {
    validateGraph(document, { allowUnsupported: true });
    // Importing an existing editable file preserves its valid revision. Exclusive
    // directory creation still prevents replacing any existing project.
    const relative = this.#relative(document.id);
    await ensureDirectory(this.#root, 'projects');
    const directory = await scopedPath(this.#root, relative, { missingLeaf: true });
    // Exclusive mkdir protects all existing content, even an incomplete project.
    await fs.mkdir(directory);
    const file = path.join(directory, FILE);
    await durableFile(file, serializeGraph(document));
    await directorySync(directory);
    return this.read(document.id);
  }
  #serial(id, action) {
    const previous = this.#queues.get(id) ?? Promise.resolve();
    const running = previous.catch(() => {}).then(action);
    this.#queues.set(id, running);
    running.finally(() => { if (this.#queues.get(id) === running) this.#queues.delete(id); }).catch(() => {});
    return running;
  }
  async #locked(id, action, { signal } = {}) {
    return this.#serial(id, async () => {
      cancelled(signal);
      const directory = await this.#directory(id);
      const lock = await scopedPath(directory, 'edit.lock', { missingLeaf: true });
      const started = Date.now();
      let handle;
      while (!handle) {
        cancelled(signal);
        try { handle = await fs.open(lock, 'wx', 0o600); }
        catch (error) {
          if (error.code !== 'EEXIST') throw error;
          if (Date.now() - started >= 3000) {
            const failure = new Error('Project is locked by another edit. Retry after it finishes. An interrupted process may leave edit.lock; no lock is removed automatically.');
            failure.code = 'PROJECT_BUSY'; throw failure;
          }
          await delay(25, undefined, { signal });
        }
      }
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
        return await action(directory);
      } finally {
        await handle.close();
        await fs.unlink(lock);
      }
    });
  }
  #historyLabels(journal) { return { undo: journal.undo.map(entry => entry.label), redo: journal.redo.map(entry => entry.label) }; }
  async #journal(directory, state) {
    let file;
    try { file = await scopedPath(directory, 'history/' + state.fingerprint + '.journal.json'); }
    catch (error) {
      if (!missing(error)) throw error;
      return { version: 1, fingerprint: state.fingerprint, undo: [], redo: [], savedAt: (await fs.stat(path.join(directory, FILE))).mtimeMs };
    }
    const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let journal;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > 65536) throw new Error('History journal exceeds its size bound');
      const bytes = Buffer.alloc(info.size + 1), result = await handle.read(bytes, 0, bytes.length, 0);
      if (result.bytesRead !== info.size) throw new Error('History journal changed while reading');
      journal = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, result.bytesRead)));
    } finally { await handle.close(); }
    if (!journal || journal.version !== 1 || journal.fingerprint !== state.fingerprint || !Number.isFinite(journal.savedAt)
        || !Array.isArray(journal.undo) || !Array.isArray(journal.redo) || journal.undo.length + journal.redo.length > 100
        || journal.undo.concat(journal.redo).some(entry => !entry || !HASH.test(entry.fingerprint) || typeof entry.label !== 'string' || !entry.label.trim() || entry.label.length > 200 || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > GRAPH_LIMITS.bytes)) {
      throw new Error('History journal failed validation; the canonical project has not been changed');
    }
    const { checksum, ...body } = journal;
    if (checksum !== await graphFingerprint(body)) throw new Error('History journal failed its integrity check');
    return body;
  }
  #remember(journal, list, state, label) {
    journal[list].push({ fingerprint: state.fingerprint, label, bytes: Buffer.byteLength(serializeGraph(state.document)) });
    let bytes = journal.undo.concat(journal.redo).reduce((sum, entry) => sum + entry.bytes, 0);
    while (bytes > 16 * 1024 * 1024 || journal.undo.length + journal.redo.length > 100) {
      const items = journal.undo.length >= journal.redo.length ? journal.undo : journal.redo;
      bytes -= items.shift().bytes;
    }
  }
  async #snapshot(directory, state) {
    const history = await ensureDirectory(directory, 'history');
    const file = await scopedPath(history, state.fingerprint + '.json', { missingLeaf: true });
    try {
      const existing = await readDocument(file);
      if (existing.fingerprint !== state.fingerprint) throw new Error('Recovery copy failed its fingerprint check');
      return file;
    } catch (error) { if (!missing(error)) throw error; }
    const temporary = path.join(history, 'snapshot-' + randomUUID() + '.pending');
    try {
      await durableFile(temporary, serializeGraph(state.document));
      try { await fs.link(temporary, file); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if ((await readDocument(file)).fingerprint !== state.fingerprint) throw new Error('Recovery copy failed its fingerprint check');
      }
    } finally { await fs.unlink(temporary).catch(error => { if (!missing(error)) throw error; }); }
    return file;
  }
  async #commit(id, directory, before, after, journal, { signal } = {}) {
    cancelled(signal);
    await this.#snapshot(directory, before);
    await this.#snapshot(directory, after);
    const body = { ...journal, fingerprint: after.fingerprint, savedAt: Date.now() };
    const history = await scopedPath(directory, 'history');
    const journalFile = await scopedPath(history, after.fingerprint + '.journal.json', { missingLeaf: true });
    const journalTemp = path.join(history, 'journal-' + randomUUID() + '.pending');
    const temp = path.join(directory, 'pending-' + randomUUID() + '.json');
    try {
      await durableFile(journalTemp, JSON.stringify({ ...body, checksum: await graphFingerprint(body) }));
      await atomicRename(journalTemp,journalFile,{signal});
      await directorySync(history);
      await durableFile(temp, serializeGraph(after.document));
      cancelled(signal);
      // The only publication point. The new fingerprint selects its already
      // flushed journal and snapshots; interrupted preparation is invisible.
      await atomicRename(temp,await scopedPath(directory,FILE),{signal,beforeAttempt:async()=>{
        const checked=await readDocument(await scopedPath(directory,FILE));
        if(checked.fingerprint!==before.fingerprint)throw new RevisionConflict(before.fingerprint,checked.fingerprint);
      }});
      await directorySync(directory);
    } finally {
      for (const file of [temp, journalTemp]) await fs.unlink(file).catch(error => { if (!missing(error)) throw error; });
    }
    return { ...after, history: this.#historyLabels(body), savedAt: body.savedAt };
  }
  async transact(id, request, options = {}) {
    return this.#locked(id, async directory => {
      const before = await this.read(id), result = await applyTransaction(before.document, request);
      if (result.noop) return { ...before, ...result };
      const journal = await this.#journal(directory, before); journal.redo = [];
      this.#remember(journal, 'undo', before, request.label);
      return this.#commit(id, directory, before, result, journal, options);
    }, options);
  }
  async history(id,{offset=0,limit=100,signal}={}) {
    if(!Number.isInteger(offset)||offset<0||offset>50000||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Use a history offset in0..50000 and page size in1..100');
    const current=await this.read(id),all=[];let scanned=0;
    try{
      const directory=await scopedPath(await this.#directory(id),'history');
      for await(const entry of await fs.opendir(directory)){
        cancelled(signal);if(++scanned>100000)throw new Error('Recovery history exceeds the inspection budget; archive older recovery files explicitly');
        if(/^[a-f0-9]{64}\.json$/.test(entry.name)&&entry.isFile()&&!entry.isSymbolicLink())all.push(entry.name.slice(0,-5));
      }
    }catch(error){if(!missing(error))throw error;}
    all.sort();return {...current.history,recovery:all.slice(offset,offset+limit),fingerprint:current.fingerprint,total:all.length,nextOffset:offset+limit<all.length?offset+limit:null};
  }
  async compare(id,{fromFingerprint,toFingerprint,offset=0,limit=40,signal}={}){
    if(!HASH.test(fromFingerprint)||toFingerprint!==undefined&&!HASH.test(toFingerprint))throw new Error('Revision comparison requires valid fingerprints');
    cancelled(signal);const current=await this.read(id),directory=await this.#directory(id);
    const load=async fingerprint=>{
      if(fingerprint===current.fingerprint)return current;
      const saved=await readDocument(await scopedPath(directory,'history/'+fingerprint+'.json'));
      if(saved.fingerprint!==fingerprint||saved.document.id!==id)throw new Error('Comparison snapshot failed its integrity check');
      cancelled(signal);return saved;
    };
    const before=await load(fromFingerprint),after=toFingerprint?await load(toFingerprint):current;
    return {...compareGraphDocuments(before.document,after.document,{offset,limit}),fromFingerprint:before.fingerprint,toFingerprint:after.fingerprint};
  }
  async undoRedo(id, direction, expectedFingerprint, options = {}) {
    if (!['undo', 'redo'].includes(direction)) throw new Error('Expected undo or redo');
    return this.#locked(id, async directory => {
      const before = await this.read(id);
      if (expectedFingerprint !== before.fingerprint) throw new RevisionConflict(expectedFingerprint, before.fingerprint);
      const journal = await this.#journal(directory, before), entry = journal[direction].pop();
      if (!entry) throw new Error('Nothing to ' + direction);
      const saved = await readDocument(await scopedPath(directory, 'history/' + entry.fingerprint + '.json'));
      if (saved.fingerprint !== entry.fingerprint || saved.document.id !== id) throw new Error('History snapshot failed its integrity check');
      this.#remember(journal, direction === 'undo' ? 'redo' : 'undo', before, entry.label);
      saved.document.revision = before.document.revision + 1;
      validateGraph(saved.document, { allowUnsupported: true });
      const after = { document: saved.document, fingerprint: await graphFingerprint(saved.document) };
      return this.#commit(id, directory, before, after, journal, options);
    }, options);
  }
  async checkpoint(id, expectedFingerprint, options = {}) {
    return this.#locked(id, async directory => {
      const state = await this.read(id);
      if (expectedFingerprint !== state.fingerprint) throw new RevisionConflict(expectedFingerprint, state.fingerprint);
      await this.#snapshot(directory, state);
      return { fingerprint: state.fingerprint, revision: state.document.revision };
    }, options);
  }
  async restore(id, fingerprint, expectedFingerprint, options = {}) {
    if (!HASH.test(fingerprint)) throw new Error('Expected a recovery fingerprint');
    return this.#locked(id, async directory => {
      const before = await this.read(id);
      if (before.fingerprint !== expectedFingerprint) throw new RevisionConflict(expectedFingerprint, before.fingerprint);
      const saved = await readDocument(await scopedPath(directory, `history/${fingerprint}.json`));
      if (saved.fingerprint !== fingerprint || saved.document.id !== id) throw new Error('Recovery copy does not match the requested project and fingerprint');
      saved.document.revision = before.document.revision + 1;
      validateGraph(saved.document, { allowUnsupported: true });
      const after = { document: saved.document, fingerprint: await graphFingerprint(saved.document) };
      const journal = await this.#journal(directory, before); journal.redo = [];
      this.#remember(journal, 'undo', before, 'Restore checkpoint');
      return this.#commit(id, directory, before, after, journal, options);
    }, options);
  }
}
