// Прогрес користувача: зберігається в localStorage (з експортом/імпортом у файл).

const KEY = 'nubip-r-progress-v1';

const fresh = () => ({
  v: 1,
  done: {}, // exId -> { at, xp, hints, sol }
  attempts: {}, // exId -> { hints, sol, tries }
  drafts: {}, // exId -> код
  days: {}, // 'YYYY-MM-DD' -> кількість виконаних завдань
  badges: {}, // badgeId -> ts
  last: null, // { lesson, step }
  playground: '',
  theme: 'auto',
});

let S = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch (e) {
    /* приватний режим / заборонено — працюємо в пам'яті */
  }
  return fresh();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    /* ігноруємо переповнення */
  }
  listeners.forEach((fn) => fn(S));
}

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const today = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ---------- ранги ----------
export const RANKS = [
  [0, 'Новачок'],
  [150, 'Учень'],
  [400, 'Практик'],
  [800, 'Аналітик'],
  [1400, 'Моделіст'],
  [2200, 'Майстер R'],
];

export function rankInfo(xp) {
  let i = 0;
  RANKS.forEach(([min], idx) => {
    if (xp >= min) i = idx;
  });
  const next = RANKS[i + 1];
  return {
    name: RANKS[i][1],
    index: i,
    next: next ? next[1] : null,
    from: RANKS[i][0],
    to: next ? next[0] : null,
    progress: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1,
  };
}

// ---------- XP ----------
export function xpFor(ex, { hints = 0, sol = false } = {}) {
  if (sol) return 0;
  const base = ex.type === 'quiz' ? 5 : ex.difficulty === 'hard' ? 40 : ex.difficulty === 'medium' ? 25 : ex.difficulty === 'easy' ? 15 : 10;
  const factor = Math.max(0.4, 1 - 0.2 * hints);
  return Math.max(1, Math.round(base * factor));
}

// ---------- доступ ----------
export const isDone = (id) => !!S.done[id];
export const getDone = (id) => S.done[id];
export const totalXP = () => Object.values(S.done).reduce((a, d) => a + (d.xp || 0), 0);
export const doneCount = () => Object.keys(S.done).length;
export const getAttempt = (id) => S.attempts[id] || { hints: 0, sol: false, tries: 0 };

export function setAttempt(id, patch) {
  S.attempts[id] = { ...getAttempt(id), ...patch };
  persist();
}

export function complete(ex) {
  const id = ex.id;
  const first = !S.done[id];
  const att = getAttempt(id);
  let xp = 0;
  if (first) {
    xp = xpFor(ex, att);
    S.done[id] = { at: Date.now(), xp, hints: att.hints, sol: !!att.sol };
    const d = today();
    S.days[d] = (S.days[d] || 0) + 1;
  }
  persist();
  return { first, xp };
}

export const getDraft = (id) => S.drafts[id];
export function setDraft(id, code) {
  S.drafts[id] = code;
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    /* ігноруємо */
  }
}
export function clearDraft(id) {
  delete S.drafts[id];
  persist();
}

export const getLast = () => S.last;
export function setLast(lesson, step) {
  S.last = { lesson, step };
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    /* ігноруємо */
  }
}

export const getPlayground = () => S.playground;
export function setPlayground(code) {
  S.playground = code;
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    /* ігноруємо */
  }
}

export const getTheme = () => S.theme || 'auto';
export function setTheme(t) {
  S.theme = t;
  persist();
}

// ---------- серія днів ----------
export function streak() {
  const d = new Date();
  let n = 0;
  // якщо сьогодні ще нічого не робили — серія тримається від учора
  if (!S.days[today(d)]) d.setDate(d.getDate() - 1);
  while (S.days[today(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const days = () => S.days;

// ---------- досягнення ----------
export function computeStats(manifest) {
  const doneIds = S.done;
  const lessons = manifest.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.id })));
  const lessonDone = (l) => l.exercises.every((e) => doneIds[e.id]);
  const modulesDone = manifest.modules.filter((m) => m.lessons.every(lessonDone)).map((m) => m.id);
  const probDone = manifest.problems.filter((p) => doneIds[p.id]);
  return {
    count: Object.keys(doneIds).length,
    lessonsDone: lessons.filter(lessonDone).length,
    modulesDone,
    allModules: manifest.modules.length,
    streak: streak(),
    problems: probDone.length,
    hard: probDone.filter((p) => p.difficulty === 'hard').length,
    noHint: Object.values(doneIds).filter((d) => !d.hints && !d.sol).length,
  };
}

