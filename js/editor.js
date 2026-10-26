// Обгортка над CodeMirror 5 (завантажується окремим скриптом як глобальний CodeMirror).
import { h } from './util.js';

const WORDS = `abs all any anyNA aggregate apply array arrange as.character as.Date as.factor as.integer as.logical as.numeric attr
barplot boxplot break by c cat cbind ceiling character choose chisq.test class coef colMeans colnames colSums complete.cases cor cor.test cos
crossprod cummax cummin cumprod cumsum curve cut data.frame date det diag diff dim dimnames dnorm do.call dpois dbinom duplicated
else eigen exp factor factorial FALSE floor for format function gamma gsub head hist ifelse integer integrate intersect
is.character is.data.frame is.factor is.function is.na is.null is.numeric lapply legend length letters levels lines list lm
log log10 log2 logical lowess lwd main mapply match matrix max mean median merge message min mode names nchar ncol next nlevels
nls nrow numeric optim optimize order outer paste paste0 pbinom pch pie plot pnorm points poly ppois predict print prod
prop.table pt qnorm qt quantile range rbind rbinom Reduce rep replicate residuals return rev rexp rnorm round rowMeans rownames
rowSums rpois runif sample sapply scale sd seq seq_along seq_len set.seed setdiff sign sin solve sort split sprintf sqrt
str strsplit sub subset substr sum summary switch t t.test table tail tan tapply toupper tolower transform trimws TRUE
uniroot union unique unlist unsplit var vapply which which.max which.min while with xlab ylab abline text title par`
  .split(/\s+/)
  .filter(Boolean);

function rHint(cm) {
  const cur = cm.getCursor();
  const token = cm.getTokenAt(cur);
  const start = token.start;
  const word = cm.getRange({ line: cur.line, ch: start }, cur).replace(/^[^\w.]+/, '');
  if (!word) return null;
  const doc = cm.getValue().match(/[A-Za-z_.][\w.]*/g) || [];
  const set = new Set([...WORDS, ...doc]);
  const list = [...set].filter((w) => w.startsWith(word) && w !== word).sort().slice(0, 40);
  return { list, from: { line: cur.line, ch: cur.ch - word.length }, to: cur };
}

/**
 * Створює редактор у parent. opts: value, onRun, onSubmit, onChange, minLines, maxLines, readOnly, lineNumbers
 */
export function createEditor(parent, opts = {}) {
  const CM = window.CodeMirror;
  const cm = CM(parent, {
    value: opts.value ?? '',
    mode: 'r',
    theme: 'nb',
    lineNumbers: opts.lineNumbers ?? true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    lineWrapping: true,
    viewportMargin: Infinity,
    readOnly: opts.readOnly ? true : false,
    extraKeys: {
      'Ctrl-Enter': () => opts.onRun && opts.onRun(),
      'Cmd-Enter': () => opts.onRun && opts.onRun(),
      'Shift-Ctrl-Enter': () => opts.onSubmit && opts.onSubmit(),
      'Shift-Cmd-Enter': () => opts.onSubmit && opts.onSubmit(),
      'Ctrl-/': 'toggleComment',
      'Cmd-/': 'toggleComment',
      'Ctrl-Space': (c) => c.showHint({ hint: rHint, completeSingle: false }),
      Tab: (c) => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  ', 'end')),
      'Shift-Tab': (c) => c.indentSelection('subtract'),
    },
  });
  const minH = (opts.minLines ?? 4) * 21 + 8;
  cm.getScrollerElement().style.minHeight = minH + 'px';
  if (opts.maxLines) {
    cm.getScrollerElement().style.maxHeight = opts.maxLines * 21 + 8 + 'px';
    cm.getScrollerElement().style.overflowY = 'auto';
  }
  if (opts.onChange) cm.on('change', () => opts.onChange(cm.getValue()));
  return cm;
}

/** Підсвічений статичний блок коду. */
export function staticCode(code, { lang = 'r', output = false } = {}) {
  const pre = h('pre', { class: 'static-code cm-s-nb' + (output ? ' output' : '') });
  if (lang === 'r' && window.CodeMirror && window.CodeMirror.runMode) {
    window.CodeMirror.runMode(code, 'r', pre);
    pre.classList.add('cm-s-nb');
  } else {
    pre.textContent = code;
  }
  return pre;
}

/** Рефреш після показу прихованого контейнера. */
export const refresh = (cm) => setTimeout(() => cm.refresh(), 0);
