import { useState, useCallback } from "react";
import {
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Monitor,
  Sparkles,
  Download,
  ExternalLink,
} from "lucide-react";
import { HeroMock } from "./MockScreens";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

interface HeroProps {
  t: {
    badge: string;
    title: string;
    titleHighlight: string;
    namingStory: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    installTabs: { gui: string; cli: string };
    guiDownload: string;
    guiPlatforms: string;
    guiReleasesLink: string;
    guiBrewCmd: string;
    guiBrewLabel: string;
    cliCommands: string[];
    orLabel: string;
  };
}

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

const GITHUB_URL = "https://github.com/xkcoding/deeplens";
const RELEASES_URL = "https://github.com/xkcoding/deeplens/releases";

export default function Hero({ t }: HeroProps) {
  const [installTab, setInstallTab] = useState<"gui" | "cli">("gui");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedIdx(idx);
    window.posthog?.capture("install_copy", { command: text });
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-[var(--height-header)]"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-500/5" />
        <div className="absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-secondary-400/10 blur-3xl dark:bg-secondary-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,113,108,0.07)_1px,transparent_0)] bg-[length:32px_32px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(168,162,158,0.04)_1px,transparent_0)]" />
      </div>

      <div className="relative mx-auto max-w-[var(--width-content)] px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left: text content */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* Badge */}
            <div className="animate-fade-in mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t.badge}
            </div>

            {/* Title */}
            <h1 className="animate-slide-up text-3xl font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl lg:text-5xl">
              {t.title}{" "}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                {t.titleHighlight}
              </span>
            </h1>

            {/* Naming story */}
            <p className="animate-fade-in mt-2 text-sm italic text-neutral-500 dark:text-neutral-500">
              {t.namingStory}
            </p>

            {/* Description */}
            <p className="animate-fade-in-up mt-3 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              {t.description}
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-in-up mt-5 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href="#how-it-works"
                onClick={() => window.posthog?.capture("hero_cta_click", { action: "get_started" })}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-md shadow-primary-500/20 transition-all duration-[var(--transition-duration-normal)] hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {t.ctaPrimary}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-[var(--transition-duration-fast)] group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => window.posthog?.capture("hero_cta_click", { action: "github" })}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-neutral-0 px-6 py-3 text-base font-semibold text-neutral-700 transition-all duration-[var(--transition-duration-normal)] hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
              >
                <GitHubIcon className="h-4 w-4" />
                {t.ctaSecondary}
              </a>
            </div>

            {/* Install section — tabbed: GUI | CLI */}
            <div className="animate-fade-in-up mt-5 w-full max-w-md">
              {/* Tab buttons */}
              <div className="mb-3 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => { setInstallTab("gui"); window.posthog?.capture("install_tab_switch", { tab: "gui" }); }}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-[var(--transition-duration-fast)]",
                    installTab === "gui"
                      ? "bg-neutral-0 text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
                  ].join(" ")}
                >
                  <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.installTabs.gui}
                </button>
                <button
                  type="button"
                  onClick={() => { setInstallTab("cli"); window.posthog?.capture("install_tab_switch", { tab: "cli" }); }}
                  className={[
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-[var(--transition-duration-fast)]",
                    installTab === "cli"
                      ? "bg-neutral-0 text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
                  ].join(" ")}
                >
                  <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.installTabs.cli}
                </button>
              </div>

              {/* Tab content */}
              {installTab === "gui" ? (
                <div className="flex flex-col gap-2.5">
                  <a
                    href={RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => window.posthog?.capture("hero_download_click", { platform: "macos" })}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-0 px-5 py-3 text-sm font-semibold text-neutral-800 transition-all duration-[var(--transition-duration-normal)] hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-primary-700 dark:hover:bg-primary-950 dark:hover:text-primary-300"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t.guiDownload}
                  </a>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {t.guiPlatforms}
                    </span>
                    <a
                      href={RELEASES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {t.guiReleasesLink}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>

                  {/* Homebrew alternative */}
                  <div className="mt-1">
                    <p className="mb-1.5 text-center text-xs text-neutral-400 dark:text-neutral-500">
                      {t.guiBrewLabel}
                    </p>
                    <div className="group relative flex items-center rounded-lg border border-neutral-200 bg-neutral-900 dark:border-neutral-700">
                      <code className="flex-1 overflow-x-auto px-4 py-2.5 font-mono text-sm text-neutral-100">
                        <span className="mr-2 select-none text-primary-400" aria-hidden="true">$</span>
                        {t.guiBrewCmd}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(t.guiBrewCmd, 99)}
                        className="mr-2 flex-shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-800 hover:text-neutral-200"
                        aria-label={copiedIdx === 99 ? "Copied" : "Copy command"}
                      >
                        {copiedIdx === 99 ? (
                          <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {t.cliCommands.map((cmd, idx) => (
                    <div key={cmd}>
                      {idx > 0 && (
                        <p className="mb-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
                          {t.orLabel}
                        </p>
                      )}
                      <div className="group relative flex items-center rounded-lg border border-neutral-200 bg-neutral-900 dark:border-neutral-700">
                        <code className="flex-1 overflow-x-auto px-4 py-2.5 font-mono text-sm text-neutral-100">
                          <span className="mr-2 select-none text-primary-400" aria-hidden="true">$</span>
                          {cmd}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(cmd, idx)}
                          className="mr-2 flex-shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-800 hover:text-neutral-200"
                          aria-label={copiedIdx === idx ? "Copied" : "Copy command"}
                        >
                          {copiedIdx === idx ? (
                            <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
                          ) : (
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: product preview mock */}
          <div className="hidden lg:block" aria-hidden="true">
            <HeroMock />
          </div>
        </div>
      </div>
    </section>
  );
}
