import { ExternalLink, Heart } from "lucide-react";

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

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

interface FooterProps {
  t: {
    copyright: string;
    madeWith: string;
    builtWith: string;
    links: {
      github: string;
      releases: string;
      issues: string;
    };
  };
}

const GITHUB_BASE = "https://github.com/xkcoding/deeplens";

const FOOTER_LINKS = [
  { key: "github" as const, href: GITHUB_BASE },
  { key: "releases" as const, href: `${GITHUB_BASE}/releases` },
  { key: "issues" as const, href: `${GITHUB_BASE}/issues` },
];

export default function Footer({ t }: FooterProps) {
  return (
    <footer
      role="contentinfo"
      className="border-t border-neutral-800 bg-neutral-900 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-[var(--width-content)] px-4 py-10 sm:px-6">
        {/* Top row: logo + links */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-neutral-100"
            aria-label="DeepLens home"
          >
            DeepLens
          </a>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-4 sm:gap-6">
              {FOOTER_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => window.posthog?.capture("footer_link_click", { link: link.key })}
                    className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors duration-[var(--transition-duration-fast)] hover:text-neutral-100"
                  >
                    {link.key === "github" && (
                      <GitHubIcon className="h-3.5 w-3.5" />
                    )}
                    {t.links[link.key]}
                    {link.key !== "github" && (
                      <ExternalLink
                        className="h-3 w-3 opacity-50"
                        aria-hidden="true"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <hr className="my-6 border-neutral-800" />

        {/* Bottom row: copyright + meta */}
        <div className="flex flex-col items-center gap-3 text-sm text-neutral-500 sm:flex-row sm:justify-between">
          <p>{t.copyright}</p>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              {t.madeWith}{" "}
              <Heart
                className="h-3.5 w-3.5 fill-red-500 text-red-500"
                aria-label="love"
              />
            </span>
            <span aria-hidden="true" className="text-neutral-700">
              |
            </span>
            <span>{t.builtWith}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
