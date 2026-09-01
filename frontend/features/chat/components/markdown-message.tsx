'use client';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';

function cleanContent(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  if (/^Here'?s a thinking process:/i.test(cleaned.trim())) {
    const splitIndex = cleaned.search(/\n\n(?=[#*A-Z]|\*\*|[A-Z0-9])/);
    if (splitIndex !== -1) {
      cleaned = cleaned.slice(splitIndex).trim();
    }
  }
  cleaned = cleaned.replace(/\n\s*Workspace Instructions[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\n\s*\[Internal Grounding Guidelines[\s\S]*$/i, '');
  return cleaned.trim() || raw;
}

export function MarkdownMessage({ content }: { content: string }) {
  const displayContent = cleanContent(content);
  return (
    <div className="markdown-message space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => (
            <code {...props} className={`${className ?? ''} rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]`}>
              {children}
            </code>
          ),
          pre: ({ children }) => <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">{children}</pre>,
          p: ({ children }) => <p className="leading-7">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-4 text-muted-foreground">{children}</blockquote>,
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}
