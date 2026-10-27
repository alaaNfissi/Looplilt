const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('#hero-video');
const toggle = document.querySelector('#hero-toggle');
const seek = document.querySelector('#hero-seek');
const clock = document.querySelector('#hero-time');
const films = {
  'paper-garden': ['Pocket greenhouse', 'PAPER WORLD / 01'],
  'orbit-to-wave': ['One motion. Two views.', 'VISUAL EXPLANATION / 02'],
  'tiny-delivery': ['Tiny delivery', 'PIXEL COMEDY / 03']
};
let previewWanted = !reducedMotion.matches;
let previewVisible = true;
let previewVersion = 0;
const stamp = value => '00:' + String(Math.floor(Number.isFinite(value) ? value : 0)).padStart(2, '0');
function syncPreview() {
  const duration = Number.isFinite(hero.duration) ? hero.duration : 16;
  seek.max = duration;
  seek.value = hero.currentTime;
  seek.setAttribute('aria-valuetext', hero.currentTime.toFixed(1) + ' of ' + duration.toFixed(0) + ' seconds');
  clock.textContent = stamp(hero.currentTime) + ' / ' + stamp(duration);
  toggle.setAttribute('aria-label', hero.paused ? 'Play preview' : 'Pause preview');
  toggle.firstElementChild.textContent = hero.paused ? '▶' : 'Ⅱ';
}
async function applyPlayback() {
  const filmPlaying = [...document.querySelectorAll('.film video')].some(video => !video.paused);
  if (previewWanted && previewVisible && !document.hidden && !filmPlaying) {
    try { await hero.play(); } catch { /* Browser policy can require a press of Play. */ }
  } else hero.pause();
  syncPreview();
}
toggle.addEventListener('click', () => {
  previewWanted = hero.paused;
  applyPlayback();
});
seek.addEventListener('input', () => {
  if (hero.readyState > 0) hero.currentTime = Number(seek.value);
  syncPreview();
});
['timeupdate', 'loadedmetadata', 'play', 'pause', 'emptied'].forEach(event => hero.addEventListener(event, syncPreview));
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', async () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const version = ++previewVersion;
  const slug = button.dataset.preview;
  hero.pause();
  hero.poster = 'media/' + slug + '-landscape.png';
  hero.src = 'media/' + slug + '-landscape.mp4';
  hero.setAttribute('aria-label', 'Silent preview of ' + films[slug][0]);
  document.querySelector('#hero-name').textContent = films[slug][0];
  document.querySelector('#hero-kind').textContent = films[slug][1];
  document.querySelectorAll('[data-preview]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  hero.load();
  if (version === previewVersion) await applyPlayback();
}));
reducedMotion.addEventListener('change', () => {
  previewWanted = !reducedMotion.matches;
  applyPlayback();
});
document.addEventListener('visibilitychange', applyPlayback);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    previewVisible = entries[0].isIntersecting;
    applyPlayback();
  }, { threshold: 0.1 }).observe(hero);
}
document.querySelectorAll('.film').forEach(article => {
  const video = article.querySelector('video');
  video.addEventListener('play', () => {
    hero.pause();
    document.querySelectorAll('.film video').forEach(other => { if (other !== video) other.pause(); });
  });
  article.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const format = button.dataset.format;
    video.pause();
    video.src = 'media/' + article.dataset.slug + '-' + format + '.mp4';
    video.poster = 'media/' + article.dataset.slug + '-' + format + '.png';
    article.querySelector('.film-player').classList.toggle('portrait', format === 'portrait');
    article.querySelector('.download').href = video.src;
    article.querySelectorAll('[data-format]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    video.load();
  }));
});
document.querySelector('#copy').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(document.querySelector('#commands').textContent);
    status.textContent = 'Copied. Go make something move.';
    document.querySelector('#copy').textContent = 'Copied ✓';
  } catch { status.textContent = 'Select the commands above to copy them.'; }
});
syncPreview();
applyPlayback();
