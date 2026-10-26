// Завантаження зібраних даних курсу (data/*.json) з кешуванням.

const cache = new Map();

async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`Не вдалося завантажити ${path} (${r.status})`);
        return r.json();
      }),
    );
    cache.get(path).catch(() => cache.delete(path));
  }
  return cache.get(path);
}

export const loadManifest = () => getJSON('data/manifest.json');
export const loadLesson = (id) => getJSON(`data/lessons/${id}.json`);
export const loadProblems = () => getJSON('data/problems.json');
export const loadReference = () => getJSON('data/reference.json');

/** Лінійний порядок усіх завдань курсу (для «Продовжити»). */
export function flatSteps(manifest) {
  const out = [];
  for (const m of manifest.modules) {
    for (const l of m.lessons) {
      out.push({ module: m, lesson: l, step: 0, id: null });
      l.exercises.forEach((e, i) => out.push({ module: m, lesson: l, step: i + 1, id: e.id }));
    }
  }
  return out;
}

export function lessonLocation(manifest, lessonId) {
  for (const m of manifest.modules) {
    const idx = m.lessons.findIndex((l) => l.id === lessonId);
    if (idx >= 0) return { module: m, lesson: m.lessons[idx], index: idx };
  }
  return null;
}

/** Наступний урок після вказаного (може бути в наступному модулі). */
export function nextLesson(manifest, lessonId) {
  const all = manifest.modules.flatMap((m) => m.lessons);
  const i = all.findIndex((l) => l.id === lessonId);
  return i >= 0 && i + 1 < all.length ? all[i + 1] : null;
}
