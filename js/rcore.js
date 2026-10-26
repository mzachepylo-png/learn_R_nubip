// Спільні (браузер + Node) допоміжні функції для виклику R-ядра з r/core.R

/** Серіалізує значення JS у літерал R. */
export function toR(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return 'character(0)';
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return `c(${v.map(toR).join(', ')})`;
    }
    return `list(${v.map(toR).join(', ')})`;
  }
  if (typeof v === 'object') {
    return `list(${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)} = ${toR(x)}`)
      .join(', ')})`;
  }
  throw new Error('toR: непідтримуваний тип ' + typeof v);
}

/** Код R для виконання користувацького коду. session — ім'я постійного середовища ('' = тимчасове). */
export function execCall(code, setup = '', session = '') {
  return `.nb_exec(${toR(code)}, ${toR(setup || '')}, ${toR(session || '')})`;
}

/** Специфікація перевірки з поля check завдання. */
export function checkSpec(check = {}) {
  return {
    vars: check.vars || [],
    output: !!check.output,
    uses: check.uses || [],
    avoid: check.avoid || [],
    plot: !!check.plot,
    custom: (check.custom || []).map((c) => ({ test: c.test, msg: c.msg })),
  };
}

export function checkCall(check, setup, solution) {
  return `.nb_check(${toR(checkSpec(check))}, ${toR(setup || '')}, ${toR(solution || '')})`;
}

/** Розбирає результат .nb_exec: вектор рядків c(вивід, ok, plots). */
export function parseExec(arr) {
  return { output: arr[0] ?? '', ok: arr[1] === '1', plots: parseInt(arr[2] || '0', 10) || 0 };
}

/** Розбирає результат .nb_check: c("1"/"0", повідомлення...). */
export function parseCheck(arr) {
  return { ok: arr[0] === '1', messages: arr.slice(1) };
}

/** Дружні пояснення до типових помилок R (українською). */
export function explainError(output) {
  const tips = [];
  const m = (re) => output.match(re);
  let r;
  if ((r = m(/object '([^']+)' not found/))) {
    tips.push(`Об'єкт «${r[1]}» не знайдено: перевірте написання (R розрізняє великі й малі літери) і чи ви створили його раніше.`);
  }
  if ((r = m(/could not find function "([^"]+)"/))) {
    tips.push(`Функції «${r[1]}» не існує: перевірте назву або чи не пропущено дужки/пакет.`);
  }
  if (/unexpected (symbol|string constant|numeric constant|'\)'|'\}'|'\]'|',')/.test(output) || /unexpected end of input/.test(output)) {
    tips.push('Синтаксична помилка: перевірте дужки, лапки та коми — чогось бракує або воно зайве.');
  }
  if (/non-numeric argument to binary operator/.test(output)) {
    tips.push('Арифметика з текстом: один з операндів — рядок (character). Перетворіть його через as.numeric().');
  }
  if (/there is no package called/.test(output)) {
    tips.push('Тут доступний лише базовий R без додаткових пакетів — усі завдання розв\'язуються базовими функціями.');
  }
  if (/subscript out of bounds/.test(output)) {
    tips.push('Індекс виходить за межі: перевірте розмір вектора/матриці/списку (length, dim).');
  }
  if (/arguments imply differing number of rows/.test(output)) {
    tips.push('Стовпці дата-фрейму мають різну довжину — вирівняйте їх.');
  }
  if (/non-conformable/.test(output)) {
    tips.push('Розміри матриць не узгоджені для цієї операції (перевірте dim()).');
  }
  return tips;
}