export const BADGES = (manifest) => [
  { id: 'first', em: '🌱', title: 'Перший крок', desc: 'Виконайте перше завдання', ok: (s) => s.count >= 1 },
  { id: 'ex10', em: '✏️', title: '10 завдань', desc: 'Виконайте 10 завдань', ok: (s) => s.count >= 10 },
  { id: 'ex50', em: '💪', title: '50 завдань', desc: 'Виконайте 50 завдань', ok: (s) => s.count >= 50 },
  { id: 'ex100', em: '🔥', title: '100 завдань', desc: 'Виконайте 100 завдань', ok: (s) => s.count >= 100 },
  { id: 'ex200', em: '🏆', title: '200 завдань', desc: 'Виконайте 200 завдань', ok: (s) => s.count >= 200 },
  { id: 'lesson1', em: '📘', title: 'Урок пройдено', desc: 'Завершіть свій перший урок', ok: (s) => s.lessonsDone >= 1 },
  { id: 'lesson10', em: '📚', title: '10 уроків', desc: 'Завершіть 10 уроків', ok: (s) => s.lessonsDone >= 10 },
  ...manifest.modules.map((m) => ({
    id: 'mod-' + m.id,
    em: m.icon,
    title: m.title,
    desc: 'Завершіть усі уроки модуля',
    ok: (s) => s.modulesDone.includes(m.id),
  })),
  { id: 'streak3', em: '📅', title: 'Серія 3 дні', desc: 'Вчіться 3 дні поспіль', ok: (s) => s.streak >= 3 },
  { id: 'streak7', em: '⚡', title: 'Серія 7 днів', desc: 'Вчіться 7 днів поспіль', ok: (s) => s.streak >= 7 },
  { id: 'streak30', em: '🌟', title: 'Серія 30 днів', desc: 'Вчіться 30 днів поспіль', ok: (s) => s.streak >= 30 },
  { id: 'nohint', em: '🧠', title: 'Самостійний мислитель', desc: '15 завдань без підказок і розв’язків', ok: (s) => s.noHint >= 15 },
  { id: 'prob5', em: '🧩', title: 'Розв’язувач задач', desc: 'Розв’яжіть 5 задач з розділу «Задачі»', ok: (s) => s.problems >= 5 },
  { id: 'hard1', em: '🏔️', title: 'Підкорювач вершин', desc: 'Розв’яжіть складну задачу', ok: (s) => s.hard >= 1 },
  { id: 'hard5', em: '🚀', title: 'Профі', desc: 'Розв’яжіть 5 складних задач', ok: (s) => s.hard >= 5 },
  { id: 'course', em: '🎓', title: 'Випускник курсу', desc: 'Завершіть усі модулі', ok: (s) => s.modulesDone.length === s.allModules },
];

/** Повертає щойно здобуті досягнення (і запам'ятовує їх). */
export function awardBadges(manifest) {
  const stats = computeStats(manifest);
  const gained = [];
  for (const b of BADGES(manifest)) {
    if (!S.badges[b.id] && b.ok(stats)) {
      S.badges[b.id] = Date.now();
      gained.push(b);
    }
  }
  if (gained.length) persist();
  return gained;
}

export const earnedBadges = () => S.badges;

// ---------- експорт / імпорт / скидання ----------
export const exportJSON = () => JSON.stringify({ ...S, exportedAt: new Date().toISOString() }, null, 2);

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || data.v !== 1 || typeof data.done !== 'object') {
    throw new Error('Це не файл прогресу цього сайту.');
  }
  // об'єднання: завершені завдання — об'єднуємо, чернетки — беремо з файлу, якщо локально порожньо
  for (const [id, d] of Object.entries(data.done)) {
    const cur = S.done[id];
    if (!cur || (d.xp || 0) > (cur.xp || 0)) S.done[id] = d;
  }
  for (const [day, n] of Object.entries(data.days || {})) S.days[day] = Math.max(S.days[day] || 0, n);
  for (const [id, code] of Object.entries(data.drafts || {})) if (!(id in S.drafts)) S.drafts[id] = code;
  for (const [id, ts] of Object.entries(data.badges || {})) if (!S.badges[id]) S.badges[id] = ts;
  if (data.playground && !S.playground) S.playground = data.playground;
  persist();
}

export function resetAll() {
  S = fresh();
  persist();
}
