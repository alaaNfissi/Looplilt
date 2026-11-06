import { spawn } from 'node:child_process';

// input is an iterable of byte chunks. Each write completes before the next is requested.
export function run(command, args, { timeout = 120000, maxOutput = 2 * 1024 * 1024, cwd, signal, input } = {}) {
  signal?.throwIfAborted();
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Process timeout must be positive');
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '', stderr = '', failure, settled = false, force;
    const stop = error => {
      if (settled || failure) return;
      failure = error instanceof Error ? error : new Error(String(error));
      child.stdin?.destroy(); child.kill();
      force = setTimeout(() => { if (!settled) child.kill('SIGKILL'); }, 1000);
      force.unref();
    };
    const abort = () => stop(signal.reason ?? new Error('Operation cancelled'));
    const timer = setTimeout(() => stop(new Error(command + ' exceeded ' + timeout / 1000 + 's')), timeout);
    const finish = code => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(force); signal?.removeEventListener('abort', abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(command + ' exited ' + code + '\n' + stderr.slice(-6000)));
      else resolve({ stdout, stderr });
    };
    function collect(chunk, which) {
      if (which === 'out') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > maxOutput) stop(new Error(command + ' produced too much output'));
    }
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => collect(chunk, 'out'));
    child.stderr.on('data', chunk => collect(chunk, 'err'));
    child.on('error', error => { failure ??= new Error('Cannot start ' + command + ': ' + error.message); });
    child.on('close', finish);
    child.stdin?.on('error', error => stop(error));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    if (input) (async () => {
      try {
        for await (const chunk of input) {
          if (failure || settled) break;
          if (!(chunk instanceof Uint8Array)) throw new Error('Process input must contain byte chunks');
          await new Promise((done, fail) => child.stdin.write(chunk, error => error ? fail(error) : done()));
        }
        if (!failure && !settled) child.stdin.end();
      } catch (error) { stop(error); }
    })();
  });
}
