import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readProject } from './project.mjs';
import { makeHtml } from './build.mjs';

// One explicitly selected project, loopback only, no filesystem or mutation endpoints.
export async function startPreview(directory, { format = 'landscape', port = 0, signal } = {}) {
  signal?.throwIfAborted();
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Preview port must be 0–65535');
  const token = randomBytes(24).toString('hex'), prefix = '/' + token;
  let state, film, refreshing, timer, closed = false, origin;
  function refresh() {
    if (closed) return Promise.resolve();
    const task = (refreshing ?? Promise.resolve()).then(refreshNow, refreshNow);
    refreshing = task;
    task.finally(() => { if (refreshing === task) refreshing = undefined; }).catch(() => {});
    return task;
  }
  async function refreshNow() {
    if (closed) return;
    try {
      const project = await readProject(directory);
      if (project.hash !== state?.hash) {
        const html = await makeHtml(project, format);
        film = html;
        state = { hash: project.hash, title: project.data.title, duration: project.data.duration, fps: project.data.fps,
          scenes: project.data.scenes ?? [], cues: project.data.cues ?? [], error: null };
      } else if (state.error) state = { ...state, error: null };
    } catch (error) {
      if (!state) throw error;
      state = { ...state, error: error.message.slice(0, 500) };
    }
  }
  await refresh();
  const shell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Looplilt — local preview</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f2e8;color:#173e33;font:15px system-ui,sans-serif}header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px;padding:20px 4vw;border-bottom:1px solid #bbc4ad}header strong{letter-spacing:.1em;font-size:14px}header span{font-size:12px}main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;padding:24px 4vw}iframe{width:100%;height:min(80vh,960px);border:0;border-radius:14px;background:#102d29}aside{padding:16px 0;min-width:0}h1{font:500 30px Georgia,serif;margin:0 0 20px}h2{font-size:12px;letter-spacing:.15em;text-transform:uppercase;margin-top:32px}button{display:block;width:100%;min-height:48px;text-align:left;border:1px solid #bac6af;background:transparent;border-radius:8px;padding:10px 12px;margin:8px 0;color:inherit;font:inherit;cursor:pointer}button:hover{background:#dce8ce}button:focus-visible{outline:3px solid #bc6546;outline-offset:3px}button small{display:block;font-size:11px;opacity:.7}p{line-height:1.6;font-size:13px}#status{border-left:3px solid #688b54;padding-left:12px}#status.error{border-color:#b44a28;color:#8e301b}code{font-size:12px;overflow-wrap:anywhere}footer{font-size:12px;padding:0 4vw 24px;color:#526a5c}@media(max-width:800px){main{grid-template-columns:minmax(0,1fr);padding:12px}iframe{height:74vh}aside{padding:0 12px}header{padding:16px}#scenes{display:flex;gap:8px;overflow:auto}#scenes button{min-width:160px;width:auto;flex-shrink:0}}</style></head><body>
<header><strong>LOOPLILT / LOCAL PREVIEW</strong><span>On your computer · no uploads</span></header><main><iframe id="film" title="Your film and playback controls" sandbox="allow-scripts" src="${prefix}/film"></iframe><aside><h1 id="title">Your film</h1><p id="status" role="status">Watching the two project files…</p><h2>The scenes</h2><div id="scenes"></div><h2>Make a change</h2><p>Edit <code>project.json</code> or <code>draw.js</code> in your editor. The preview reloads at your current moment, paused for inspection.</p><p>Invalid edits keep the last valid film visible. The preview cannot write or upload files.</p><p id="revision"></p></aside></main><footer>Stop with Ctrl+C in the terminal. Open and preview drawing code you trust.</footer><script src="${prefix}/app.js"></script></body></html>`;
  const app = `const frame=document.querySelector('#film'),status=document.querySelector('#status'),scenes=document.querySelector('#scenes');let hash,time=0;
addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.type==='looplilt:position'&&Number.isFinite(e.data.time))time=Math.max(0,e.data.time)});
frame.addEventListener('load',()=>frame.contentWindow.postMessage({type:'looplilt:seek',time},'*'));
async function update(){try{const response=await fetch('./state',{cache:'no-store'});if(!response.ok)throw new Error('Preview connection closed');const state=await response.json();document.querySelector('#title').textContent=state.title;status.className=state.error?'error':'';status.textContent=state.error?'Edit needs attention: '+state.error+' · Showing the last valid film.':'Watching project.json and draw.js. Save a change to see it here.';if(state.hash!==hash){if(hash)frame.src='./film?revision='+state.hash+'#t='+encodeURIComponent(Math.min(time,state.duration));hash=state.hash;document.querySelector('#revision').textContent='Source '+hash.slice(0,12);scenes.replaceChildren();for(const scene of state.scenes){const button=document.createElement('button');button.type='button';button.textContent=scene.label;const small=document.createElement('small');small.textContent=scene.start+'–'+scene.end+' s · '+scene.id;button.append(small);button.addEventListener('click',()=>{time=scene.start;frame.contentWindow.postMessage({type:'looplilt:seek',time},'*')});scenes.append(button)}if(!state.scenes.length)scenes.textContent='This project uses a freeform timeline. Its playback controls still work.';}}catch(error){status.className='error';status.textContent=error.message;}}update();setInterval(update,700);`;
  const server = http.createServer((request, response) => {
    const common = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
    if (closed || request.headers.host !== origin?.slice(7) || (request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') {
      response.writeHead(403, common).end('Forbidden'); return;
    }
    if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405, common).end('Read-only preview'); return; }
    const pathname = request.url.split('?')[0];
    let content, type = 'text/html; charset=utf-8', headers = common;
    if (pathname === prefix + '/') content = shell;
    else if (pathname === prefix + '/film') {
      content = film; headers = { ...common, 'Content-Security-Policy': "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'" };
    } else if (pathname === prefix + '/state') { content = JSON.stringify(state); type = 'application/json'; }
    else if (pathname === prefix + '/app.js') { content = app; type = 'text/javascript'; }
    else { response.writeHead(404, common).end('Not found'); return; }
    response.writeHead(200, { ...headers, 'Content-Type': type }); response.end(request.method === 'HEAD' ? undefined : content);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  const close = async () => {
    if (closed) return; closed = true; clearInterval(timer); signal?.removeEventListener('abort', onAbort);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  };
  const onAbort = () => { close().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once:true });
  timer = setInterval(() => { if (!refreshing) refresh().catch(() => {}); }, 300);
  if (signal?.aborted) await close();
  return { url: origin + prefix + '/', close, refresh };
}
