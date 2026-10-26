// Повторно використовувані компоненти: консоль виводу, виконувані блоки, рендер Markdown у DOM.
import { h, clear } from './util.js';
import { renderMarkdown } from './markdown.js';
import { createEditor, staticCode } from './editor.js';
import * as R from './r.js';
import { explainError } from './rcore.js';

/** Панель виводу: консоль + графіки. */
export function outputPanel({ label = true } = {}) {
  const el = h('div', { class: 'out hidden' });
  const consoleEl = h('div', { class: 'console' });
  const plots = h('div', { class: 'plots' });
  const tips = h('div');
  const head = h('div', { class: 'console-label' }, h('span', null, 'Результат'));
  el.append(...(label ? [head] : []), consoleEl, tips, plots);

  const api = {
    el,
    clear() {
      el.classList.add('hidden');
    },
    running(on) {
      if (on) {
        el.classList.remove('hidden');
        clear(consoleEl);
        consoleEl.classList.remove('hidden');
        consoleEl.classList.add('empty');
        consoleEl.append(h('span', { class: 'running' }, h('i', { class: 'spinner' }), ' Виконується…'));
        clear(plots);
        clear(tips);
      }
    },
    show(res) {
      el.classList.remove('hidden');
      clear(consoleEl);
      clear(plots);
      clear(tips);
      const text = res.output || '';
      const hasText = text.trim().length > 0;
      const hasImg = !!(res.images && res.images.length);
      consoleEl.classList.toggle('hidden', !hasText && hasImg);
      consoleEl.classList.toggle('empty', !hasText && !hasImg);
      if (!hasText && !hasImg) {
        consoleEl.textContent = '(код виконано, вивід порожній)';
      } else {
        text.split('\n').forEach((line, i, arr) => {
          const cls = line.startsWith('✖') ? 'ln-err' : line.startsWith('⚠') ? 'ln-warn' : line.startsWith('ℹ') ? 'ln-info' : '';
          consoleEl.append(h('span', cls ? { class: cls } : null, line));
          if (i < arr.length - 1) consoleEl.append('\n');
        });
      }
      if (hasImg) {
        R.imagesToCanvases(res.images).forEach((c) => plots.append(c));
      }
      if (!res.ok) {
        const t = explainError(text);
        if (t.length) tips.append(h('div', { class: 'error-tips' }, h('b', null, '💡 Підказка до помилки'), h('ul', null, t.map((x) => h('li', null, x)))));
      }
    },
    error(msg) {
      el.classList.remove('hidden');
      clear(consoleEl);
      clear(plots);
      clear(tips);
      consoleEl.classList.remove('empty', 'hidden');
      consoleEl.append(h('span', { class: 'ln-err' }, msg));
    },
  };
  return api;
}

export const R_LOAD_ERROR =
  '✖ Не вдалося завантажити R у браузері. Перевірте з\'єднання з інтернетом (потрібен доступ до webr.r-wasm.org) і перезавантажте сторінку.';

/** Виконуваний блок коду для теорії/довідника. */
export function runBlock(code, { session = '' } = {}) {
  const wrap = h('div', { class: 'runblock' });
  const host = h('div');
  const out = outputPanel({ label: false });
  out.el.style.padding = '0 8px 8px';
  let cm;
  let busy = false;
  const doRun = async () => {
    if (busy) return;
    busy = true;
    runBtn.disabled = true;
    out.running(true);
    try {
      const res = await R.run(cm.getValue(), { session });
      out.show(res);
    } catch (e) {
      out.error(e.message === 'stopped' ? '✖ Виконання зупинено.' : R_LOAD_ERROR);
    }
    busy = false;
    runBtn.disabled = false;
  };
  const runBtn = h('button', { class: 'btn sm primary', onclick: doRun, title: 'Ctrl+Enter' }, '▶ Запустити');
  const resetBtn = h('button', { class: 'btn sm ghost', title: 'Повернути початковий код', onclick: () => cm.setValue(code) }, '↺ Скинути');
  wrap.append(host, h('div', { class: 'rb-bar' }, runBtn, resetBtn, h('span', { class: 'hint' }, 'Ctrl+Enter — запустити · можна редагувати')), out.el);
  cm = createEditor(host, { value: code, minLines: 1, lineNumbers: false, onRun: doRun });
  wrap._cm = cm;
  return wrap;
}

/** Рендерить Markdown у контейнер; блоки R стають інтерактивними. */
export function mountMarkdown(container, md, { session = '', runnable = true } = {}) {
  const { html, blocks } = renderMarkdown(md);
  container.innerHTML = html;
  const editors = [];
  container.querySelectorAll('.md-block').forEach((el) => {
    const b = blocks[+el.dataset.i];
    const node = b.mode === 'run' && runnable ? runBlock(b.code, { session }) : staticCode(b.code, { lang: b.lang, output: b.lang === 'text' });
    if (node._cm) editors.push(node._cm);
    el.replaceWith(node);
  });
  requestAnimationFrame(() => editors.forEach((cm) => cm.refresh()));
  return editors;
}
