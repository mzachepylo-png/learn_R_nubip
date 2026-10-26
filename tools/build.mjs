// Збирає Markdown-контент (content/) у JSON для сайту (data/).
//   node tools/build.mjs          — записує data/
//   node tools/build.mjs --check  — лише перевіряє, що data/ актуальні (для CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLesson, DIFFS } from './lib/parse.mjs';
import { COURSE } from '../content/course.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const out = new Map(); // шлях -> вміст

const json = (obj) => JSON.stringify(obj) + '\n';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ---- уроки ----
const manifest = { modules: [], problems: [] };
const seenIds = new Set();
for (const mod of COURSE) {
  const m = { id: mod.id, title: mod.title, icon: mod.icon, color: mod.color, blurb: mod.blurb, lessons: [] };
  for (const file of mod.lessons) {
    const rel = `content/${mod.id}/${file}.md`;
    const id = `${mod.id}-${file}`;
    const lesson = parseLesson(read(rel), { file: rel });
    if (!lesson.title) throw new Error(`${rel}: немає заголовка «# ...»`);
    if (!lesson.exercises.length) throw new Error(`${rel}: немає завдань`);
    const exercises = lesson.exercises.map((e) => ({ ...e, id: `${id}.${e.n}` }));
    for (const e of exercises) {
      if (seenIds.has(e.id)) throw new Error('дубль id ' + e.id);
      seenIds.add(e.id);
    }
    out.set(`data/lessons/${id}.json`, json({ id, module: mod.id, title: lesson.title, summary: lesson.summary, theory: lesson.theory, exercises }));
    m.lessons.push({
      id,
      title: lesson.title,
      summary: lesson.summary,
      exercises: exercises.map((e) => ({ id: e.id, title: e.title, type: e.type })),
    });
  }
  manifest.modules.push(m);
}

// ---- задачі ----
const problems = [];
const pdir = path.join(root, 'content/problems');
for (const diff of DIFFS) {
  const rel = `content/problems/${diff}.md`;
  if (!fs.existsSync(path.join(root, rel))) continue;
  const parsed = parseLesson(read(rel), { file: rel });
  for (const e of parsed.exercises) {
    if (!e.difficulty) e.difficulty = diff;
    if (e.difficulty !== diff) throw new Error(`${rel}: «${e.title}» має рівень ${e.difficulty}, а файл — ${diff}`);
    if (!e.topic) throw new Error(`${rel}: «${e.title}» без @topic`);
    const id = `p-${diff}-${e.n}`;
    problems.push({ ...e, id });
    manifest.problems.push({ id, title: e.title, difficulty: e.difficulty, topic: e.topic, type: e.type });
  }
}
void pdir;
out.set('data/problems.json', json(problems));

// ---- довідник ----
{
  const rel = 'content/reference.md';
  const sections = [];
  let cur = null;
  let entry = null;
  let fence = false;
  for (const ln of read(rel).split('\n')) {
    if (/^```/.test(ln)) fence = !fence;
    let m;
    if (!fence && (m = ln.match(/^## (.+)$/))) {
      cur = { title: m[1].trim(), entries: [] };
      sections.push(cur);
      entry = null;
    } else if (!fence && (m = ln.match(/^### (.+)$/))) {
      if (!cur) throw new Error(rel + ': запис без розділу');
      entry = { title: m[1].trim(), lines: [] };
      cur.entries.push(entry);
    } else if (entry) entry.lines.push(ln);
  }
  const ref = sections.map((s) => ({ title: s.title, entries: s.entries.map((e) => ({ title: e.title, md: e.lines.join('\n').trim() })) }));
  out.set('data/reference.json', json(ref));
}

out.set('data/manifest.json', json(manifest));

// ---- запис / перевірка ----
const dataDir = path.join(root, 'data');
const wanted = new Set([...out.keys()].map((p) => path.join(root, p)));
let stale = [];
if (checkOnly) {
  for (const [p, content] of out) {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== content) stale.push(p);
  }
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
  for (const f of walk(dataDir)) if (!wanted.has(f)) stale.push(path.relative(root, f) + ' (зайвий)');
  if (stale.length) {
    console.error('data/ неактуальні. Запустіть `npm run build`:\n  ' + stale.join('\n  '));
    process.exit(1);
  }
  console.log('data/ актуальні.');
} else {
  fs.rmSync(dataDir, { recursive: true, force: true });
  for (const [p, content] of out) {
    const abs = path.join(root, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  const nEx = manifest.modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.exercises.length, 0), 0);
  console.log(`Зібрано: ${manifest.modules.length} модулів, ${manifest.modules.reduce((a, m) => a + m.lessons.length, 0)} уроків, ${nEx} завдань, ${problems.length} задач.`);
}
