import { Fragment, type ReactNode } from 'react';

/**
 * Renders an article's Markdown (headings, paragraphs, lists, links) as it
 * will read on the website. Builds React elements only (no raw HTML); links
 * open in a new tab and only http(s) addresses become links.
 */

const INLINE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])|\*\*([^*]+)\*\*/g;

function link(href: string, label: ReactNode, key: string) {
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer"
      className="underline" style={{ color: 'var(--brand)' }}>
      {label}
    </a>
  );
}

export function renderInline(text: string, keyPrefix = ''): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;
    if (match[1] && match[2]) nodes.push(link(match[2], match[1], key));
    else if (match[3]) nodes.push(link(match[3], match[3], key));
    else if (match[4]) nodes.push(<strong key={key}>{match[4]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function ArticlePreview({ title, content }: { title?: string | null; content: string }) {
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  return (
    <article className="space-y-3 text-[15px] leading-relaxed" style={{ color: 'var(--text)' }}>
      {title && <h1 className="text-2xl font-bold leading-tight pb-1">{title}</h1>}
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const key = `b${index}`;
        const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
        if (heading && !trimmed.includes('\n')) {
          const level = heading[1].length;
          const text = renderInline(heading[2], key);
          // Subheadings as they read on the website: clearly larger than body text.
          if (level === 1) return <h2 key={key} className="text-xl font-bold leading-snug pt-5">{text}</h2>;
          if (level === 2) {
            return (
              <h2 key={key} className="text-lg font-bold leading-snug pt-5 pb-1"
                style={{ borderBottom: '1px solid var(--border, rgba(127,127,127,0.25))' }}>
                {text}
              </h2>
            );
          }
          return <h3 key={key} className="text-base font-semibold leading-snug pt-3">{text}</h3>;
        }
        const lines = trimmed.split('\n');
        if (lines.every(line => /^\s*([*+-]|\d+\.)\s+/.test(line))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const items = lines.map((line, i) => (
            <li key={`${key}-${i}`}>{renderInline(line.replace(/^\s*([*+-]|\d+\.)\s+/, ''), `${key}-${i}`)}</li>
          ));
          return ordered
            ? <ol key={key} className="list-decimal pl-5 space-y-1">{items}</ol>
            : <ul key={key} className="list-disc pl-5 space-y-1">{items}</ul>;
        }
        return (
          <p key={key}>
            {lines.map((line, i) => (
              <Fragment key={`${key}-${i}`}>{i > 0 && ' '}{renderInline(line, `${key}-${i}`)}</Fragment>
            ))}
          </p>
        );
      })}
    </article>
  );
}
