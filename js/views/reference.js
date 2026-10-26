import { h } from '../util.js';
import { loadReference } from '../data.js';
import { mountMarkdown } from '../components.js';
import * as R from '../r.js';

export async function referenceView(root) {
  const ref = await loadReference();
  R.ensureR().catch(() => {});
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Пошук: mean, фактор, регресія, цикл …', 'aria-label': 'Пошук у довіднику', oninput: filter });
  const holder = h('div');
  const entries = [];
  ref.forEach((sec) => {
    const head = h('div', { class: 'ref-cat' }, h('h2', { style: { margin: 0 } }, sec.title));
    const grid = h('div', { class: 'ref-grid' });
    sec.entries.forEach((e) => {
      const body = h('div', { class: 'prose' });
      const card = h('div', { class: 'ref-entry' }, h('div', { class: 'card' }, h('h4', null, e.title), body));
      grid.append(card);
      entries.push({ card, text: (e.title + ' ' + e.md).toLowerCase(), sec: head, grid, body, md: e.md, mounted: false });
    });
    holder.append(head, grid);
  });
  function mount(e) {
    if (e.mounted) return;
    e.mounted = true;
    mountMarkdown(e.body, e.md, { session: 'ref' });
  }
  function filter() {
    const q = search.value.trim().toLowerCase();
    const showSec = new Set();
    entries.forEach((e) => {
      const ok = !q || e.text.includes(q);
      e.card.classList.toggle('hidden', !ok);
      if (ok) showSec.add(e.grid);
    });
    holder.querySelectorAll('.ref-cat').forEach((c, i) => {
      const grid = c.nextElementSibling;
      c.classList.toggle('hidden', !showSec.has(grid));
      grid.classList.toggle('hidden', !showSec.has(grid));
    });
  }
  root.replaceChildren(h('div', { class: 'container wide' }, h('h1', null, 'Довідник синтаксису R'), h('p', { class: 'muted' }, 'Стисла шпаргалка з прикладами, які можна запускати й змінювати. Усі змінні довідника спільні між прикладами.'), search, holder));
  // ліниве монтування, щоб не створювати сотні редакторів одразу
  const io = new IntersectionObserver((items) => items.forEach((it) => { if (it.isIntersecting) { const e = entries.find((x) => x.card === it.target); if (e) { mount(e); io.unobserve(it.target); } } }), { rootMargin: '300px' });
  entries.forEach((e) => io.observe(e.card));
}
