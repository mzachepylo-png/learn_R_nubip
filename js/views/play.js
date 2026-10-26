import { h, download, toast } from '../util.js';
import * as store from '../state.js';
import * as R from '../r.js';
import { createEditor } from '../editor.js';
import { outputPanel, R_LOAD_ERROR } from '../components.js';

const DEFAULT = `# Пісочниця R — тут змінні зберігаються між запусками.
# Ctrl+Enter — виконати код.

x <- c(12.5, 14.1, 9.8, 15.3, 11.0)
mean(x)
summary(x)

# Набори даних, вбудовані в R: mtcars, iris, airquality, ToothGrowth, women, cars ...
head(mtcars)
plot(mtcars$wt, mtcars$mpg, xlab = "Вага", ylab = "Миль на галон", pch = 19, col = "steelblue")
abline(lm(mpg ~ wt, data = mtcars), col = "red", lwd = 2)
`;

const SNIPPETS = [
  ['— вставити приклад —', ''],
  ['Дані: перегляд mtcars', 'str(mtcars)\nsummary(mtcars[, c("mpg", "hp", "wt")])\n'],
  ['Дані: iris — діаграма розмаху', 'boxplot(Sepal.Length ~ Species, data = iris, col = c("#9ecae1", "#a1d99b", "#fdae6b"),\n        main = "Довжина чашолистка за видами")\n'],
  ['Модель: лінійна регресія', 'fit <- lm(dist ~ speed, data = cars)\nsummary(fit)\nplot(cars, pch = 19)\nabline(fit, col = "red", lwd = 2)\n'],
  ['Симуляція: нормальний розподіл', 'set.seed(1)\nz <- rnorm(1000, mean = 50, sd = 10)\nhist(z, breaks = 30, col = "grey80", main = "Вибірка з N(50, 10)")\nc(mean(z), sd(z))\n'],
  ['Модель: логістичний ріст', 'r <- 0.3; K <- 100; N <- numeric(60); N[1] <- 5\nfor (t in 2:60) N[t] <- N[t - 1] + r * N[t - 1] * (1 - N[t - 1] / K)\nplot(N, type = "l", lwd = 2, col = "darkgreen", xlab = "Час", ylab = "Чисельність")\n'],
];

export function playView(root) {
  R.ensureR().catch(() => {});
  const out = outputPanel();
  const edHost = h('div', { class: 'editor-wrap' });
  let busy = false;
  const stopBtn = h('button', { class: 'btn danger sm hidden', onclick: () => R.stopR() }, '■ Зупинити');
  const runBtn = h('button', { class: 'btn primary', onclick: doRun }, '▶ Запустити (Ctrl+Enter)');
  const snip = h('select', { class: 'sel', 'aria-label': 'Приклади', onchange: (e) => { const v = SNIPPETS[e.target.selectedIndex][1]; if (v) cm.replaceRange((cm.getValue().endsWith('\n') ? '' : '\n') + '\n' + v, { line: cm.lineCount(), ch: 0 }); e.target.selectedIndex = 0; } }, SNIPPETS.map(([t]) => h('option', null, t)));
  const toolbar = h(
    'div',
    { class: 'toolbar' },
    runBtn,
    h('button', { class: 'btn', onclick: () => R.resetSession('play').then(() => toast('Змінні сесії очищено')).catch(() => {}) }, '🧹 Очистити змінні'),
    snip,
    h('span', { class: 'spacer' }),
    stopBtn,
    h('button', { class: 'btn ghost sm', onclick: () => download('script.R', cm.getValue()) }, '⬇ Зберегти .R'),
    h('button', { class: 'btn ghost sm', onclick: () => { if (confirm('Замінити код у редакторі стартовим прикладом?')) cm.setValue(DEFAULT); } }, '↺ Скинути код'),
  );
  const left = h('section', { class: 'pane' }, toolbar, h('div', { class: 'editor-box' }, edHost));
  const right = h('section', { class: 'pane sticky' }, h('div', { class: 'pane-body' }, h('h3', { style: { marginTop: 0 } }, 'Консоль'), h('p', { class: 'muted', style: { fontSize: '0.9rem' } }, 'Тут з’являтимуться результати та графіки. Змінні зберігаються між запусками, як у справжньому R.'), out.el));
  root.replaceChildren(h('div', { class: 'container wide' }, h('h1', null, 'Пісочниця'), h('div', { class: 'play' }, left, right)));
  const saved = store.getPlayground();
  const cm = createEditor(edHost, { value: saved || DEFAULT, minLines: 22, onRun: doRun, onChange: (v) => store.setPlayground(v) });
  requestAnimationFrame(() => cm.refresh());
  async function doRun() {
    if (busy) return;
    busy = true;
    runBtn.disabled = true;
    stopBtn.classList.remove('hidden');
    out.running(true);
    try {
      out.show(await R.run(cm.getValue(), { session: 'play' }));
    } catch (e) {
      out.error(e.message === 'stopped' ? '✖ Виконання зупинено. R перезапускається…' : R_LOAD_ERROR);
    }
    busy = false;
    runBtn.disabled = false;
    stopBtn.classList.add('hidden');
  }
}
