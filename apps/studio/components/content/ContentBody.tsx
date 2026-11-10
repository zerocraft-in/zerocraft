import { Fragment, type ReactNode } from "react";

export function safeImageUrl(value: string) {
  const url = value.trim();
  if (!url || /[\u0000-\u001f\\]/.test(url) || url.startsWith("//")) return null;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? url : null;
  } catch {
    return null;
  }
}

function renderInline(value: string, keyPrefix: string) {
  const result: ReactNode[] = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = imagePattern.exec(value))) {
    if (match.index > cursor) result.push(value.slice(cursor, match.index));
    const url = safeImageUrl(match[2]);
    result.push(url
      ? <img key={`${keyPrefix}-image-${match.index}`} src={url} alt={match[1]} className="my-4 max-h-80 rounded-2xl object-cover" />
      : match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) result.push(value.slice(cursor));
  return result;
}

export default function ContentBody({ content }: { content: string }) {
  const elements: ReactNode[] = [];
  let paragraph: { text: string; line: number }[] = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const keyPrefix = `paragraph-${paragraph[0].line}`;
    elements.push(<p key={keyPrefix}>{paragraph.map(({ text, line }, index) => <Fragment key={line}>{index > 0 && <br />}{renderInline(text, `${keyPrefix}-${line}`)}</Fragment>)}</p>);
    paragraph = [];
  };

  content.replace(/\\n/g, "\n").split("\n").forEach((line, index) => {
    const heading = line.trim().match(/^(#{1,3})\s+(.+)$/);
    if (!line.trim()) {
      flushParagraph();
      return;
    }
    if (heading) {
      flushParagraph();
      const className = "mt-8 text-2xl font-medium";
      if (heading[1].length === 1) elements.push(<h1 key={`heading-${index}`} className={className}>{heading[2]}</h1>);
      else if (heading[1].length === 2) elements.push(<h2 key={`heading-${index}`} className={className}>{heading[2]}</h2>);
      else elements.push(<h3 key={`heading-${index}`} className={className}>{heading[2]}</h3>);
      return;
    }
    paragraph.push({ text: line, line: index });
  });
  flushParagraph();
  return elements;
}
