// Точка входу: маршрутизація, шапка, тема.
import { h } from './util.js';
import * as store from './state.js';
import * as R from './r.js';
import { loadManifest } from './data.js';
import { homeView } from './views/home.js';
import { moduleView, notFound } from './views/module.js';
import { lessonView } from './views/lesson.js';
import { problemsView, problemView } from './views/problems.js';
import { playView } from './views/play.js';
import { referenceView } from './views/reference.js';
import { progressView } from './views/progress.js';

const app = document.getElementById('app');
let renderToken = 0;

const ROUTES = [
  [/^#?\/?$/, 'home', (m, man) => homeView(app, man), 'Курс'],
  [/^#\/m\/([\w-]+)$/, 'home', (m, man) => moduleView(app, man, m[1]), 'Модуль'],
  [/^#\/l\/([\w-]+)(?:\/(\d+))?$/, 'home', (m, man) => lessonView(app, man, m[1], m[2]), 'Урок'],
  [/^#\/problems$/, 'problems', (m, man) => problemsView(app, man), 'Банк задач'],
  [/^#\/p\/([\w-]+)$/, 'problems', (m, man) => problemView(app, man, m[1]), 'Задача'],
  [/^#\/play$/, 'play', () => playView(app), 'Пісочниця'],
  [/^#\/ref$/, 'ref', () => referenceView(app), 'Довідник'],
  [/^#\/progress$/, 'progress', (m, man) => progressView(app, man), 'Прогрес'],
];

async function render() {
  const token = ++renderToken;
  const hash = location.hash || '#/';
  let manifest;
  try {
    manifest = await loadManifest();
  } catch (e) {
    app.replaceChildren(h('div', { class: 'container' }, h('div', { class: 'notice' }, 'Не вдалося завантажити дані курсу: ' + e.message + '. Якщо ви відкрили index.html напряму з диска — запустіть локальний сервер (npm run serve).')));
    return;
  }
  for (const [re, nav, fn, title] of ROUTES) {
    const m = hash.match(re);
    if (!m) continue;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === nav));
    document.title = (title === 'Курс' ? '' : title + ' · ') + 'R з нуля';
    try {
      await fn(m, manifest);
    } catch (e) {
      console.error(e);
      if (token === renderToken) app.replaceChildren(h('div', { class: 'container' }, h('div', { class: 'notice' }, 'Помилка: ' + e.message)));
    }
    if (token === renderToken) window.scrollTo(0, 0);
    updateChips();
    return;
  }
  notFound(app);
}

function updateChips() {
  document.getElementById('xpval').textContent = store.totalXP();
  document.getElementById('stval').textContent = store.streak();
}

// ----- тема -----
function applyTheme() {
  const t = store.getTheme();
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
document.getElementById('themebtn').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  store.setTheme(dark ? 'light' : 'dark');
  applyTheme();
});
applyTheme();

// ----- статус R -----
R.onStatus((s, text) => {
  const dot = document.getElementById('rdot');
  dot.className = 'dot ' + (s === 'loading' || s === 'busy' ? 'loading' : s === 'ready' ? 'ready' : s === 'error' ? 'error' : '');
  document.getElementById('rtxt').textContent = s === 'idle' ? 'R: не запущено' : text;
});
document.getElementById('rstatus').addEventListener('click', () => {
  const { status } = R.getStatus();
  if (status === 'idle' || status === 'error') R.ensureR().catch(() => {});
});

store.subscribe(updateChips);
window.addEventListener('hashchange', render);
render();

// для налагодження та автотестів
window.__nb = { store, R };
