// A frame depends only on its requested time. Sound is generated only after a gesture.
(() => {
  const canvas = document.querySelector('canvas'), play = document.querySelector('#play');
  const timeline = document.querySelector('#timeline'), clock = document.querySelector('#clock');
  const audio = document.querySelector('audio'), sound = document.querySelector('#sound');
  const status = document.querySelector('#player-status'), shots = document.querySelector('#shots');
  let playing = false, position = 0, origin = 0, request = 0, pendingSound, soundWorker, soundUrl;
  const data = window.loopliltProject, draw = window.loopliltDrawing;
  const { motion, sceneAt, cueTime } = window.loopliltMotion;
  const lastTime = (Math.round(data.duration * data.fps) - 1) / data.fps;
  function render(time) { return window.loopliltRenderLegacy(canvas, data, draw, time, { motion, sceneAt, cueTime }); }
  function display(time) {
    render(time); timeline.value = time;
    timeline.setAttribute('aria-valuetext', time.toFixed(2) + ' of ' + data.duration.toFixed(2) + ' seconds');
    if (parent !== window) parent.postMessage({ type: 'looplilt:position', time }, '*');
    clock.textContent = `${time.toFixed(2)} / ${data.duration.toFixed(2)}s · frame ${Math.min(Math.round(time * data.fps), Math.round(data.duration * data.fps) - 1)}`;
    const shot = sceneAt(data.scenes, Math.min(time, lastTime));
    for (const button of shots.children) button.setAttribute('aria-current', String(button.dataset.scene === shot?.id));
    document.querySelector('#shot-note').textContent = shot ? (shot.description ?? shot.label) : '';
  }
  const now = () => audio.src && !audio.paused && audio.readyState >= 2 ? audio.currentTime : (performance.now() - origin) / 1000;
  function pause() {
    if (playing) position = Math.min(data.duration, now());
    playing = false; cancelAnimationFrame(request); audio.pause(); play.textContent = 'Play';
  }
  function seek(time) {
    pause(); position = Math.max(0, Math.min(data.duration, Number(time) || 0)); display(position);
  }
  function tick() {
    if (!playing) return;
    position = Math.min(data.duration, now());
    try { display(position); } catch (error) { pause(); status.textContent = 'Drawing failed: ' + error.message; return; }
    if (position >= data.duration) { pause(); return; }
    request = requestAnimationFrame(tick);
  }
  function start() {
    if (position >= data.duration) position = 0;
    playing = true; origin = performance.now() - position * 1000; play.textContent = 'Pause';
    if (audio.src) { audio.currentTime = position; audio.play().catch(() => { status.textContent = 'Sound could not start. Toggle sound or press Play again.'; }); }
    tick();
  }
  function prepareSound() {
    if (audio.src || !window.loopliltAudioWorker) return Promise.resolve();
    if (pendingSound) return pendingSound;
    sound.setAttribute('aria-busy', 'true'); status.textContent = 'Preparing the original score locally…';
    pendingSound = new Promise((resolve, reject) => {
      let workerUrl, timer;
      const done = error => {
        clearTimeout(timer); soundWorker?.terminate(); soundWorker = undefined;
        if (workerUrl) URL.revokeObjectURL(workerUrl);
        sound.removeAttribute('aria-busy');
        if (error) { pendingSound = undefined; reject(error); } else resolve();
      };
      try {
        workerUrl = URL.createObjectURL(new Blob([window.loopliltAudioWorker], { type: 'text/javascript' }));
        soundWorker = new Worker(workerUrl);
        timer = setTimeout(() => done(new Error('Score generation exceeded 90 seconds. Try the PCM preview option.')), 90000);
        soundWorker.onerror = event => done(new Error(event.message || 'Audio worker failed'));
        soundWorker.onmessage = ({ data: message }) => {
          if (message.error) { done(new Error(message.error)); return; }
          soundUrl = URL.createObjectURL(new Blob([message.bytes], { type: 'audio/wav' }));
          audio.src = soundUrl; status.textContent = '';
          if (playing) {
            position = Math.min(data.duration, (performance.now() - origin) / 1000);
            audio.currentTime = position;
            audio.play().catch(() => { status.textContent = 'Press Play again to start sound.'; });
          }
          done();
        };
        soundWorker.postMessage({ ...data, score: window.loopliltSoundScore ?? data.score });
      } catch (error) { done(error); }
    });
    return pendingSound;
  }
  play.addEventListener('click', () => playing ? pause() : start());
  timeline.addEventListener('input', () => seek(timeline.value));
  sound.addEventListener('click', () => {
    audio.muted = !audio.muted;
    sound.textContent = audio.muted ? 'Sound off' : 'Sound on';
    sound.setAttribute('aria-pressed', String(!audio.muted));
    if (!audio.muted) prepareSound().catch(error => {
      audio.muted = true; sound.textContent = 'Sound off'; sound.setAttribute('aria-pressed', 'false');
      status.textContent = 'Sound unavailable: ' + error.message;
    });
  });
  document.querySelector('#restart').addEventListener('click', () => seek(0));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  for (const scene of data.scenes ?? []) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = scene.label; button.dataset.scene = scene.id;
    button.addEventListener('click', () => seek(scene.start)); shots.append(button);
  }
  addEventListener('pagehide', () => { pause(); soundWorker?.terminate(); if (soundUrl) URL.revokeObjectURL(soundUrl); });
  addEventListener('message', event => { if (parent !== window && event.source === parent && event.data?.type === 'looplilt:seek' && Number.isFinite(event.data.time)) seek(event.data.time); });
  window.Looplilt = Object.freeze({ render, data, pause, seek, prepareSound, state: () => ({ time: position, playing }) });
  position = Math.max(0, Math.min(data.duration, Number(new URLSearchParams(location.hash.slice(1)).get('t')) || 0));
  display(position);
})();
