// Панель завдання: умова ліворуч, редактор і консоль праворуч; перевірка та нарахування XP.
import { h, toast, plural, setChildren } from './util.js';
import { mountMarkdown, outputPanel, R_LOAD_ERROR } from './components.js';
import { createEditor, staticCode } from './editor.js';
import * as R from './r.js';
import * as store from './state.js';
import { loadManifest } from './data.js';
import { renderInline } from './markdown.js';

const DIFF = { easy: 'Легко', medium: 'Середньо', hard: 'Складно' };

/**
 * Монтує завдання в container.
 * ctx: { onSolved(info), next: {label, href} | null, badge }
 */
export function mountExercise(container, ex, ctx = {}) {
  return ex.type === 'quiz' ? mountQuiz(container, ex, ctx) : mountCode(container, ex, ctx);
}

function titleRow(ex, extra) {
  const done = store.isDone(ex.id);
  return h(
    'div',
    { class: 'task-title' },
    h('h2', null, ex.title),
    ex.difficulty ? h('span', { class: 'tag ' + ex.difficulty }, DIFF[ex.difficulty]) : null,
    ex.topic ? h('span', { class: 'tag' }, ex.topic) : null,
    h('span', { class: 'tag done' + (done ? '' : ' hidden'), id: 'done-tag' }, '✓ Виконано'),
    extra,
  );
}

async function onComplete(ex, ctx, feedback, nextBox) {
  const { first, xp } = store.complete(ex);
  store.setAttempt(ex.id, { tries: store.getAttempt(ex.id).tries + 1 });
  document.getElementById('done-tag')?.classList.remove('hidden');
  const att = store.getAttempt(ex.id);
  const sol = !!att.sol;
  feedback.className = 'feedback ok';
  setChildren(feedback, 
    h('b', { class: 't' }, first ? (sol ? '✔ Зараховано (з розв’язком, без XP)' : `✔ Правильно! +${xp} XP`) : '✔ Правильно! (завдання вже було зараховано раніше)'),
    ex.explain ? h('div', { html: renderInline(ex.explain) }) : null,
  );
  nextBox.replaceChildren();
  if (ctx.next) {
    nextBox.append(h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('a', { class: 'btn success', href: ctx.next.href, id: 'next-btn' }, ctx.next.label + ' →')));
  }
  const manifest = await loadManifest();
  const gained = store.awardBadges(manifest);
  gained.forEach((b) => toast(`${b.em} Нове досягнення: ${b.title}`, 'ok'));
  ctx.onSolved && ctx.onSolved({ first, xp });
}

