const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('#hero-video');
const toggle = document.querySelector('#hero-toggle');
const sound = document.querySelector('#hero-sound');
const seek = document.querySelector('#hero-seek');
const clock = document.querySelector('#hero-time');
const films = {
  'one-more-light': { title: 'One More Light', kind: 'PIXEL ART / ADVENTURE', duration: 40 },
  'the-missing-beat': { title: 'The Missing Beat', kind: 'ILLUSTRATION / COMEDY', duration: 36 },
  'paper-garden': { title: 'Pocket greenhouse', kind: 'PAPER CUTOUT / STARTER', duration: 16 }
};
const articles = [...document.querySelectorAll('.film')];
const filterButtons = [...document.querySelectorAll('[data-filter]')];
let activePreview = 'one-more-light';
let previewWanted = !reducedMotion.matches && !navigator.connection?.saveData;
let previewVisible = true;
let previewVersion = 0;

document.querySelectorAll('.preview-controls, .preview-picker, .film-filters, .formats, #hero-sound, #copy, #copy-prompt').forEach(element => { element.hidden = false; });
hero.controls = false;
const stamp = value => {
  const seconds = Math.floor(Number.isFinite(value) ? value : 0);
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
};
function syncSound() {
  sound.setAttribute('aria-pressed', String(!hero.muted));
  sound.setAttribute('aria-label', hero.muted ? 'Turn preview sound on' : 'Turn preview sound off');
  document.querySelector('#hero-sound-label').textContent = hero.muted ? 'Sound off' : 'Sound on';
  hero.setAttribute('aria-label', (hero.muted ? 'Silent preview of ' : 'Preview with music of ') + films[activePreview].title);
}
function syncPreview() {
  const duration = Number.isFinite(hero.duration) ? hero.duration : films[activePreview].duration;
  seek.max = duration;
  seek.value = hero.currentTime;
  seek.setAttribute('aria-valuetext', hero.currentTime.toFixed(1) + ' of ' + duration.toFixed(0) + ' seconds');
  clock.textContent = stamp(hero.currentTime) + ' / ' + stamp(duration);
  toggle.setAttribute('aria-label', hero.paused ? 'Play preview' : 'Pause preview');
  toggle.firstElementChild.textContent = hero.paused ? '▶' : 'Ⅱ';
}
function shouldPlayPreview() {
  return previewWanted && previewVisible && !document.hidden && !hero.error
    && !articles.some(article => !article.querySelector('video').paused);
}
async function applyPlayback() {
  const version = previewVersion;
  if (shouldPlayPreview()) {
    try {
      await hero.play();
      if (version !== previewVersion || !shouldPlayPreview()) hero.pause();
    } catch { /* Native playback remains available when a browser requires another gesture. */ }
  } else hero.pause();
  syncPreview();
}
toggle.addEventListener('click', () => {
  previewWanted = hero.paused;
  if (previewWanted) articles.forEach(article => article.querySelector('video').pause());
  applyPlayback();
});
sound.addEventListener('click', () => {
  hero.muted = !hero.muted;
  syncSound();
  if (!hero.muted && hero.paused) {
    articles.forEach(article => article.querySelector('video').pause());
    previewWanted = true; applyPlayback();
  }
});
hero.addEventListener('volumechange', syncSound);
seek.addEventListener('input', () => {
  if (hero.readyState > 0) hero.currentTime = Number(seek.value);
  syncPreview();
});
['timeupdate', 'loadedmetadata', 'play', 'pause', 'emptied'].forEach(event => hero.addEventListener(event, syncPreview));
hero.addEventListener('error', () => {
  document.querySelector('#hero-error').hidden = false;
  syncPreview();
});
document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  previewVersion += 1;
  activePreview = button.dataset.preview;
  const film = films[activePreview];
  hero.pause();
  hero.poster = 'media/' + activePreview + '-landscape.png';
  hero.src = 'media/' + activePreview + '-landscape.mp4';
  document.querySelector('#hero-name').textContent = film.title;
  document.querySelector('#hero-name').href = '#film-' + activePreview;
  document.querySelector('#hero-kind').textContent = film.kind;
  document.querySelector('#hero-error').hidden = true;
  document.querySelector('#hero-error a').href = 'play/' + activePreview + '.html';
  document.querySelectorAll('[data-preview]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  syncSound();
  hero.load();
  applyPlayback();
}));
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) previewWanted = false;
  applyPlayback();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) articles.forEach(article => article.querySelector('video').pause());
  applyPlayback();
});
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    previewVisible = entries[0].isIntersecting;
    applyPlayback();
  }, { threshold: 0.1 }).observe(hero);
}

