import { useState, useCallback } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface CTAProps {
  lang: "en" | "zh";
  t: {
    title: string;
    description: string;
    primaryButton: string;
    installLabel: string;
    installCmd: string;
  };
}

const GITHUB_RELEASES_URL = "https://github.com/xkcoding/deeplens/releases";

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

export default function CTA({ lang, t }: CTAProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(t.installCmd).then(() => {
      setCopied(true);
      window.posthog?.capture("cta_copy", { command: t.installCmd });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [t.installCmd]);

  return (
    <section
      id="cta"
      className="py-20 sm:py-28"
      aria-labelledby="cta-title"
    >
      <div className="mx-auto max-w-[var(--width-content)] px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-16 shadow-xl dark:from-primary-900/50 dark:to-secondary-900/50 sm:px-12 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            {/* Title */}
            <h2
              id="cta-title"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              {t.title}
            </h2>

            {/* Description */}
            <p className="mt-4 text-lg text-white/80">
              {t.description}
            </p>

            {/* Primary button */}
            <div className="mt-8">
              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => window.posthog?.capture("cta_click", { action: "releases", lang })}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-neutral-900 shadow-md transition-all duration-[var(--transition-duration-fast)] hover:bg-neutral-100 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t.primaryButton}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            {/* Install command */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-white/70">
                {t.installLabel}
              </p>
              <div className="mx-auto inline-flex max-w-md items-center gap-3 rounded-lg bg-neutral-900/80 py-3 pr-3 pl-5 backdrop-blur-sm dark:bg-neutral-950/80">
                <code className="flex-1 text-left font-mono text-sm text-neutral-200">
                  {t.installCmd}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-800 hover:text-neutral-200"
                  aria-label={copied
                    ? (lang === "zh" ? "已复制" : "Copied")
                    : (lang === "zh" ? "复制命令" : "Copy command")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
