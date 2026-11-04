import { SHOWCASE } from '../lib/catalog.mjs';
import { readProject } from '../lib/project.mjs';
import path from 'node:path';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export async function galleryMarkup(root) {
  const cards = [], index = [];
  for (const [i, film] of SHOWCASE.entries()) {
    const { data } = await readProject(path.join(root, 'examples', film.slug));
    const n = String(i + 1).padStart(2, '0'), stem = 'media/' + film.slug + '-landscape';
    index.push('<a href="#film-' + film.slug + '"><span>' + n + '</span>' + escape(film.style) + '</a>');
    cards.push(`<article id="film-${film.slug}" class="film" data-slug="${film.slug}" data-poster="${film.posterType}">
      <div class="film-visual"><div class="film-label"><span>LOOPLILT ORIGINAL / ${n}</span><span>${data.duration} SEC · ${data.fps} FPS</span></div>
        <div class="film-player"><video controls playsinline preload="none" poster="${stem}.${film.posterType}" aria-label="${escape(film.title)}, ${data.duration} seconds with original music"><source src="${stem}.mp4" type="video/mp4"></video></div>
        <div class="film-under"><span>${escape(film.craft)}</span><div class="formats" role="group" aria-label="${escape(film.title)} video format"><button type="button" data-format="landscape" aria-pressed="true">Wide <span>16:9</span></button><button type="button" data-format="portrait" aria-pressed="false">Tall <span>9:16</span></button></div></div>
      </div>
      <div class="film-info"><p class="eyebrow">${n} / ${escape(film.style.toUpperCase())}</p><h3>${escape(film.headline).replaceAll('\n', '<br>')}</h3><p>${escape(film.description)}</p><p class="film-sound"><span>THE SCORE</span>${escape(film.sound)}</p>
        <div class="film-links"><a class="film-open" href="play/${film.slug}.html">Explore ${escape(film.title)} <span aria-hidden="true">↗</span></a><div><a href="https://github.com/alaaNfissi/Looplilt/tree/main/examples/${film.slug}">Get the source ↗</a><a class="download" href="${stem}.mp4" download>Download MP4 ↓</a></div></div>
      </div>
    </article>`);
  }
  return { cards: cards.join('\n'), index: '<nav class="film-index" aria-label="Jump to a film style">' + index.join('') + '</nav>' };
}