articles.forEach(article => {
  const video = article.querySelector('video');
  const error = article.querySelector('.media-error');
  let formatVersion = 0;
  video.addEventListener('play', () => {
    hero.pause();
    articles.forEach(other => { if (other !== article) other.querySelector('video').pause(); });
  });
  video.addEventListener('error', () => { error.hidden = false; });
  video.addEventListener('loadeddata', () => { error.hidden = true; });
  article.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const version = ++formatVersion, time = video.currentTime;
    const format = button.dataset.format, filename = article.dataset.slug + '-' + format + '.mp4';
    video.pause();
    video.src = 'media/' + filename;
    video.poster = 'media/' + article.dataset.slug + '-' + format + '.' + article.dataset.poster;
    article.querySelector('.film-player').classList.toggle('portrait', format === 'portrait');
    const download = article.querySelector('.download');
    download.href = video.src;
    download.download = filename;
    download.setAttribute('aria-label', 'Download ' + article.dataset.title + ', ' + (format === 'portrait' ? 'tall' : 'wide') + ' MP4');
    article.querySelectorAll('[data-format]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    error.hidden = true;
    video.addEventListener('loadedmetadata', () => {
      if (version === formatVersion && Number.isFinite(video.duration)) video.currentTime = Math.min(time, Math.max(0, video.duration - 0.1));
    }, { once: true });
    video.load();
  }));
});

function filterFilms(key) {
  const selected = filterButtons.find(button => button.dataset.filter === key);
  if (!selected) return;
  let count = 0;
  articles.forEach(article => {
    const visible = key === 'all' || article.dataset.style === key;
    if (!visible) article.querySelector('video').pause();
    article.hidden = !visible;
    if (visible) count += 1;
  });
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
  const label = selected.firstChild.textContent.trim();
  document.querySelector('#film-count').textContent = key === 'all'
    ? articles.length + ' original films · 8 visual styles · sound on, when you press play'
    : count + (count === 1 ? ' film' : ' films') + ' · ' + label + ' · original music included';
}
filterButtons.forEach(button => button.addEventListener('click', () => filterFilms(button.dataset.filter)));
function revealLinkedFilm(hash = location.hash) {
  const target = document.getElementById(hash.slice(1));
  if (target?.classList.contains('film') && target.hidden) {
    filterFilms('all');
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}
window.addEventListener('hashchange', () => revealLinkedFilm());
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#film-"]');
  if (link) revealLinkedFilm(link.getAttribute('href'));
});
revealLinkedFilm();

document.querySelector('#copy').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status'), commands = document.querySelector('#commands');
  try {
    await navigator.clipboard.writeText(commands.textContent);
    status.textContent = 'Copied. Paste into your terminal in a new workspace folder.';
    document.querySelector('#copy').textContent = 'Copied ✓';
  } catch {
    const selection = getSelection(), range = document.createRange();
    range.selectNodeContents(commands); selection.removeAllRanges(); selection.addRange(range);
    status.textContent = 'Commands selected. Use your device’s copy command.';
  }
});
document.querySelector('#copy-prompt').addEventListener('click', async () => {
  const prompt = document.querySelector('#installation-prompt'), status = document.querySelector('#prompt-status');
  try {
    await navigator.clipboard.writeText(prompt.value);
    status.textContent = 'Copied. Paste it into your coding agent’s workspace to begin.';
    document.querySelector('#copy-prompt').textContent = 'Copied ✓';
  } catch {
    prompt.closest('details').open = true;
    prompt.focus(); prompt.select();
    status.textContent = 'Prompt selected. Use your device’s copy command.';
  }
});
syncSound();
syncPreview();
applyPlayback();
