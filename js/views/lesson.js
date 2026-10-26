import { h, plural, crumbs } from '../util.js';
import * as store from '../state.js';
import * as R from '../r.js';
import { loadLesson, lessonLocation, nextLesson } from '../data.js';
import { mountMarkdown } from '../components.js';
import { mountExercise } from '../exercise.js';
import { notFound } from './module.js';

export async function lessonView(root, manifest, lessonId, stepStr) {
  const loc = lessonLocation(manifest, lessonId);
  if (!loc) return notFound(root);
  const lesson = await loadLesson(lessonId);
  const n = lesson.exercises.length;
  let step = parseInt(stepStr || '0', 10);
  if (!(step >= 0)) step = 0;
  if (step > n + 1) step = n + 1;
  store.setLast(lessonId, Math.min(step, n));
  R.ensureR().catch(() => {});

  const base = `#/l/${lessonId}/`;
  const pills = [
    h('a', { class: 'step' + (step === 0 ? ' current' : ''), href: base + '0', title: 'Конспект' }, '📖'),
    ...lesson.exercises.map((e, i) =>
      h('a', { class: 'step' + (store.isDone(e.id) ? ' done' : '') + (step === i + 1 ? ' current' : ''), href: base + (i + 1), title: e.title }, e.type === 'quiz' ? '?' : String(i + 1)),
    ),
  ];
  const head = h(
    'div',
    null,
    crumbs(h('a', { href: '#/' }, 'Курс'), h('a', { href: `#/m/${loc.module.id}` }, loc.module.title), lesson.title),
    h('div', { class: 'lesson-head' }, h('h1', null, lesson.title), h('div', { class: 'steps', role: 'navigation', 'aria-label': 'Кроки уроку' }, pills)),
  );
  const body = h('div');
  root.replaceChildren(h('div', { class: 'container wide' }, head, body));

  if (step === 0) renderTheory(body, lesson, base);
  else if (step <= n) {
    const ex = lesson.exercises[step - 1];
    const isLast = step === n;
    const nextHref = base + (step + 1);
    mountExercise(body, ex, {
      next: { href: nextHref, label: isLast ? 'Завершити урок' : 'Наступне завдання' },
      onSolved: () => {
        pills[step].classList.add('done');
      },
    });
    body.append(
      h('div', { class: 'btn-row', style: { marginTop: '14px', justifyContent: 'space-between' } }, h('a', { class: 'btn ghost sm', href: base + (step - 1) }, '← ' + (step === 1 ? 'Конспект' : 'Попереднє')), isLast ? null : h('a', { class: 'btn ghost sm', href: nextHref }, 'Пропустити →')),
    );
  } else renderComplete(body, manifest, lesson, base);
}

function renderTheory(body, lesson, base) {
  const prose = h('div', { class: 'prose' });
  const card = h('article', { class: 'pane theory' }, h('div', { class: 'pane-body theory-card' }, prose));
  body.append(card);
  mountMarkdown(prose, lesson.theory, { session: 'th-' + lesson.id });
  const first = lesson.exercises.findIndex((e) => !store.isDone(e.id));
  const n = lesson.exercises.length;
  const go = first < 0 ? 1 : first + 1;
  prose.append(
    h(
      'div',
      { class: 'btn-row', style: { marginTop: '24px' } },
      h('a', { class: 'btn primary', id: 'to-tasks', href: base + go }, first <= 0 ? `Перейти до завдань (${n}) →` : `Продовжити з завдання ${go} →`),
      h('button', { class: 'btn ghost', onclick: () => R.resetSession('th-' + lesson.id).then(() => alert('Змінні прикладів очищено.')).catch(() => {}) }, '↺ Очистити змінні прикладів'),
    ),
  );
}

function renderComplete(body, manifest, lesson, base) {
  const nxt = nextLesson(manifest, lesson.id);
  const xp = lesson.exercises.reduce((a, e) => a + (store.getDone(e.id)?.xp || 0), 0);
  const doneN = lesson.exercises.filter((e) => store.isDone(e.id)).length;
  const all = doneN === lesson.exercises.length;
  body.append(
    h(
      'div',
      { class: 'pane celebrate', style: { maxWidth: '640px', margin: '20px auto' } },
      h('div', { class: 'big' }, all ? '🎉' : '👍'),
      h('h2', null, all ? `Урок «${lesson.title}» пройдено!` : `Виконано ${doneN} з ${lesson.exercises.length}`),
      h('p', { class: 'muted' }, all ? `Ви заробили ${xp} XP в цьому уроці.` : 'Поверніться до пропущених завдань, щоб завершити урок.'),
      h(
        'div',
        { class: 'btn-row', style: { justifyContent: 'center' } },
        nxt ? h('a', { class: 'btn success', href: `#/l/${nxt.id}/0`, id: 'next-lesson' }, `Наступний урок: ${nxt.title} →`) : h('a', { class: 'btn success', href: '#/problems' }, 'До банку задач →'),
        h('a', { class: 'btn', href: base + '0' }, 'Повторити конспект'),
        h('a', { class: 'btn ghost', href: '#/progress' }, 'Мій прогрес'),
      ),
    ),
  );
}
