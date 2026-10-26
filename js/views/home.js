import { h, plural, pct } from '../util.js';
import * as store from '../state.js';
import { flatSteps } from '../data.js';

export function nextTarget(manifest) {
  const steps = flatSteps(manifest);
  const last = store.getLast();
  // перше невиконане завдання в порядку курсу
  const firstOpen = steps.find((s) => s.id && !store.isDone(s.id));
  if (!firstOpen) return null;
  if (last) {
    const ls = manifest.modules.flatMap((m) => m.lessons).find((l) => l.id === last.lesson);
    if (ls && ls.exercises.some((e) => !store.isDone(e.id))) return { lesson: last.lesson, step: last.step, resume: true };
  }
  const started = firstOpen.lesson.exercises.some((e) => store.isDone(e.id));
  return { lesson: firstOpen.lesson.id, step: started ? firstOpen.step : 0, resume: started };
}

export function moduleStats(m) {
  const all = m.lessons.flatMap((l) => l.exercises);
  const done = all.filter((e) => store.isDone(e.id)).length;
  const lessonsDone = m.lessons.filter((l) => l.exercises.every((e) => store.isDone(e.id))).length;
  return { total: all.length, done, lessonsDone, lessons: m.lessons.length };
}

export function homeView(root, manifest) {
  const xp = store.totalXP();
  const rank = store.rankInfo(xp);
  const allEx = manifest.modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises));
  const doneEx = allEx.filter((e) => store.isDone(e.id)).length;
  const lessons = manifest.modules.flatMap((m) => m.lessons);
  const lessonsDone = lessons.filter((l) => l.exercises.every((e) => store.isDone(e.id))).length;
  const target = nextTarget(manifest);
  const started = doneEx > 0 || store.getLast();

  const cta = target
    ? h('a', { class: 'btn primary', href: `#/l/${target.lesson}/${target.step}` }, started ? 'Продовжити навчання →' : 'Почати курс →')
    : h('a', { class: 'btn primary', href: '#/problems' }, 'Курс пройдено — до задач →');

  const hero = h(
    'section',
    { class: 'hero' },
    h('h1', null, 'Вивчайте R з нуля — прямо в браузері'),
    h('p', null, 'Інтерактивний курс з аналізу даних і математичного моделювання: короткі конспекти, код, який можна запускати одразу, завдання з автоперевіркою та збереженням прогресу. Нічого встановлювати не потрібно.'),
    h('div', { class: 'btn-row', style: { marginTop: '16px' } }, cta, h('a', { class: 'btn ghost', href: '#/play' }, 'Відкрити пісочницю'), h('a', { class: 'btn ghost', href: '#/problems' }, 'Банк задач')),
  );

  const stats = h(
    'div',
    { class: 'stats' },
    stat(String(xp), 'балів досвіду (XP)'),
    stat(rank.name, rank.next ? `ще ${rank.to - xp} XP до рангу «${rank.next}»` : 'найвищий ранг'),
    stat(`${doneEx}/${allEx.length}`, plural(doneEx, 'завдання виконано', 'завдання виконано', 'завдань виконано')),
    stat(`${lessonsDone}/${lessons.length}`, 'уроків завершено'),
    stat(`${store.streak()} 🔥`, 'днів поспіль'),
  );

  const cards = manifest.modules.map((m, idx) => {
    const s = moduleStats(m);
    const p = pct(s.done, s.total);
    return h(
      'a',
      { class: 'card', href: `#/m/${m.id}`, style: { '--mc': m.color } },
      h('div', { class: 'card-head' }, h('div', { class: 'mod-ico' }, m.icon), h('div', null, h('div', { class: 'num' }, `Модуль ${idx + 1}`), h('h3', null, m.title))),
      h('p', null, m.blurb),
      h('div', { class: 'progress' + (p === 100 ? ' done' : '') }, h('i', { style: { width: p + '%' } })),
      h('div', { class: 'meta' }, h('span', null, `${s.lessonsDone}/${s.lessons} ${plural(s.lessons, 'урок', 'уроки', 'уроків')}`), p === 100 ? h('span', { class: 'badge-done' }, '✓ Пройдено') : h('span', null, `${s.done}/${s.total} завдань`)),
    );
  });

  const how = h(
    'div',
    { class: 'grid', style: { marginTop: '8px' } },
    info('📖', 'Конспект і живі приклади', 'Кожен урок починається з короткої теорії. Приклади коду можна редагувати та запускати тут же.'),
    info('✅', 'Завдання з автоперевіркою', 'Пишіть код у редакторі й натискайте «Перевірити». Підказки та еталонні розв’язки — на випадок, якщо застрягли.'),
    info('📈', 'Прогрес зберігається', 'Результати лишаються у вашому браузері. Їх можна експортувати у файл і перенести на інший пристрій.'),
  );

  root.replaceChildren(
    h(
      'div',
      { class: 'container' },
      hero,
      stats,
      h('div', { class: 'section-title' }, h('h2', null, 'Програма курсу'), h('span', { class: 'muted' }, `${manifest.modules.length} ${plural(manifest.modules.length, 'модуль', 'модулі', 'модулів')} · ${lessons.length} ${plural(lessons.length, 'урок', 'уроки', 'уроків')} · ${allEx.length} ${plural(allEx.length, 'завдання', 'завдання', 'завдань')}`)),
      h('div', { class: 'grid' }, cards),
      h('div', { class: 'section-title' }, h('h2', null, 'Як це працює')),
      how,
    ),
  );
}

const stat = (b, s) => h('div', { class: 'stat' }, h('b', null, b), h('span', null, s));
const info = (ico, t, p) => h('div', { class: 'card' }, h('div', { class: 'mod-ico' }, ico), h('h3', null, t), h('p', null, p));
