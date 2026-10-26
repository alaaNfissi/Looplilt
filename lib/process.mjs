import { spawn } from 'node:child_process';

export function run(command, args, { timeout = 120000, maxOutput = 2 * 1024 * 1024, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '', stderr = '', settled = false;
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve({ stdout, stderr });
    };
    const timer = setTimeout(() => { child.kill(); finish(new Error(`${command} exceeded ${timeout / 1000}s`)); }, timeout);
    function collect(chunk, which) {
      if (which === 'out') stdout += chunk; else stderr += chunk;
      if (stdout.length + stderr.length > maxOutput) { child.kill(); finish(new Error(`${command} produced too much output`)); }
    }
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => collect(chunk, 'out'));
    child.stderr.on('data', chunk => collect(chunk, 'err'));
    child.on('error', error => finish(new Error(`Cannot start ${command}: ${error.message}`)));
    child.on('close', code => finish(code === 0 ? null : new Error(`${command} exited ${code}\n${stderr.slice(-6000)}`)));
  });
}
