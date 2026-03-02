import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"; // ✅ cjs instead of esm
import remarkGfm from "remark-gfm";

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  // Safe clipboard — handles iOS Safari where clipboard API may not exist
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for iOS Safari
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed silently — don't crash
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-line">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-overlay border-b border-line">
        <span className="text-ink-muted text-xs font-medium">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-ink-muted hover:text-ink-primary transition-colors duration-150 text-xs"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Wrapped in try-catch via error boundary pattern — won't crash React */}
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: "var(--color-surface-raised)",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
          padding: "1rem",
        }}
        showLineNumbers={code.split("\n").length > 5}
        lineNumberStyle={{
          color: "var(--color-ink-muted)",
          minWidth: "2rem",
          paddingRight: "1rem",
          userSelect: "none",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

interface Props {
  content: string;
  isStreaming?: boolean;
}

const MarkdownRenderer = ({ content, isStreaming = false }: Props) => {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const isBlock = !!match;
      const codeStr = String(children).replace(/\n$/, "");

      if (isBlock) {
        return <CodeBlock language={match[1]} code={codeStr} />;
      }

      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-surface-overlay border border-line text-ink-primary font-mono text-[0.8rem]"
          {...props}
        >
          {children}
        </code>
      );
    },

    h1: ({ children }) => (
      <h1 className="text-ink-primary text-xl font-semibold mt-4 mb-2 leading-tight">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-ink-primary text-lg font-semibold mt-4 mb-2 leading-tight">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-ink-primary text-base font-semibold mt-3 mb-1.5 leading-tight">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p className="text-ink-primary text-sm leading-relaxed mb-3 last:mb-0">{children}</p>
    ),

    ul: ({ children }) => (
      <ul className="text-ink-primary text-sm leading-relaxed mb-3 pl-5 list-disc space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-ink-primary text-sm leading-relaxed mb-3 pl-5 list-decimal space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,

    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-line-strong pl-4 my-3 text-ink-secondary italic">
        {children}
      </blockquote>
    ),

    hr: () => <hr className="border-line my-4" />,

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-primary underline underline-offset-2 hover:text-accent transition-colors"
      >
        {children}
      </a>
    ),

    strong: ({ children }) => (
      <strong className="font-semibold text-ink-primary">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-ink-secondary">{children}</em>,

    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse border border-line rounded-xl overflow-hidden">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-surface-overlay">{children}</thead>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-ink-primary font-medium border-b border-line text-xs uppercase tracking-wider">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-ink-secondary border-b border-line last:border-b-0">
        {children}
      </td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-surface-overlay transition-colors">{children}</tr>
    ),
  };

  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-ink-secondary ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  );
};

export default MarkdownRenderer;
