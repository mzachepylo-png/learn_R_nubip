// Парсер Markdown-уроків у структуровані дані.
//
// Формат файлу уроку:
//   # Назва уроку
//   > Короткий опис (одне речення)
//
//   ...теорія у Markdown; блоки ```r — виконувані приклади; ```r static — лише показ...
//
//   ## Завдання: Назва [easy|medium|hard]
//   Текст завдання.
//   ```r setup        (прихований код, що виконується перед кодом користувача)
//   ```r starter      (початковий код у редакторі)
//   ```r solution     (еталонний розв'язок)
//   @hint Підказка (можна кілька)
//   @check vars=a,b output uses=f,g avoid=for plot
//   @test R-вираз => повідомлення, якщо тест не пройдено
//   @starterok        (стартовий код може проходити перевірку)
//
//   ## Тест: Назва
//   Питання
//   - [ ] варіант
//   - [x] правильний варіант
//   @explain Пояснення

const SECTION_RE = /^##\s+(Завдання|Тест):\s*(.+?)\s*$/;
const DIFFS = ['easy', 'medium', 'hard'];

export function parseLesson(text, ctx = {}) {
  const file = ctx.file || '<md>';
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const err = (i, msg) => {
    throw new Error(`${file}:${i + 1}: ${msg}`);
  };

  // 1. розбиваємо на секції поза огородженими блоками
  const sections = [{ kind: 'theory', title: '', start: 0, lines: [] }];
  let fence = null;
  lines.forEach((ln, i) => {
    const f = ln.match(/^(```+|~~~+)(.*)$/);
    if (f) {
      if (!fence) fence = f[1];
      else if (ln.startsWith(fence) && f[2].trim() === '') fence = null;
    }
    const m = !fence && ln.match(SECTION_RE);
    if (m) sections.push({ kind: m[1] === 'Тест' ? 'quiz' : 'code', title: m[2], start: i, lines: [] });
    else sections[sections.length - 1].lines.push(ln);
  });
  if (fence) err(lines.length - 1, 'незакритий блок коду');

  // 2. заголовок і короткий опис
  const head = sections[0].lines;
  let title = '';
  let summary = '';
  let k = 0;
  while (k < head.length && head[k].trim() === '') k++;
  if (head[k] && head[k].startsWith('# ')) {
    title = head[k].slice(2).trim();
    k++;
    while (k < head.length && head[k].trim() === '') k++;
    if (head[k] && head[k].startsWith('> ')) {
      summary = head[k].slice(2).trim();
      k++;
    }
  }
  const theory = head.slice(k).join('\n').trim();

  // 3. завдання
  const exercises = sections.slice(1).map((s, idx) => parseExercise(s, idx + 1, file, err));
  return { title, summary, theory, exercises };
}

function parseExercise(sec, n, file, err) {
  let title = sec.title;
  let difficulty = null;
  const dm = title.match(/\s*\[(easy|medium|hard)\]\s*$/);
  if (dm) {
    difficulty = dm[1];
    title = title.replace(dm[0], '').trim();
  }
  const ex = { n, type: sec.kind, title };
  if (difficulty) ex.difficulty = difficulty;
  const task = [];
  const hints = [];
  const customs = [];
  const options = [];
  let answer = -1;
  let check = null;
  const blocks = {};
  const L = sec.lines;
  for (let i = 0; i < L.length; i++) {
    const ln = L[i];
    const abs = sec.start + 1 + i;
    const f = ln.match(/^```+\s*r\s+(setup|starter|solution)\s*$/);
    if (f) {
      const buf = [];
      i++;
      while (i < L.length && !/^```+\s*$/.test(L[i])) buf.push(L[i++]);
      if (i >= L.length) err(abs, 'незакритий блок ' + f[1]);
      blocks[f[1]] = buf.join('\n').replace(/\s+$/, '');
      continue;
    }
    if (/^```/.test(ln)) {
      // звичайний блок коду в тексті завдання — копіюємо як є
      task.push(ln);
      i++;
      while (i < L.length && !/^```+\s*$/.test(L[i])) task.push(L[i++]);
      if (i < L.length) task.push(L[i]);
      continue;
    }
    let m;
    if ((m = ln.match(/^@(\w+)\s*(.*)$/))) {
      const [, dir, rest] = m;
      if (dir === 'hint') hints.push(rest.trim());
      else if (dir === 'explain') ex.explain = rest.trim();
      else if (dir === 'topic') ex.topic = rest.trim();
      else if (dir === 'starterok') ex.starterOk = true;
      else if (dir === 'check') check = parseCheck(rest, abs, err);
      else if (dir === 'test') {
        const idx = rest.lastIndexOf('=>');
        if (idx < 0) err(abs, '@test потребує формату «вираз => повідомлення»');
        customs.push({ test: rest.slice(0, idx).trim(), msg: rest.slice(idx + 2).trim() });
      } else err(abs, 'невідома директива @' + dir);
      continue;
    }
    if (sec.kind === 'quiz' && (m = ln.match(/^-\s+\[( |x|X)\]\s+(.*)$/))) {
      if (m[1] !== ' ') answer = options.length;
      options.push(m[2].trim());
      continue;
    }
    task.push(ln);
  }
  ex.task = task.join('\n').trim();
  if (sec.kind === 'quiz') {
    if (options.length < 2) err(sec.start, 'у тесті має бути щонайменше 2 варіанти');
    if (answer < 0) err(sec.start, 'у тесті не позначено правильну відповідь [x]');
    ex.options = options;
    ex.answer = answer;
  } else {
    if (blocks.solution === undefined) err(sec.start, 'завдання без ```r solution');
    ex.setup = blocks.setup || '';
    ex.starter = blocks.starter ?? '';
    ex.solution = blocks.solution;
    if (!check) check = { output: true };
    if (customs.length) check.custom = customs;
    ex.check = check;
  }
  if (hints.length) ex.hints = hints;
  return ex;
}

function parseCheck(rest, abs, err) {
  const c = {};
  for (const tok of rest.split(/\s+/).filter(Boolean)) {
    const [key, val] = tok.split('=');
    if (key === 'vars' || key === 'uses' || key === 'avoid') {
      if (!val) err(abs, `@check ${key}= без значень`);
      c[key] = val.split(',').filter(Boolean);
    } else if (key === 'output' || key === 'plot') c[key] = true;
    else err(abs, 'невідомий параметр @check: ' + key);
  }
  return c;
}

export { DIFFS };
