// Перевіряє весь контент справжнім R (WebR у Node):
//  • приклади з теорії виконуються без помилок;
//  • еталонний розв'язок кожного завдання проходить власну перевірку;
//  • стартовий код НЕ проходить перевірку (інакше завдання «вже розв'язане»).
//
// Використання:  node tests/validate.mjs [фільтр-id ...]   напр.:  node tests/validate.mjs m03 p-easy
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebR } from 'webr';
import { execCall, checkCall, parseExec, parseCheck } from '../js/rcore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const filters = process.argv.slice(2);
const wanted = (id) => filters.length === 0 || filters.some((f) => id.startsWith(f));

const webR = new WebR();
await webR.init();
await webR.evalRVoid(fs.readFileSync(path.join(root, 'r/core.R'), 'utf8'));
await webR.evalRVoid('grDevices::pdf(NULL)');

async function evalChars(code) {
  const r = await webR.evalR(code);
  const arr = await r.toArray();
  await webR.destroy(r);
  return arr;
}
const exec = async (code, setup, session) => parseExec(await evalChars(execCall(code, setup, session)));
const check = async (ex) => parseCheck(await evalChars(checkCall(ex.check, ex.setup, ex.solution)));

const manifest = readJSON('data/manifest.json');
const problems = readJSON('data/problems.json');
const failures = [];
let nCode = 0;
let nQuiz = 0;
let nTheory = 0;
const t0 = Date.now();

const fail = (id, what, detail = '') => {
  failures.push(`✖ ${id}: ${what}${detail ? '\n' + detail.split('\n').map((l) => '    ' + l).join('\n') : ''}`);
};

async function validateExercise(ex, label) {
  if (ex.type === 'quiz') {
    nQuiz++;
    return;
  }
  nCode++;
  // еталон
  const sol = await exec(ex.solution, ex.setup);
  if (!sol.ok) return fail(label, 'розв\'язок завершується помилкою', sol.output);
  const chk = await check(ex);
  if (!chk.ok) return fail(label, 'розв\'язок не проходить власну перевірку', chk.messages.join('\n') + '\n--- вивід розв\'язку:\n' + sol.output);
  if (ex.check.plot && sol.plots < 1) fail(label, 'вказано plot, але розв\'язок не будує графік');
  // старт
  if (!ex.starterOk) {
    const st = await exec(ex.starter, ex.setup);
    if (st.ok) {
      const c2 = await check(ex);
      if (c2.ok) fail(label, 'стартовий код уже проходить перевірку (додайте @starterok, якщо це навмисно)');
    }
  }
  // додаткова гігієна контенту
  if (!ex.task) fail(label, 'порожній опис завдання');
  if (!ex.hints || ex.hints.length === 0) fail(label, 'немає жодної підказки (@hint)');
}

// ---- уроки ----
for (const mod of manifest.modules) {
  for (const l of mod.lessons) {
    if (!wanted(l.id)) continue;
    const lesson = readJSON(`data/lessons/${l.id}.json`);
    // теорія: виконуваний код у спільній сесії уроку
    const session = 'val-' + l.id;
    const blocks = [...lesson.theory.matchAll(/^```r[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)].map((m) => m[1]);
    for (const [i, code] of blocks.entries()) {
      nTheory++;
      const r = await exec(code, '', session);
      if (!r.ok) fail(`${l.id} теорія#${i + 1}`, 'приклад з теорії завершується помилкою', code + '\n---\n' + r.output);
    }
    for (const ex of lesson.exercises) await validateExercise(ex, ex.id);
    process.stdout.write('.');
  }
}

// ---- довідник ----
{
  const ref = readJSON('data/reference.json');
  let nRef = 0;
  for (const sec of ref) {
    for (const e of sec.entries) {
      const blocks = [...e.md.matchAll(/^```r[ \t]*\n([\s\S]*?)^```[ \t]*$/gm)].map((m) => m[1]);
      for (const code of blocks) {
        nRef++;
        const r = await exec(code, '', 'val-ref-' + e.title);
        if (!r.ok) fail(`довідник «${e.title}»`, 'приклад завершується помилкою', code + '\n---\n' + r.output);
      }
    }
  }
  nTheory += nRef;
}

// ---- задачі ----
for (const p of problems) {
  if (!wanted(p.id)) continue;
  await validateExercise(p, p.id);
  process.stdout.write('+');
}

webR.close();
console.log(`\n\nПеревірено: ${nCode} завдань з кодом, ${nQuiz} тестів, ${nTheory} прикладів теорії за ${((Date.now() - t0) / 1000).toFixed(1)} с.`);
if (failures.length) {
  console.error(`\nПомилок: ${failures.length}\n\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log('Усе гаразд ✔');
