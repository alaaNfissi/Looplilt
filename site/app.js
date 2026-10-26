document.querySelectorAll('.film').forEach(article => {
  const video = article.querySelector('video');
  article.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    const format = button.dataset.format;
    video.pause();
    video.src = `media/${article.dataset.slug}-${format}.mp4`;
    video.poster = `media/${article.dataset.slug}-${format}.png`;
    article.querySelector('.film-player').classList.toggle('portrait', format === 'portrait');
    article.querySelector('.download').href = video.src;
    article.querySelectorAll('[data-format]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    video.load();
  }));
});
document.querySelector('#copy').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(document.querySelector('#commands').textContent); status.textContent = 'Copied. Make something move.'; }
  catch { status.textContent = 'Select the commands above to copy them.'; }
});
