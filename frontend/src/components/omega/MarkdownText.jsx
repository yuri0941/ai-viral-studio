import React from 'react';

// [CHAT-UNIFY] Лёгкий markdown-рендер для ответов чата (без новых зависимостей).
// Покрывает то, что реально присылает OMEGA: заголовки, **bold**, *italic*, `code`,
// списки, таблицы |---|, ссылки, <br>. Сырой markdown текстом больше не виден.

function renderInline(text, keyPrefix = 'i') {
  // Жирный/курсив/код/ссылки — в одном проходе по токенам
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-${k++}`} className="font-semibold text-white">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      parts.push(<em key={`${keyPrefix}-${k++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('`')) {
      parts.push(<code key={`${keyPrefix}-${k++}`} className="px-1 py-0.5 rounded bg-white/10 font-mono text-[0.85em] text-violet-200">{tok.slice(1, -1)}</code>);
    } else {
      const label = tok.slice(1, tok.indexOf(']'));
      const url = tok.slice(tok.indexOf(']') + 2, -1);
      parts.push(<a key={`${keyPrefix}-${k++}`} href={url} target="_blank" rel="noreferrer" className="text-violet-300 hover:text-violet-200 underline underline-offset-2 break-all">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function isTableBlock(lines) {
  return lines.length >= 2 && /^\|?[\s:|-]+\|[\s:|-]+\|?$/.test(lines[1]) && lines[0].includes('|');
}

function parseRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function Table({ lines }) {
  const header = parseRow(lines[0]);
  const rows = lines.slice(2).filter(l => l.includes('|')).map(parseRow);
  return (
    <div className="overflow-x-auto my-2 rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/[0.06]">
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-white/90 whitespace-nowrap">{renderInline(h, `th${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-white/[0.06]">
              {r.map((c, ci) => (
                <td key={ci} className="px-3 py-2 text-gray-300 align-top">{renderInline(c, `td${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListBlock({ lines, ordered }) {
  const items = lines.map(l => l.replace(ordered ? /^\d+[.)]\s*/ : /^[-*•]\s*/, ''));
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`my-1.5 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'} pl-5 marker:text-violet-400`}>
      {items.map((item, i) => (
        <li key={i} className="text-gray-200">{renderInline(item, `li${i}`)}</li>
      ))}
    </Tag>
  );
}

export function MarkdownText({ text, className = '' }) {
  if (!text || typeof text !== 'string') return null;
  // <br> из ответов модели — в реальные переносы, а не текстом
  const normalized = text.replace(/<br\s*\/?\s*>/gi, '\n');
  const lines = normalized.split('\n');

  const blocks = [];
  let buf = [];
  let k = 0;
  const flush = () => {
    if (!buf.length) return;
    const bl = buf;
    buf = [];
    const first = bl[0];
    if (isTableBlock(bl)) {
      blocks.push(<Table key={k++} lines={bl} />);
    } else if (/^#{1,4}\s/.test(first)) {
      const level = first.match(/^(#{1,4})/)[1].length;
      const content = first.replace(/^#{1,4}\s*/, '');
      const cls = level <= 2 ? 'text-base font-bold text-white mt-3 mb-1' : 'text-sm font-semibold text-white/95 mt-2 mb-1';
      blocks.push(<div key={k++} className={cls}>{renderInline(content, `h${k}`)}</div>);
      if (bl.length > 1) blocks.push(<Paragraph key={k++} lines={bl.slice(1)} />);
    } else if (bl.every(l => /^[-*•]\s/.test(l))) {
      blocks.push(<ListBlock key={k++} lines={bl} ordered={false} />);
    } else if (bl.every(l => /^\d+[.)]\s/.test(l))) {
      blocks.push(<ListBlock key={k++} lines={bl} ordered />);
    } else {
      blocks.push(<Paragraph key={k++} lines={bl} />);
    }
  };

  for (const line of lines) {
    if (line.trim() === '') { flush(); continue; }
    // Заголовок в середине абзаца — выносим в отдельный блок
    if (/^#{1,4}\s/.test(line)) { flush(); buf.push(line); flush(); continue; }
    buf.push(line);
  }
  flush();

  return <div className={`text-sm leading-relaxed ${className}`}>{blocks}</div>;
}

function Paragraph({ lines }) {
  return (
    <p className="my-1.5 text-gray-200">
      {lines.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {renderInline(l, `p${i}`)}
        </React.Fragment>
      ))}
    </p>
  );
}

export default MarkdownText;
