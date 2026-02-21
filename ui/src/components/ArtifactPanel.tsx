import { useMemo, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
});

interface ArtifactPanelProps {
  content?: string;
  title?: string;
  children?: React.ReactNode;
}

/** Clean up common LLM mermaid code issues before rendering. */
function sanitizeMermaidCode(raw: string): string {
  let code = raw.trim();
  // Remove wrapping markdown fences if LLM accidentally included them
  code = code.replace(/^```(?:mermaid)?\n?/i, "").replace(/\n?```$/i, "");
  // Remove zero-width chars and BOMs
  code = code.replace(/[\u200B\uFEFF]/g, "");
  // Normalize line endings
  code = code.replace(/\r\n/g, "\n");
  return code.trim();
}

/** Incrementing counter for unique mermaid render IDs */
let mermaidIdCounter = 0;

/** Render mermaid code blocks as actual SVG diagrams. */
function MermaidBlock({ code: rawCode }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const code = useMemo(() => sanitizeMermaidCode(rawCode), [rawCode]);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${++mermaidIdCounter}`;

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (e) {
        // Clean up any orphaned element mermaid may have left in the DOM
        const orphan = document.getElementById(`d${id}`);
        orphan?.remove();
        if (!cancelled) {
          setError((e as Error).message || "Parse error");
          setSvg("");
        }
      }
    })();

    return () => {
      cancelled = true;
      // Clean up on unmount
      const orphan = document.getElementById(`d${id}`);
      orphan?.remove();
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
          Mermaid Diagram (parse error)
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-amber-800">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-8">
        <span className="text-xs text-neutral-400">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Custom code block: renders mermaid as diagrams, others as normal <code>. */
function CodeBlock({ className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { className?: string }) {
  const lang = className?.replace("language-", "");
  const code = String(children).replace(/\n$/, "");

  if (lang === "mermaid") {
    return <MermaidBlock code={code} />;
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

const remarkPlugins = [remarkGfm];

export function ArtifactPanel({
  content,
  title,
  children,
}: ArtifactPanelProps) {
  const components = useMemo(() => ({ code: CodeBlock }), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [content]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-neutral-200 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {title || "Preview"}
        </span>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {/* Priority 1: children (HITL outline editor, etc.) */}
        {children && (
          <div className="size-full overflow-y-auto">{children}</div>
        )}

        {/* Priority 2: markdown content */}
        {!children && content && (
          <div ref={scrollRef} className="size-full overflow-y-auto px-6 py-4">
            <article className="prose prose-neutral prose-sm max-w-none">
              <Markdown remarkPlugins={remarkPlugins} components={components}>
                {content}
              </Markdown>
            </article>
          </div>
        )}

        {/* Priority 3: empty state */}
        {!children && !content && (
          <div className="flex size-full items-center justify-center">
            <div className="text-center text-neutral-400">
              <p className="text-sm">No preview available</p>
              <p className="mt-1 text-xs">
                Start analysis to generate documentation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
