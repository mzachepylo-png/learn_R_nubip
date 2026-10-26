// Рантайм R у браузері на базі WebR (https://docs.r-wasm.org/webr/).
import { execCall, checkCall, parseExec, parseCheck } from './rcore.js';

const CDN = ['https://webr.r-wasm.org/v0.6.0/', 'https://webr.r-wasm.org/latest/'];
const PLOT = { width: 720, height: 460, pointsize: 14, bg: 'white' };

let webR = null;
let shelter = null;
let bootPromise = null;
let status = 'idle'; // idle | loading | ready | busy | error
let statusText = '';
let chain = Promise.resolve();
let abortCurrent = null;
const listeners = new Set();

function setStatus(s, text = '') {
  status = s;
  statusText = text;
  listeners.forEach((fn) => fn(status, statusText));
}

export const onStatus = (fn) => {
  listeners.add(fn);
  fn(status, statusText);
  return () => listeners.delete(fn);
};
export const getStatus = () => ({ status, text: statusText });

function candidates() {
  const q = new URLSearchParams(location.search).get('webr');
  return q ? [q.endsWith('/') ? q : q + '/'] : CDN;
}

async function boot() {
  setStatus('loading', 'Завантаження R…');
  let lastErr;
  for (const base of candidates()) {
    try {
      const mod = await import(/* webpackIgnore: true */ base + 'webr.mjs');
      const inst = new mod.WebR({ baseUrl: base, channelType: mod.ChannelType.PostMessage, interactive: false });
      await inst.init();
      const core = await (await fetch('r/core.R')).text();
      await inst.evalRVoid(core);
      webR = inst;
      shelter = await new inst.Shelter();
      setStatus('ready', 'R готовий');
      return;
    } catch (e) {
      lastErr = e;
      console.warn('WebR: не вдалося завантажити з', base, e);
    }
  }
  setStatus('error', 'Не вдалося завантажити R');
  throw lastErr || new Error('WebR недоступний');
}

/** Запускає завантаження R (можна викликати багато разів). */
export function ensureR() {
  if (webR) return Promise.resolve();
  if (!bootPromise) {
    bootPromise = boot().catch((e) => {
      bootPromise = null;
      throw e;
    });
  }
  return bootPromise;
}

/** Виконує задачу в черзі (R однопотоковий). */
function exclusive(task) {
  const run = chain.then(async () => {
    await ensureR();
    setStatus('busy', 'Виконується…');
    try {
      return await new Promise((resolve, reject) => {
        abortCurrent = () => reject(new Error('stopped'));
        task().then(resolve, reject);
      });
    } finally {
      abortCurrent = null;
      if (webR) setStatus('ready', 'R готовий');
    }
  });
  chain = run.catch(() => {});
  return run;
}

/** Примусово зупиняє виконання (перезапускає R). */
export async function stopR() {
  if (abortCurrent) abortCurrent();
  const old = webR;
  webR = null;
  shelter = null;
  bootPromise = null;
  try {
    old && old.close();
  } catch (e) {
    /* ігноруємо */
  }
  setStatus('idle', 'R перезапущено');
  ensureR().catch(() => {});
}

async function evalChars(code) {
  const r = await webR.evalR(code);
  const arr = await r.toArray();
  await webR.destroy(r);
  return arr;
}

async function execCaptured(code, setup, session) {
  const cap = await shelter.captureR(execCall(code, setup, session), {
    captureGraphics: PLOT,
    captureStreams: false,
    captureConditions: false,
  });
  const arr = await cap.result.toArray();
  const images = cap.images || [];
  await shelter.purge();
  return { ...parseExec(arr), images };
}

/**
 * Виконує код. Повертає { output, ok, plots, images }.
 * session — ім'я постійного середовища ('' = одноразове).
 */
export function run(code, { setup = '', session = '' } = {}) {
  return exclusive(() => execCaptured(code, setup, session));
}

/** Виконує код користувача і перевіряє його за специфікацією завдання. */
export function runAndCheck(ex, code) {
  return exclusive(async () => {
    const res = await execCaptured(code, ex.setup, '');
    if (!res.ok) return { ...res, check: { ok: false, messages: [], errored: true } };
    const check = parseCheck(await evalChars(checkCall(ex.check, ex.setup, ex.solution)));
    return { ...res, check };
  });
}

/** Скидає змінні постійного середовища. */
export function resetSession(name) {
  return exclusive(async () => {
    await evalChars(`.nb_reset_session(${JSON.stringify(name)}); "1"`);
  });
}

/** Малює ImageBitmap-и у canvas-елементи. */
export function imagesToCanvases(images) {
  return images.map((bmp) => {
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    return c;
  });
}
