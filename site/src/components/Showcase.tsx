import { useState, useCallback } from "react";
import { Telescope, ClipboardCheck, PenLine, SearchCode } from "lucide-react";
import { ExploreMock, ReviewMock, GenerateMock, SearchMock } from "./MockScreens";

interface ShowcaseTab {
  label: string;
  title: string;
  description: string;
  highlights: string[];
}

interface ShowcaseProps {
  t: {
    title: string;
    subtitle: string;
    tabs: ShowcaseTab[];
  };
}

const tabIcons = [Telescope, ClipboardCheck, PenLine, SearchCode];
const tabMocks = [ExploreMock, ReviewMock, GenerateMock, SearchMock];

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

export default function Showcase({ t }: ShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = t.tabs[activeIndex];

  const handleTabSwitch = useCallback((index: number, label: string) => {
    setActiveIndex(index);
    window.posthog?.capture("showcase_tab_switch", { tab: label, index });
  }, []);

  return (
    <section
      id="showcase"
      className="py-20 sm:py-28"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* ── Section header ─────────────────────────────────── */}
        <div className="text-center">
          <h2
            id="showcase-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">
            {t.subtitle}
          </p>
        </div>

        {/* ── Tab buttons ────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Showcase tabs"
          className="mt-12 flex justify-center gap-2 sm:gap-4"
        >
          {t.tabs.map((tab, index) => {
            const Icon = tabIcons[index];
            const isActive = index === activeIndex;

            return (
              <button
                key={tab.label}
                role="tab"
                aria-selected={isActive}
                aria-controls={`showcase-panel-${index}`}
                id={`showcase-tab-${index}`}
                onClick={() => handleTabSwitch(index, tab.label)}
                className={[
                  "relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                  "cursor-pointer select-none",
                  isActive
                    ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {Icon && (
                  <Icon
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute -bottom-px left-4 right-4 h-0.5 rounded-full bg-primary-500"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab panel ──────────────────────────────────────── */}
        <div
          key={activeIndex}
          role="tabpanel"
          id={`showcase-panel-${activeIndex}`}
          aria-labelledby={`showcase-tab-${activeIndex}`}
          className="mt-10 animate-fade-in rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900 sm:p-10"
        >
          <div className="grid items-center gap-10 lg:grid-cols-2">
            {/* Left: text content */}
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">
                {activeTab.title}
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-600 dark:text-neutral-400">
                {activeTab.description}
              </p>

              <ul className="mt-6 space-y-3" role="list">
                {activeTab.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 size-5 shrink-0 text-primary-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: app UI mock */}
            <div aria-hidden="true">
              {(() => {
                const MockComponent = tabMocks[activeIndex];
                return MockComponent ? <MockComponent /> : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
