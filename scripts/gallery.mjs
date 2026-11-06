import { SHOWCASE } from '../lib/catalog.mjs';
import { readProject } from '../lib/project.mjs';
import path from 'node:path';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
// Visual styles are explicit; genre and story remain in the film descriptions.
const styles = [
  ['storybook', 'Clockwork storybook'], ['science', 'Scientific visualization'], ['kinetic', 'Kinetic typography'],
  ['pixel', 'Pixel art'], ['illustration', 'Illustration'], ['deco', 'Art Deco'],
  ['motion', 'Motion graphics'], ['ink', 'Ink & wash'], ['isometric', 'Isometric'],
  ['paper', 'Paper cutout'], ['math', 'Math visualization']
];
const styleFor = {
  'brass-observatory': 'storybook', 'the-quiet-between': 'science', 'make-room': 'kinetic',
  'one-more-light': 'pixel', 'the-missing-beat': 'illustration', 'moonrise-express': 'deco',
  'neon-relay': 'motion', 'ink-tide': 'ink', 'the-little-lift': 'isometric',
  'paper-garden': 'paper', 'orbit-to-wave': 'math', 'tiny-delivery': 'pixel'
};
export async function galleryMarkup(root) {
  const cards = [], counts = new Map(styles.map(([key]) => [key, 0]));
  for (const film of SHOWCASE) {
    const { data } = await readProject(path.join(root, 'examples', film.slug));
    const key = styleFor[film.slug], style = styles.find(([value]) => value === key)?.[1];
    if (!style) throw new Error('Missing showcase style for ' + film.slug);
    counts.set(key, counts.get(key) + 1);
    const stem = 'media/' + film.slug + '-landscape';
    const remix = film.slug === 'paper-garden'
      ? '<a class="film-remix" href="remix/">Remix this one in your browser <span aria-hidden="true">↗</span></a>' : '';
    cards.push(`<article id="film-${film.slug}" class="film" data-slug="${film.slug}" data-title="${escape(film.title)}" data-style="${key}" data-poster="${film.posterType}" aria-labelledby="film-title-${film.slug}">
      <div class="film-visual"><div class="film-label"><span>${escape(film.title)}</span><span>${data.duration} SEC</span></div>
        <div class="film-player"><video controls playsinline preload="none" poster="${stem}.${film.posterType}" aria-label="${escape(film.title)}, ${data.duration} seconds with original music"><source src="${stem}.mp4" type="video/mp4"></video></div>
        <p class="media-error" role="status" hidden>The video couldn’t load. Open the interactive film below to watch it.</p>
        <div class="film-under"><span class="film-style">${escape(style)}</span><div class="formats" role="group" aria-label="${escape(film.title)} video format" hidden><button type="button" data-format="landscape" aria-pressed="true">Wide <span>16:9</span></button><button type="button" data-format="portrait" aria-pressed="false">Tall <span>9:16</span></button></div></div>
      </div>
      <div class="film-info"><h3 id="film-title-${film.slug}">${escape(film.headline).replaceAll('\n', '<br>')}</h3><p class="film-description">${escape(film.description)}</p>
        <details class="film-details"><summary>Inside this film</summary><p>${escape(film.craft)}</p><p class="film-sound"><span>THE ORIGINAL SCORE</span>${escape(film.sound)}</p></details>
        <div class="film-links">${remix}<a class="film-open" href="play/${film.slug}.html" aria-label="Explore ${escape(film.title)}">Explore the interactive film <span aria-hidden="true">↗</span></a><div><a href="https://github.com/alaaNfissi/Looplilt/tree/main/examples/${film.slug}" aria-label="Get the source for ${escape(film.title)}">Get the source ↗</a><a class="download" href="${stem}.mp4" download aria-label="Download ${escape(film.title)}, wide MP4">Download MP4 ↓</a></div><noscript><p><a href="media/${film.slug}-portrait.mp4" download>Download tall MP4 ↓</a></p></noscript></div>
      </div>
    </article>`);
  }
  const filters = [['all', 'All films', SHOWCASE.length], ...styles.filter(([key]) => counts.get(key) > 0).map(([key, label]) => [key, label, counts.get(key)])];
  const buttons = filters.map(([key, label, count]) => `<button type="button" data-filter="${key}" aria-pressed="${key === 'all'}" aria-controls="film-grid">${escape(label)} <span>${count}</span></button>`).join('');
  return {
    cards: cards.join('\n'),
    index: '<div class="film-toolbar"><div class="film-filters" role="group" aria-label="Filter films by visual style" hidden>' + buttons + '</div><p id="film-count" class="film-count" role="status" aria-live="polite">' + SHOWCASE.length + ' original films · ' + [...counts.values()].filter(Boolean).length + ' visual styles · sound on, when you press play</p></div>'
  };
}
