import { useState, useEffect, useCallback } from "react";
import { Menu, X, Sun, Moon, Star, Globe } from "lucide-react";

interface HeaderProps {
  lang: "en" | "zh";
  t: {
    features: string;
    howItWorks: string;
    comparison: string;
    faq: string;
    github: string;
    toggleTheme: string;
    langLabel: string;
  };
}

const NAV_ITEMS = [
  { key: "features", href: "#features" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "comparison", href: "#comparison" },
  { key: "faq", href: "#faq" },
] as const;

const GITHUB_URL = "https://github.com/xkcoding/deeplens";

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

export default function Header({ lang, t }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const next = html.classList.contains("dark") ? "light" : "dark";
    if (next === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("deeplens-theme", next);
    setIsDark(next === "dark");
  }, []);

  const switchLang = useCallback(() => {
    const target = lang === "en" ? "/zh/" : "/en/";
    window.posthog?.capture("lang_switch", { from: lang, to: lang === "en" ? "zh" : "en" });
    window.location.href = target;
  }, [lang]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const altLang = lang === "en" ? "zh" : "en";

  return (
    <header
      role="banner"
      className={[
        "sticky top-0 z-50 h-[var(--height-header)] transition-[background-color,box-shadow] duration-[var(--transition-duration-normal)]",
        scrolled
          ? "bg-neutral-0/80 shadow-sm backdrop-blur-lg dark:bg-neutral-950/80"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-full max-w-[var(--width-content)] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <a
          href={`/${lang}/`}
          className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
          aria-label="DeepLens home"
        >
          DeepLens
        </a>

        {/* Desktop navigation */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              onClick={() => window.posthog?.capture("nav_click", { item: item.key, device: "desktop" })}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              {t[item.key]}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Language switcher */}
          <button
            type="button"
            onClick={switchLang}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={`Switch language to ${altLang === "en" ? "English" : "Chinese"}`}
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {t.langLabel}
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-2 text-neutral-600 transition-colors duration-[var(--transition-duration-fast)] hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={t.toggleTheme}
          >
            {isDark ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* GitHub star button */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors duration-[var(--transition-duration-fast)] hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            {t.github}
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile navigation panel */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-[var(--height-header)] z-40 border-t border-neutral-200 bg-neutral-0 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 md:hidden"
        >
          <nav className="flex flex-col px-4 py-3" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={() => {
                  window.posthog?.capture("nav_click", { item: item.key, device: "mobile" });
                  closeMobile();
                }}
                className="rounded-md px-3 py-2.5 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {t[item.key]}
              </a>
            ))}

            <hr className="my-2 border-neutral-200 dark:border-neutral-800" />

            {/* Mobile actions */}
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={switchLang}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                aria-label={`Switch language to ${altLang === "en" ? "English" : "Chinese"}`}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                {t.langLabel}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                aria-label={t.toggleTheme}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobile}
              className="mx-3 mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              {t.github}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
