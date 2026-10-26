import { h, plural, pct, crumbs } from '../util.js';
import * as store from '../state.js';
import { moduleStats } from './home.js';

export function moduleView(root, manifest, modId) {
  const idx = manifest.modules.findIndex((m) => m.id === modId);
  if (idx < 0) return notFound(root);
  const m = manifest.modules[idx];
  const s = moduleStats(m);
  const p = pct(s.done, s.total);
  const rows = m.lessons.map((l, i) => {
    const d = l.exercises.filter((e) => store.isDone(e.id)).length;
    const cls = d === l.exercises.length ? 'done' : d > 0 ? 'part' : '';
    return h(
      'a',
      { class: 'lesson-row ' + cls, href: `#/l/${l.id}/${d > 0 && d < l.exercises.length ? d + 1 : 0}` },
      h('div', { class: 'idx' }, cls === 'done' ? '✓' : String(i + 1)),
      h('div', { class: 'body' }, h('b', null, l.title), h('span', null, l.summary)),
      h('div', { class: 'right' }, `${d}/${l.exercises.length} ${plural(l.exercises.length, 'завдання', 'завдання', 'завдань')}`),
    );
  });
  root.replaceChildren(
    h(
      'div',
      { class: 'container' },
      crumbs(h('a', { href: '#/' }, 'Курс'), `Модуль ${idx + 1}`),
      h('div', { class: 'card-head', style: { '--mc': m.color, marginBottom: '8px' } }, h('div', { class: 'mod-ico' }, m.icon), h('div', null, h('h1', { style: { margin: 0 } }, m.title), h('p', { class: 'muted', style: { margin: 0 } }, m.blurb))),
      h('div', { class: 'progress' + (p === 100 ? ' done' : ''), style: { '--mc': m.color, margin: '14px 0 22px' } }, h('i', { style: { width: p + '%' } })),
      h('div', { class: 'lesson-list' }, rows),
      h('div', { class: 'btn-row', style: { marginTop: '22px' } }, idx > 0 ? h('a', { class: 'btn', href: `#/m/${manifest.modules[idx - 1].id}` }, '← ' + manifest.modules[idx - 1].title) : null, idx < manifest.modules.length - 1 ? h('a', { class: 'btn', href: `#/m/${manifest.modules[idx + 1].id}` }, manifest.modules[idx + 1].title + ' →') : null),
    ),
  );
}

export function notFound(root) {
  root.replaceChildren(h('div', { class: 'container' }, h('div', { class: 'loader-screen' }, h('h2', null, 'Сторінку не знайдено'), h('a', { class: 'btn primary', href: '#/' }, 'На головну'))));
}
