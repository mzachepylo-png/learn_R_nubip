// Мінімальний Markdown-рендерер (достатній для уроків). Блоки коду повертаються окремо,
// щоб інтерфейс міг зробити їх виконуваними.
import { escapeHtml } from './util.js';

function inline(src) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|#[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(«"„])\*([^*\s][^*]*?)\*(?=$|[\s.,;:!?)»"”])/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[+i])}</code>`);
  return s;
}

const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l || '');
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/**
 * @returns {{html: string, blocks: {code: string, lang: string, mode: 'run'|'static'|'text'}[]}}
 * У html кожен блок коду замінено на <div class="md-block" data-i="N"></div>
 */
export function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    let m;
    if ((m = ln.match(/^(```+|~~~+)\s*(.*)$/))) {
      const info = m[2].trim().split(/\s+/);
      const lang = info[0] || '';
      const flags = info.slice(1);
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(m[1])) buf.push(lines[i++]);
      i++;
      const mode = lang === 'r' && !flags.includes('static') ? 'run' : lang === 'r' ? 'static' : 'text';
      blocks.push({ code: buf.join('\n'), lang, mode });
      out.push(`<div class="md-block" data-i="${blocks.length - 1}"></div>`);
      continue;
    }
    if (/^\s*$/.test(ln)) {
      i++;
      continue;
    }
    if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
      const level = Math.min(m[1].length + 1, 5);
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(ln)) {
      out.push('<hr>');
      i++;
      continue;
    }
    if (ln.includes('|') && isTableSep(lines[i + 1])) {
      const head = splitRow(ln);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') rows.push(splitRow(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    if (/^>\s?/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      const text = buf.join(' ').trim();
      const cls = /^(⚠|❗|🚫)/.test(text) ? 'warn' : /^(✅|🎯)/.test(text) ? 'ok' : '';
      out.push(`<blockquote class="${cls}"><p>${inline(text)}</p></blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(ln)) {
      const ordered = /^\s*\d+\./.test(ln);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i++].trim();
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    // абзац
    const buf = [ln];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(```|~~~|#{1,4}\s|>|\s*([-*]|\d+\.)\s)/.test(lines[i]) && !(lines[i].includes('|') && isTableSep(lines[i + 1]))) {
      buf.push(lines[i++]);
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return { html: out.join('\n'), blocks };
}

/** Рендерить лише інлайнову розмітку (для коротких підказок). */
export const renderInline = inline;
