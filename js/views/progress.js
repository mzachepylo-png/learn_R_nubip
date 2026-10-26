import { h, download, toast, plural, pct } from '../util.js';
import * as store from '../state.js';
import { moduleStats } from './home.js';

export function progressView(root, manifest) {
  const xp = store.totalXP();
  const rank = store.rankInfo(xp);
  const allEx = manifest.modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises));
  const doneEx = allEx.filter((e) => store.isDone(e.id)).length;
  const probDone = manifest.problems.filter((p) => store.isDone(p.id)).length;
  const earned = store.earnedBadges();
  store.awardBadges(manifest);

  // теплова карта за 15 тижнів
  const days = store.days();
  const cells = [];
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 15 + 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // понеділок
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const n = days[store.today(d)] || 0;
    cells.push(h('i', { class: n >= 6 ? 'l3' : n >= 3 ? 'l2' : n >= 1 ? 'l1' : '', title: `${store.today(d)}: ${n}` }));
  }

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: onImport });
  async function onImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      store.importJSON(await f.text());
      toast('Прогрес імпортовано ✔', 'ok');
      progressView(root, manifest);
    } catch (err) {
      alert('Не вдалося імпортувати: ' + err.message);
    }
  }

  const modRows = manifest.modules.map((m, i) => {
    const s = moduleStats(m);
    const p = pct(s.done, s.total);
    return h('a', { class: 'lesson-row ' + (p === 100 ? 'done' : s.done ? 'part' : ''), href: `#/m/${m.id}`, style: { '--mc': m.color } }, h('div', { class: 'idx' }, p === 100 ? '✓' : m.icon), h('div', { class: 'body' }, h('b', null, `${i + 1}. ${m.title}`), h('div', { class: 'progress', style: { marginTop: '6px' } }, h('i', { style: { width: p + '%' } }))), h('div', { class: 'right' }, `${s.done}/${s.total}`));
  });

  const badges = store.BADGES(manifest).map((b) => h('div', { class: 'badge' + (earned[b.id] ? ' on' : ''), title: b.desc }, h('div', { class: 'em' }, b.em), h('b', null, b.title), h('span', null, b.desc)));

  root.replaceChildren(
    h(
      'div',
      { class: 'container' },
      h('h1', null, 'Мій прогрес'),
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, String(xp)), h('span', null, 'XP')),
        h('div', { class: 'stat' }, h('b', null, rank.name), h('span', null, rank.next ? `до «${rank.next}»: ${rank.to - xp} XP` : 'максимальний ранг'), h('div', { class: 'progress rank-bar' }, h('i', { style: { width: Math.round(rank.progress * 100) + '%' } }))),
        h('div', { class: 'stat' }, h('b', null, `${doneEx}/${allEx.length}`), h('span', null, 'завдань курсу')),
        h('div', { class: 'stat' }, h('b', null, `${probDone}/${manifest.problems.length}`), h('span', null, 'задач з банку')),
        h('div', { class: 'stat' }, h('b', null, `${store.streak()} 🔥`), h('span', null, 'днів поспіль')),
      ),
      h('div', { class: 'section-title' }, h('h2', null, 'Активність'), h('span', { class: 'muted' }, 'останні 15 тижнів')),
      h('div', { class: 'card' }, h('div', { class: 'heat' }, cells)),
      h('div', { class: 'section-title' }, h('h2', null, 'Модулі')),
      h('div', { class: 'lesson-list' }, modRows),
      h('div', { class: 'section-title' }, h('h2', null, 'Досягнення'), h('span', { class: 'muted' }, `${Object.keys(store.earnedBadges()).length} з ${store.BADGES(manifest).length}`)),
      h('div', { class: 'badges' }, badges),
      h('div', { class: 'section-title' }, h('h2', null, 'Дані та резервна копія')),
      h(
        'div',
        { class: 'card' },
        h('p', null, 'Прогрес зберігається лише в цьому браузері (localStorage). Щоб перенести його на інший пристрій або зробити резервну копію — експортуйте у файл та імпортуйте там.'),
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn primary', onclick: () => download(`r-progress-${store.today()}.json`, store.exportJSON(), 'application/json') }, '⬇ Експортувати прогрес'),
          h('button', { class: 'btn', onclick: () => fileInput.click() }, '⬆ Імпортувати з файлу'),
          fileInput,
          h('button', { class: 'btn danger', onclick: () => { if (confirm('Видалити весь прогрес без можливості відновлення?')) { store.resetAll(); toast('Прогрес скинуто'); progressView(root, manifest); } } }, '🗑 Скинути все'),
        ),
      ),
    ),
  );
}
