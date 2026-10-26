import { h, plural, setChildren, crumbs } from '../util.js';
import * as store from '../state.js';
import * as R from '../r.js';
import { loadProblems } from '../data.js';
import { mountExercise } from '../exercise.js';
import { notFound } from './module.js';

const DIFF = { easy: 'Легко', medium: 'Середньо', hard: 'Складно' };
const filt = { diff: 'all', topic: 'all', status: 'all' };

export async function problemsView(root, manifest) {
  const problems = manifest.problems;
  const topics = [...new Set(problems.map((p) => p.topic))];
  const list = h('div', { class: 'prob-table' });
  const summary = h('span', { class: 'muted' });

  const pillRow = (key, items) =>
    h(
      'div',
      { class: 'filters' },
      items.map(([val, label]) => {
        const b = h('button', { class: 'pill' + (filt[key] === val ? ' on' : ''), onclick: () => { filt[key] = val; render(); b.parentElement.querySelectorAll('.pill').forEach((x) => x.classList.remove('on')); b.classList.add('on'); } }, label);
        return b;
      }),
    );

  function render() {
    const rows = problems.filter((p) => (filt.diff === 'all' || p.difficulty === filt.diff) && (filt.topic === 'all' || p.topic === filt.topic) && (filt.status === 'all' || (filt.status === 'done') === store.isDone(p.id)));
    const done = problems.filter((p) => store.isDone(p.id)).length;
    summary.textContent = `Розв’язано ${done} з ${problems.length} · показано ${rows.length}`;
    setChildren(
      list,
      ...rows.map((p) =>
        h(
          'a',
          { class: 'prob-row' + (store.isDone(p.id) ? ' done' : ''), href: `#/p/${p.id}` },
          h('span', { class: 'st' }, store.isDone(p.id) ? '✓' : ''),
          h('b', null, p.title),
          h('span', { class: 'topic' }, p.topic),
          h('span', { class: 'tag ' + p.difficulty }, DIFF[p.difficulty]),
        ),
      ),
      rows.length ? null : h('p', { class: 'muted' }, 'За цими фільтрами задач немає.'),
    );
  }
  const sel = h('select', { class: 'sel', 'aria-label': 'Тема', onchange: (e) => { filt.topic = e.target.value; render(); } }, h('option', { value: 'all' }, 'Усі теми'), topics.map((t) => h('option', { value: t, selected: filt.topic === t }, t)));
  root.replaceChildren(
    h(
      'div',
      { class: 'container' },
      h('h1', null, 'Банк задач'),
      h('p', { class: 'muted' }, 'Окремі задачі від простих до складних на аналіз даних і математичне моделювання. За складніші задачі — більше XP: легкі 15, середні 25, складні 40.'),
      h('div', { class: 'filters' }, pillRow('diff', [['all', 'Усі рівні'], ['easy', 'Легко'], ['medium', 'Середньо'], ['hard', 'Складно']]), sel, pillRow('status', [['all', 'Усі'], ['todo', 'Нерозв’язані'], ['done', 'Розв’язані']])),
      summary,
      h('div', { style: { height: '10px' } }),
      list,
    ),
  );
  render();
}

export async function problemView(root, manifest, id) {
  const all = await loadProblems();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return notFound(root);
  const ex = all[idx];
  R.ensureR().catch(() => {});
  const nextP = all[idx + 1];
  const wrap = h('div');
  root.replaceChildren(
    h(
      'div',
      { class: 'container wide' },
      crumbs(h('a', { href: '#/problems' }, 'Банк задач'), ex.title),
      wrap,
      h('div', { class: 'btn-row', style: { marginTop: '14px', justifyContent: 'space-between' } }, idx > 0 ? h('a', { class: 'btn ghost sm', href: `#/p/${all[idx - 1].id}` }, '← Попередня') : h('span'), nextP ? h('a', { class: 'btn ghost sm', href: `#/p/${nextP.id}` }, 'Наступна →') : null),
    ),
  );
  mountExercise(wrap, ex, { next: nextP ? { href: `#/p/${nextP.id}`, label: 'Наступна задача' } : { href: '#/problems', label: 'До списку задач' } });
}
