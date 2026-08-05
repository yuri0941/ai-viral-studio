import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  File,
  X,
  Download,
  Copy,
  Check,
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// [v6.0] added - LuxuryDocumentViewer lightweight custom parser for AI Viral Studio

function escapeRegex(str) {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferType(name) {
  if (!name || !name.includes('.')) return 'txt';
  return name.split('.').pop().toLowerCase();
}

function TextWithHighlights({ text, query }) {
  if (!query || text === undefined || text === null) {
    return <>{text}</>;
  }
  const q = query.toLowerCase();
  const parts = String(text).split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function renderInline(text, query) {
  if (!text) return null;
  const segments = [];
  let i = 0;
  let buffer = '';

  const flush = () => {
    if (buffer) {
      segments.push(
        <TextWithHighlights key={segments.length} text={buffer} query={query} />
      );
      buffer = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '`') {
      flush();
      const end = text.indexOf('`', i + 1);
      if (end === -1) {
        buffer += text[i];
        i++;
        continue;
      }
      segments.push(<code key={segments.length}>{text.slice(i + 1, end)}</code>);
      i = end + 1;
      continue;
    }

    if (text.startsWith('**', i)) {
      flush();
      const end = text.indexOf('**', i + 2);
      if (end === -1) {
        buffer += text[i];
        i++;
        continue;
      }
      segments.push(
        <strong key={segments.length}>
          {renderInline(text.slice(i + 2, end), query)}
        </strong>
      );
      i = end + 2;
      continue;
    }

    if (text[i] === '*') {
      flush();
      const end = text.indexOf('*', i + 1);
      if (end === -1) {
        buffer += text[i];
        i++;
        continue;
      }
      segments.push(
        <em key={segments.length}>
          {renderInline(text.slice(i + 1, end), query)}
        </em>
      );
      i = end + 1;
      continue;
    }

    if (text[i] === '[') {
      const close = text.indexOf(']', i + 1);
      const openParen = close !== -1 ? text.indexOf('(', close) : -1;
      const closeParen = openParen !== -1 ? text.indexOf(')', openParen) : -1;
      if (
        close !== -1 &&
        openParen === close + 1 &&
        closeParen !== -1
      ) {
        flush();
        const linkText = text.slice(i + 1, close);
        const url = text.slice(openParen + 1, closeParen);
        segments.push(
          <a
            key={segments.length}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderInline(linkText, query)}
          </a>
        );
        i = closeParen + 1;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  flush();
  return segments;
}

function CodeBlock({ code, label, query }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <pre className="rounded-xl overflow-hidden my-4">
      {/* [v6.0] added - code block header with copy action */}
      <div className="doc-block-header flex items-center justify-between px-4 py-2">
        <span className="text-xs uppercase tracking-wider">{label || 'code'}</span>
        <button
          onClick={handleCopy}
          className="doc-icon-btn p-1.5 rounded-md transition-colors"
          aria-label="Copy code block"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <code className="block p-4">
        {lines.map((line, idx) => (
          <div key={idx} className="flex">
            <span className="line-number">{idx + 1}</span>
            <span className="flex-1 whitespace-pre">
              <TextWithHighlights text={line} query={query} />
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

function MarkdownView({ content, query }) {
  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push(
        <CodeBlock
          key={i}
          code={code.trimEnd()}
          label={lang || 'code'}
          query={query}
        />
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={i}>{renderInline(line.slice(4), query)}</h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={i}>{renderInline(line.slice(3), query)}</h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={i}>{renderInline(line.slice(2), query)}</h1>
      );
      i++;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') || lines[i].startsWith('* '))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={i}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, query)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push(
        <ol key={i}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, query)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    let paragraph = '';
    while (i < lines.length && lines[i].trim() !== '') {
      paragraph += lines[i] + ' ';
      i++;
    }
    blocks.push(
      <p key={i}>{renderInline(paragraph.trim(), query)}</p>
    );
  }

  return <div>{blocks}</div>;
}

function parseCSV(text) {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let idx = 0; idx < line.length; idx++) {
        const char = line[idx];
        if (char === '"') {
          if (inQuotes && line[idx + 1] === '"') {
            current += '"';
            idx++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
}

function CsvView({ content, query }) {
  const rows = useMemo(() => parseCSV(content), [content]);

  if (rows.length === 0) {
    return <p className="doc-empty">No CSV data to display.</p>;
  }

  return (
    <div className="overflow-auto">
      {/* [v6.0] added - glassmorphism CSV table */}
      <table>
        <thead>
          <tr>
            {rows[0].map((cell, idx) => (
              <th key={idx}>
                <TextWithHighlights text={cell} query={query} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>
                  <TextWithHighlights text={cell} query={query} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function jsonToNodes(json, query) {
  const regex =
    /"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?|(\{|\}|\[|\]|:|,)/g;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={lastIndex}>
          <TextWithHighlights
            text={json.slice(lastIndex, match.index)}
            query={query}
          />
        </span>
      );
    }
    const value = match[0];
    let type = 'text';
    if (/^"/.test(value)) {
      type = value.endsWith(':') ? 'keyword' : 'string';
    } else if (/true|false/.test(value)) {
      type = 'boolean';
    } else if (/null/.test(value)) {
      type = 'null';
    } else if (/-?\d/.test(value)) {
      type = 'number';
    } else {
      type = 'operator';
    }
    nodes.push(
      <span key={match.index} className={type}>
        <TextWithHighlights text={value} query={query} />
      </span>
    );
    lastIndex = match.index + value.length;
  }

  if (lastIndex < json.length) {
    nodes.push(
      <span key={lastIndex}>
        <TextWithHighlights text={json.slice(lastIndex)} query={query} />
      </span>
    );
  }

  return nodes;
}

function JsonView({ content, query }) {
  const [copied, setCopied] = useState(false);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch (e) {
      return content;
    }
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pretty).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <pre className="rounded-xl overflow-hidden my-2">
      {/* [v6.0] added - JSON pretty-print header with copy action */}
      <div className="doc-block-header flex items-center justify-between px-4 py-2">
        <span className="text-xs uppercase tracking-wider">json</span>
        <button
          onClick={handleCopy}
          className="doc-icon-btn p-1.5 rounded-md transition-colors"
          aria-label="Copy JSON"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <code className="block p-4">{jsonToNodes(pretty, query)}</code>
    </pre>
  );
}

function FileIcon({ type }) {
  switch (type) {
    case 'md':
    case 'txt':
      return <FileText className="text-violet-400" size={22} />;
    case 'json':
      return <FileJson className="text-cyan-400" size={22} />;
    case 'csv':
      return <FileSpreadsheet className="text-emerald-400" size={22} />;
    case 'js':
    case 'jsx':
    case 'css':
      return <FileCode className="text-amber-400" size={22} />;
    default:
      return <File className="text-white/60" size={22} />;
  }
}

export default function LuxuryDocumentViewer({
  content,
  fileName,
  fileType,
  onClose,
  onDownload,
}) {
  const [theme, setTheme] = useState('dark');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const searchRef = useRef(null);
  const bodyRef = useRef(null);

  const normalizedType = useMemo(() => {
    const raw = (fileType || '').replace(/^\./, '').toLowerCase();
    return raw || inferType(fileName);
  }, [fileType, fileName]);

  const matchCount = useMemo(() => {
    if (!query || !content) return 0;
    const matches = content.match(new RegExp(escapeRegex(query), 'gi'));
    return matches ? matches.length : 0;
  }, [content, query]);

  // [v6.0] added - reset to first match when query changes
  useEffect(() => {
    setCurrentMatch(0);
  }, [query]);

  // [v6.0] added - Ctrl+F search shortcut and Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // [v6.0] added - scroll active search match into view
  useEffect(() => {
    if (!showSearch || !query) return;
    const marks = bodyRef.current?.querySelectorAll('.search-highlight');
    if (marks && marks[currentMatch]) {
      marks[currentMatch].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatch, showSearch, query, normalizedType, content, theme]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content || '').then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  const renderBody = () => {
    switch (normalizedType) {
      case 'md':
        return <MarkdownView content={content || ''} query={query} />;
      case 'json':
        return <JsonView content={content || ''} query={query} />;
      case 'csv':
        return <CsvView content={content || ''} query={query} />;
      case 'js':
      case 'jsx':
      case 'css':
      case 'txt':
      default:
        return (
          <CodeBlock
            code={content || ''}
            label={normalizedType}
            query={query}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm p-3 sm:p-6">
      {/* [v6.0] added - document header with icon, actions and theme switcher */}
      <header className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon type={normalizedType} />
          <span className="font-semibold text-white truncate">
            {fileName || 'Untitled'}
          </span>
          <span className="text-xs text-white/40 uppercase hidden sm:inline">
            {normalizedType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* [v6.0] added - theme switcher (Dark / OLED / Light) */}
          <div className="flex items-center rounded-lg bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'dark'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
              aria-label="Dark theme"
            >
              <Moon size={14} />
            </button>
            <button
              onClick={() => setTheme('oled')}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'oled'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
              aria-label="OLED theme"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md transition-colors ${
                theme === 'light'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
              aria-label="Light theme"
            >
              <Sun size={14} />
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Download file"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleCopyAll}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Copy all content"
          >
            {copiedAll ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* [v6.0] added - search overlay with match count and navigation */}
      {showSearch && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <Search size={16} className="text-white/60" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-white placeholder-white/40 w-40 sm:w-64"
          />
          <span className="text-xs text-white/60 whitespace-nowrap">
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
          <button
            onClick={() => setCurrentMatch(Math.max(0, currentMatch - 1))}
            disabled={matchCount === 0}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Previous match"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() =>
              setCurrentMatch(Math.min(matchCount - 1, currentMatch + 1))
            }
            disabled={matchCount === 0}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            aria-label="Next match"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close search"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* [v6.0] added - document body with theme class and base card styles */}
      <div
        ref={bodyRef}
        className={`luxury-doc ${theme} bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6 overflow-auto flex-1`}
      >
        {renderBody()}
      </div>
    </div>
  );
}
