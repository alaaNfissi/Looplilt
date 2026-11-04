import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

// Local-only static server shared by browser checks; no production server is required.
export async function serveSite(directory, { basePath = '' } = {}) {
  if (basePath && !/^\/[a-zA-Z0-9_-]+$/.test(basePath)) throw new Error('Invalid test base path');
  const root = path.resolve(directory);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain' };
  const server = http.createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (basePath) {
        if (!pathname.startsWith(basePath + '/')) { response.writeHead(404).end(); return; }
        pathname = pathname.slice(basePath.length);
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
      const data = await fs.readFile(file), headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
      if (request.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range), start = match ? Number(match[1]) : -1;
        const end = match?.[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
        if (start < 0 || start > end) { response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
        response.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${data.length}` }).end(data.subarray(start, end + 1));
      } else response.writeHead(200, { ...headers, 'Content-Length': data.length }).end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}${basePath}`, close: () => new Promise(resolve => server.close(resolve)) };
}
