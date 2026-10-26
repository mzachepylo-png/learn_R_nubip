// Наскрізний тест у Chromium (Playwright): запускає сайт, підміняє CDN WebR локальною копією з node_modules.
// Використання: node tests/e2e.mjs [каталог для скріншотів]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2] || path.join(root, 'tests', 'shots');
fs.mkdirSync(shots, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.R': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.data': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, p === '/' ? 'index.html' : p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;
const base = `http://localhost:${port}/`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: 'uk-UA' });
const webrDir = path.join(root, 'node_modules/webr/dist');
await ctx.route(/^https:\/\/webr\.r-wasm\.org\/.*/, async (route) => {
  const u = new URL(route.request().url());
  let rel = u.pathname.replace(/^\/(v[\d.]+|latest)\//, '');
  if (rel === 'webr.mjs') rel = 'webr.js'; // у npm-пакеті браузерна збірка називається webr.js
  const file = path.join(webrDir, rel);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'access-control-allow-origin': '*' } });
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✖ ') + msg); if (!cond) failed++; };

async function setCode(code) {
  await page.evaluate((c) => { document.querySelector('.pane.sticky .CodeMirror').CodeMirror.setValue(c); }, code);
}

console.log('Головна');
await page.goto(base);
await page.waitForSelector('.hero');
ok((await page.locator('.card .mod-ico').count()) > 0, 'модулі відображаються');
await page.screenshot({ path: path.join(shots, '01-home.png'), fullPage: false });

console.log('Урок: конспект');
await page.goto(base + '#/l/m01-l01/0');
await page.waitForSelector('.runblock');
await page.locator('.runblock .btn.primary').first().click();
await page.waitForSelector('.runblock .console:not(.empty)', { timeout: 120000 });
const o1 = await page.locator('.runblock .console').first().innerText();
ok(o1.includes('14'), 'приклад з теорії виконався: ' + JSON.stringify(o1.slice(0, 60)));
await page.screenshot({ path: path.join(shots, '02-theory.png') });

console.log('Урок: завдання');
await page.goto(base + '#/l/m01-l01/1');
await page.waitForSelector('.pane.sticky .CodeMirror');
await page.click('#check-btn');
await page.waitForSelector('.feedback.bad', { timeout: 60000 });
ok(true, 'порожній код не зараховується');
await setCode('120 * 85');
await page.click('#check-btn');
await page.waitForSelector('.feedback.ok', { timeout: 60000 });
ok((await page.locator('.feedback.ok').innerText()).includes('+10 XP'), 'правильна відповідь дає +10 XP');
await page.screenshot({ path: path.join(shots, '03-exercise-ok.png') });
ok((await page.locator('#xpval').innerText()) === '10', 'лічильник XP оновився');
await page.reload();
await page.waitForSelector('.pane.sticky .CodeMirror');
ok((await page.locator('#xpval').innerText()) === '10', 'прогрес збережено після перезавантаження');

console.log('Тест (quiz)');
await page.goto(base + '#/l/m01-l01/5');
await page.waitForSelector('.option');
await page.locator('.option').nth(0).click();
await page.click('#check-btn');
await page.waitForSelector('.feedback.bad');
await page.locator('.option').nth(1).click();
await page.click('#check-btn');
await page.waitForSelector('.feedback.ok');
ok(true, 'тест працює');

console.log('Пісочниця (з графіком)');
await page.goto(base + '#/play');
await page.waitForSelector('.CodeMirror');
await page.click('.btn.primary');
await page.waitForSelector('.plots canvas', { timeout: 120000 });
ok(true, 'графік побудовано');
await page.screenshot({ path: path.join(shots, '04-play.png') });

console.log('Завдання з графіком');
await page.goto(base + '#/l/m07-l03/1');
await page.waitForSelector('.pane.sticky .CodeMirror');
await setCode('hist(mtcars$mpg, breaks = 8, main = "Витрата пального", xlab = "mpg", col = "lightblue")');
await page.click('#check-btn');
await page.waitForSelector('.feedback.ok', { timeout: 60000 });
await page.waitForSelector('.plots canvas');
ok(true, 'завдання з графіком зараховано');
await page.screenshot({ path: path.join(shots, '05-plot-exercise.png') });

console.log('Задача з банку');
await page.goto(base + '#/p/p-easy-2');
await page.waitForSelector('.pane.sticky .CodeMirror');
await setCode('n <- 1:999\ntotal <- sum(n[n %% 3 == 0 | n %% 5 == 0])');
await page.click('#check-btn');
await page.waitForSelector('.feedback.ok', { timeout: 60000 });
ok((await page.locator('.feedback.ok').innerText()).includes('+15 XP'), 'легка задача дає +15 XP');

console.log('Інші сторінки');
for (const r of ['#/problems', '#/ref', '#/progress', '#/m/m05']) {
  await page.goto(base + r);
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(shots, 'page-' + r.replace(/[#\/]/g, '_') + '.png') });
}
await page.goto(base + '#/ref');
await page.fill('.search', 'регресія');
await page.waitForTimeout(300);
ok((await page.locator('.ref-entry:not(.hidden)').count()) >= 1, 'пошук у довіднику працює');

console.log('Темна тема і мобільний вигляд');
await page.click('#themebtn');
await page.goto(base + '#/l/m02-l01/1');
await page.waitForSelector('.pane.sticky .CodeMirror');
await page.screenshot({ path: path.join(shots, '06-dark.png') });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '#/l/m02-l01/0');
await page.waitForSelector('.runblock');
await page.screenshot({ path: path.join(shots, '07-mobile-theory.png') });
await page.goto(base + '#/');
await page.waitForSelector('.hero');
await page.screenshot({ path: path.join(shots, '08-mobile-home.png') });

await browser.close();
server.close();
if (errors.length) { console.log('Помилки в консолі браузера:\n' + errors.join('\n')); }
console.log(failed ? `\n${failed} перевірок не пройдено` : '\nE2E: усе гаразд ✔');
process.exit(failed ? 1 : 0);
