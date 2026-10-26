// Невеликі допоміжні функції інтерфейсу.

/** Мінімальний hyperscript: h('div', {class:'a', onclick: fn}, 'текст', node, [..]) */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Замінює вміст елемента (null/false пропускаються). */
export function setChildren(el, ...children) {
  clear(el);
  return append(el, children);
}

/** Хлібні крихти: рядки обгортаються в span, між частинами — роздільник. */
export function crumbs(...parts) {
  const el = document.createElement('div');
  el.className = 'crumbs';
  parts.forEach((p, i) => {
    if (i) el.append(h('span', { 'aria-hidden': 'true' }, '›'));
    el.append(typeof p === 'string' ? h('span', null, p) : p);
  });
  return el;
}

export const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
};

export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/** Українська множина: plural(5, 'завдання', 'завдання', 'завдань') */
export function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function toast(msg, kind = '') {
  let box = document.querySelector('.toasts');
  if (!box) {
    box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  const t = h('div', { class: 'toast ' + kind }, msg);
  box.append(t);
  setTimeout(() => t.remove(), 4200);
}

export function download(filename, text, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
