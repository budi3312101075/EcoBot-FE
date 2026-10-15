import { memo, useMemo } from "react";
import { parseInline, parseMarkdown } from "../../utils/markdown";
import useCopyFeedback from "../../hooks/useCopyFeedback";

const renderInline = (nodes) =>
  nodes.map((n, i) => {
    switch (n.t) {
      case "code":
        return <code key={i}>{n.v}</code>;
      case "strong":
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "img":
        return (
          <a key={i} href={n.src} target="_blank" rel="noopener noreferrer">
            <img src={n.src} alt={n.alt} loading="lazy" className="aqr-img" />
          </a>
        );
      case "a":
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.c)}
          </a>
        );
      case "doc":
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">
            {n.v}
          </a>
        );
      default:
        return n.v;
    }
  });

const Inline = ({ text }) => <>{renderInline(parseInline(text))}</>;

const CodeBlock = ({ lang, code }) => {
  const [copied, copy] = useCopyFeedback();
  return (
    <div className="code">
      <div className="code-h">
        <span>{lang}</span>
        <button type="button" onClick={() => copy(code)}>
          {copied ? (
            <>
              <i className="fa-solid fa-check text-emerald-400"></i> Copied
            </>
          ) : (
            <>
              <i className="fa-regular fa-copy"></i> Copy
            </>
          )}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const Block = ({ b }) => {
  switch (b.t) {
    case "code":
      return <CodeBlock lang={b.lang} code={b.code} />;
    case "table":
      return (
        <div className="tbl">
          <table>
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci}>
                      <Inline text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "h": {
      const Tag = `h${b.level}`;
      return (
        <Tag>
          <Inline text={b.text} />
        </Tag>
      );
    }
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag>
          {b.items.map((x, i) => (
            <li key={i}>
              <Inline text={x} />
            </li>
          ))}
        </Tag>
      );
    }
    default:
      return (
        <p>
          {b.lines.map((l, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <Inline text={l} />
            </span>
          ))}
        </p>
      );
  }
};

// Markdown -> elemen React (tanpa dangerouslySetInnerHTML). Semua teks lolos escape otomatis oleh React.
const MarkdownRenderer = ({ content }) => {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} b={b} />
      ))}
    </>
  );
};

export default memo(MarkdownRenderer);
