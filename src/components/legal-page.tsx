import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HomeHeader, HomeFooter } from "./home-chrome";

interface LegalPageProps {
  /** Nom du fichier sans extension, ex: "mentions-legales" */
  doc: string;
}

const LANGS = ["fr", "en", "de", "nl", "es"];

export function LegalPage({ doc }: LegalPageProps) {
  const { i18n } = useTranslation();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const base = (i18n.language || "fr").slice(0, 2);
    const lang = LANGS.includes(base) ? base : "fr";
    fetch(`/docs/legal/${lang}/${doc}.md`)
      .then((res) => (res.ok ? res.text() : fetch(`/docs/legal/fr/${doc}.md`).then((r) => r.text())))
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent("Contenu non disponible.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [doc, i18n.language]);

  return (
    <div className="sz-home">
      <HomeHeader />
      <main>
        <div className="home-container sz-legal-content">
          {loading ? <p className="sz-legal-loading">…</p> : <MarkdownRenderer content={content} />}
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}

/** Rendu inline : **gras**, *italique*, `code`, [lien](url). */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = lm[2];
      const safe = /^(https?:|mailto:|\/|#)/.test(href) ? href : "#";
      out.push(
        <a key={k} href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
          {lm[1]}
        </a>,
      );
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function splitRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      const lvl = Math.min(h[1].length, 4);
      const kids = inline(h[2], `h${key}`);
      blocks.push(lvl === 1 ? <h1 key={key++}>{kids}</h1> : lvl === 2 ? <h2 key={key++}>{kids}</h2> : lvl === 3 ? <h3 key={key++}>{kids}</h3> : <h4 key={key++}>{kids}</h4>);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) { blocks.push(<hr key={key++} />); i++; continue; }
    if (t.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const hasHead = rows.length > 1 && /^\|?\s*:?-+/.test(rows[1].trim());
      const head = hasHead ? splitRow(rows[0]) : null;
      const body = (hasHead ? rows.slice(2) : rows).map(splitRow);
      const k = key++;
      blocks.push(
        <table key={k}>
          {head && <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `t${k}h${j}`)}</th>)}</tr></thead>}
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, `t${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    if (/^[-*+]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].trim().replace(/^[-*+]\s+/, ""));
      const k = key++;
      blocks.push(<ul key={k}>{items.map((it, j) => <li key={j}>{inline(it, `u${k}${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].trim().replace(/^\d+[.)]\s+/, ""));
      const k = key++;
      blocks.push(<ol key={k}>{items.map((it, j) => <li key={j}>{inline(it, `o${k}${j}`)}</li>)}</ol>);
      continue;
    }
    if (t.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) parts.push(lines[i++].trim().replace(/^>\s?/, ""));
      const k = key++;
      blocks.push(<blockquote key={k}>{inline(parts.join(" "), `q${k}`)}</blockquote>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() && !/^(#|\||[-*+]\s|\d+[.)]\s|>|-{3,})/.test((lines[i] ?? "").trim())) para.push(lines[i++].trim());
    if (!para.length) { para.push(t); i++; }
    const k = key++;
    blocks.push(<p key={k}>{inline(para.join(" "), `p${k}`)}</p>);
  }
  return <>{blocks}</>;
}