// ---------------- код ----------------
function mountCode(container, ex, ctx) {
  const att = store.getAttempt(ex.id);
  let hintsShown = Math.min(att.hints || 0, (ex.hints || []).length);
  let busy = false;

  const hintsBox = h('div', { class: 'hints' });
  const feedback = h('div', { class: 'feedback hidden' });
  const nextBox = h('div');
  const out = outputPanel();
  const edHost = h('div', { class: 'editor-wrap' });

  const left = h('section', { class: 'pane' });
  const body = h('div', { class: 'pane-body' });
  const task = h('div', { class: 'prose' });
  body.append(titleRow(ex), task);
  if (ex.setup) {
    const det = h('details', { class: 'setup' }, h('summary', null, 'Що вже підготовлено перед запуском вашого коду'));
    det.append(staticCode(ex.setup));
    body.append(det);
  }
  body.append(hintsBox, feedback, nextBox);
  left.append(body);

  const runBtn = h('button', { class: 'btn', onclick: doRun, title: 'Ctrl+Enter' }, '▶ Запустити');
  const checkBtn = h('button', { class: 'btn primary', onclick: doCheck, title: 'Ctrl+Shift+Enter', id: 'check-btn' }, '✔ Перевірити');
  const hintBtn = h('button', { class: 'btn', onclick: showHint, id: 'hint-btn' });
  const solBtn = h('button', { class: 'btn ghost', onclick: showSolution, id: 'sol-btn' }, '👁 Розв’язок');
  const resetBtn = h('button', { class: 'btn ghost', onclick: resetCode, title: 'Повернути початковий код' }, '↺');
  const stopBtn = h('button', { class: 'btn danger sm hidden', onclick: () => R.stopR() }, '■ Зупинити');
  const toolbar = h('div', { class: 'toolbar' }, runBtn, checkBtn, hintBtn, solBtn, resetBtn, h('span', { class: 'spacer' }), stopBtn);
  const right = h('section', { class: 'pane sticky' }, toolbar, h('div', { class: 'editor-box' }, edHost, out.el));

  container.replaceChildren(h('div', { class: 'split' }, left, right));
  mountMarkdown(task, ex.task, { runnable: false });

  const draft = store.getDraft(ex.id);
  const cm = createEditor(edHost, {
    value: draft !== undefined ? draft : ex.starter,
    minLines: 8,
    onRun: doRun,
    onSubmit: doCheck,
    onChange: (v) => store.setDraft(ex.id, v),
  });
  requestAnimationFrame(() => cm.refresh());

  for (let i = 0; i < hintsShown; i++) hintsBox.append(hintItem(i));
  updateHintBtn();

  function hintItem(i) {
    return h('div', { class: 'hint-item', html: `💡 <b>Підказка ${i + 1}.</b> ${renderInline(ex.hints[i])}` });
  }
  function updateHintBtn() {
    const total = (ex.hints || []).length;
    hintBtn.textContent = total ? `💡 Підказка (${hintsShown}/${total})` : '💡 Підказок немає';
    hintBtn.disabled = hintsShown >= total;
  }
  function showHint() {
    const total = (ex.hints || []).length;
    if (hintsShown >= total) return;
    hintsBox.append(hintItem(hintsShown));
    hintsShown++;
    store.setAttempt(ex.id, { hints: hintsShown });
    updateHintBtn();
  }
  function showSolution() {
    if (!store.isDone(ex.id) && !confirm('Показати розв’язок? За це завдання XP не нараховуватиметься.')) return;
    cm.setValue(ex.solution);
    store.setAttempt(ex.id, { sol: true });
    feedback.className = 'feedback info';
    setChildren(feedback, h('b', { class: 't' }, 'Розв’язок вставлено в редактор'), h('div', null, 'Прочитайте його, запустіть і натисніть «Перевірити», щоб зарахувати завдання.'));
  }
  function resetCode() {
    if (cm.getValue() !== ex.starter && !confirm('Повернути початковий код? Ваші зміни буде втрачено.')) return;
    cm.setValue(ex.starter);
    store.clearDraft(ex.id);
  }
  function setBusy(on) {
    busy = on;
    runBtn.disabled = checkBtn.disabled = on;
    stopBtn.classList.toggle('hidden', !on);
  }
  async function doRun() {
    if (busy) return;
    setBusy(true);
    out.running(true);
    try {
      const res = await R.run(cm.getValue(), { setup: ex.setup });
      out.show(res);
    } catch (e) {
      out.error(e.message === 'stopped' ? '✖ Виконання зупинено. R перезапускається…' : R_LOAD_ERROR);
    }
    setBusy(false);
  }
  async function doCheck() {
    if (busy) return;
    setBusy(true);
    out.running(true);
    feedback.className = 'feedback hidden';
    try {
      const res = await R.runAndCheck(ex, cm.getValue());
      out.show(res);
      store.setAttempt(ex.id, { tries: store.getAttempt(ex.id).tries + 1 });
      if (res.check.errored) {
        feedback.className = 'feedback bad';
        setChildren(feedback, h('b', { class: 't' }, 'У коді є помилка'), h('div', null, 'Прочитайте повідомлення в консолі, виправте код і спробуйте ще раз.'));
      } else if (!res.check.ok) {
        feedback.className = 'feedback bad';
        setChildren(feedback, 
          h('b', { class: 't' }, 'Поки що не зовсім так'),
          ...res.check.messages.slice(0, 3).map((m) => {
            const [first, ...rest] = m.split('\n');
            return h('div', null, first, rest.length ? h('pre', null, rest.join('\n')) : null);
          }),
          h('div', { class: 'muted', style: { marginTop: '6px' } }, 'Скористайтеся підказкою, якщо застрягли.'),
        );
      } else {
        await onComplete(ex, ctx, feedback, nextBox);
      }
    } catch (e) {
      out.error(e.message === 'stopped' ? '✖ Виконання зупинено. R перезапускається…' : R_LOAD_ERROR);
    }
    setBusy(false);
  }

  if (store.isDone(ex.id) && ctx.next) {
    feedback.className = 'feedback ok';
    setChildren(feedback, h('b', { class: 't' }, '✔ Це завдання вже виконано'), h('div', null, 'Можна пройти його ще раз або рухатися далі.'));
    nextBox.append(h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('a', { class: 'btn success', href: ctx.next.href }, ctx.next.label + ' →')));
  }
  return { cm };
}

// ---------------- тест ----------------
function mountQuiz(container, ex, ctx) {
  let selected = -1;
  let locked = false;
  const feedback = h('div', { class: 'feedback hidden' });
  const nextBox = h('div');
  const opts = h('div', { class: 'options', role: 'radiogroup' });
  const task = h('div', { class: 'prose' });
  const checkBtn = h('button', { class: 'btn primary', disabled: true, onclick: check, id: 'check-btn' }, '✔ Перевірити');

  const nodes = ex.options.map((text, i) => {
    const b = h('button', { class: 'option', role: 'radio', 'aria-checked': 'false', onclick: () => choose(i) }, h('span', { class: 'radio' }), h('span', { html: renderInline(text) }));
    opts.append(b);
    return b;
  });
  const pane = h('section', { class: 'pane', style: { maxWidth: '760px', margin: '0 auto' } }, h('div', { class: 'pane-body' }, titleRow(ex), task, opts, h('div', { class: 'btn-row' }, checkBtn), feedback, nextBox));
  container.replaceChildren(pane);
  mountMarkdown(task, ex.task, { runnable: false });

  function choose(i) {
    if (locked) return;
    selected = i;
    nodes.forEach((n, k) => {
      n.classList.toggle('selected', k === i);
      n.setAttribute('aria-checked', String(k === i));
    });
    checkBtn.disabled = false;
  }
  async function check() {
    if (selected < 0 || locked) return;
    if (selected === ex.answer) {
      locked = true;
      nodes[selected].classList.add('correct');
      checkBtn.disabled = true;
      await onComplete(ex, ctx, feedback, nextBox);
    } else {
      nodes[selected].classList.add('wrong');
      feedback.className = 'feedback bad';
      setChildren(feedback, h('b', { class: 't' }, 'Невірно'), h('div', null, 'Подумайте ще та оберіть інший варіант.'));
      store.setAttempt(ex.id, { tries: store.getAttempt(ex.id).tries + 1 });
      setTimeout(() => nodes[selected] && nodes[selected].classList.remove('wrong'), 900);
    }
  }
  if (store.isDone(ex.id)) {
    feedback.className = 'feedback ok';
    setChildren(feedback, h('b', { class: 't' }, '✔ Ви вже відповіли правильно'), ex.explain ? h('div', { html: renderInline(ex.explain) }) : null);
    if (ctx.next) nextBox.append(h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('a', { class: 'btn success', href: ctx.next.href }, ctx.next.label + ' →')));
  }
  return {};
}

export { plural };
