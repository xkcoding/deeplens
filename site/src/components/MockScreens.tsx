/**
 * MockScreens — Pure CSS mockups of the DeepLens desktop app UI.
 *
 * Layout matches actual desktop app (ThreePanelLayout):
 *   LEFT  = Main content panel (ArtifactPanel / OutlineEditor)
 *   RIGHT = Activity sidebar (phases, documents, events)
 */

/* ─── Shared: Window Chrome ────────────────────────────────────── */
function WindowChrome({ title = "DeepLens" }: { title?: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
      <span className="h-2 w-2 rounded-full bg-red-400/60" />
      <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
      <span className="h-2 w-2 rounded-full bg-green-400/60" />
      <span className="ml-2 text-[10px] text-neutral-400 dark:text-neutral-600">
        {title}
      </span>
    </div>
  );
}

/* ─── Shared: App Header Bar ───────────────────────────────────── */
function MockHeader({
  projectName = "my-project",
  analyzing = false,
  progress,
}: {
  projectName?: string;
  analyzing?: boolean;
  progress?: string;
}) {
  return (
    <div className="flex h-8 items-center justify-between border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <div className="flex h-4 w-4 items-center justify-center rounded bg-primary-500">
          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="currentColor">
            <circle cx="8" cy="8" r="4" />
          </svg>
        </div>
        <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
          {projectName}
        </span>
        {analyzing && (
          <span className="text-[9px] text-primary-500">{progress ?? "Analyzing..."}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="rounded bg-primary-500 px-2 py-0.5 text-[8px] font-medium text-white">
          Analyze
        </span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[8px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          Preview
        </span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[8px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          Vectorize
        </span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[8px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          Update
        </span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-[8px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
          Export
        </span>
        <div className="ml-1 h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
}

/* ─── Shared: Phase Stepper ────────────────────────────────────── */
function PhaseStep({
  label,
  status,
}: {
  label: string;
  status: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-1.5">
      {status === "done" && (
        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-green-500">
          <svg className="h-2 w-2 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        </span>
      )}
      {status === "active" && (
        <span className="h-3 w-3 animate-pulse rounded-full border-2 border-primary-500 bg-primary-100 dark:bg-primary-900" />
      )}
      {status === "pending" && (
        <span className="h-3 w-3 rounded-full border border-neutral-300 dark:border-neutral-600" />
      )}
      <span
        className={[
          "text-[9px]",
          status === "active"
            ? "font-semibold text-primary-600 dark:text-primary-400"
            : status === "done"
              ? "text-neutral-500 dark:text-neutral-400"
              : "text-neutral-400 dark:text-neutral-500",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Shared: Activity Event Item ──────────────────────────────── */
function EventItem({
  icon,
  text,
  dim = false,
}: {
  icon: "tool" | "think" | "file";
  text: string;
  dim?: boolean;
}) {
  return (
    <div className={["flex items-start gap-1.5 py-0.5", dim ? "opacity-50" : ""].join(" ")}>
      {icon === "tool" && (
        <span className="mt-0.5 h-2.5 w-2.5 rounded bg-secondary-400/20 text-[7px] leading-[10px] text-center text-secondary-600 dark:text-secondary-400">
          T
        </span>
      )}
      {icon === "think" && (
        <span className="mt-0.5 h-2.5 w-2.5 rounded bg-purple-400/20 text-[7px] leading-[10px] text-center text-purple-600 dark:text-purple-400">
          B
        </span>
      )}
      {icon === "file" && (
        <span className="mt-0.5 h-2.5 w-2.5 rounded bg-blue-400/20 text-[7px] leading-[10px] text-center text-blue-600 dark:text-blue-400">
          F
        </span>
      )}
      <span className="text-[8px] leading-tight text-neutral-500 dark:text-neutral-400">{text}</span>
    </div>
  );
}

/* ─── Shared: Sidebar Section Header ──────────────────────────── */
function SidebarHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-neutral-100 px-2.5 py-1.5 dark:border-neutral-800">
      <span className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
    </div>
  );
}

/* ─── Shared: Nav Item ─────────────────────────────────────────── */
function NavItem({
  label,
  active = false,
  indent = false,
}: {
  label: string;
  active?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded px-2 py-0.5 text-[9px]",
        indent ? "ml-3" : "",
        active
          ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
          : "text-neutral-600 dark:text-neutral-400",
      ].join(" ")}
    >
      {indent && <span className="mr-1 text-neutral-300 dark:text-neutral-600">&#8627;</span>}
      {label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * HERO Mock — Full app view (generate complete state)
 * Layout: LEFT = markdown preview, RIGHT = activity sidebar
 * ═══════════════════════════════════════════════════════════════════ */
export function HeroMock() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 shadow-xl dark:border-neutral-800">
      <WindowChrome title="DeepLens — my-project" />
      <MockHeader projectName="my-project" />

      {/* Three-panel body: LEFT = main, RIGHT = sidebar */}
      <div className="flex h-[calc(100%-56px)] bg-neutral-50 dark:bg-neutral-950">
        {/* LEFT: Markdown preview (main content panel) */}
        <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
          {/* Locale toggle */}
          <div className="flex items-center gap-1 border-b border-neutral-100 px-3 py-1 dark:border-neutral-800">
            <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-[8px] font-medium text-primary-600 dark:text-primary-400">
              EN
            </span>
            <span className="px-1.5 py-0.5 text-[8px] text-neutral-400">ZH</span>
          </div>
          {/* Simulated markdown content */}
          <div className="flex-1 overflow-hidden p-3">
            <div className="h-3 w-3/4 rounded bg-neutral-900/80 dark:bg-neutral-100/80" />
            <div className="mt-2 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            {/* Code block */}
            <div className="mt-2.5 rounded bg-neutral-900 p-2 dark:bg-neutral-800">
              <div className="h-1.5 w-2/3 rounded bg-green-400/30" />
              <div className="mt-1 h-1.5 w-4/5 rounded bg-blue-400/30" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-purple-400/30" />
            </div>
            {/* More text */}
            <div className="mt-2.5 h-2 w-3/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            {/* Mermaid diagram placeholder */}
            <div className="mt-2.5 flex items-center justify-center rounded border border-dashed border-neutral-300 p-2 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <div className="h-4 w-10 rounded bg-primary-100 dark:bg-primary-900/30" />
                <span className="text-[6px] text-neutral-400">&rarr;</span>
                <div className="h-4 w-10 rounded bg-secondary-100 dark:bg-secondary-900/30" />
                <span className="text-[6px] text-neutral-400">&rarr;</span>
                <div className="h-4 w-10 rounded bg-primary-100 dark:bg-primary-900/30" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Activity sidebar */}
        <div className="hidden w-[30%] flex-col border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 min-[480px]:flex">
          <SidebarHeader label="Activity" />

          {/* Phase stepper */}
          <div className="space-y-1 border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
            <div className="mb-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Phase
            </div>
            <PhaseStep label="Explore" status="done" />
            <PhaseStep label="Review" status="done" />
            <PhaseStep label="Generate" status="done" />
          </div>

          {/* Documents */}
          <div className="flex-1 overflow-hidden px-1.5 py-1.5">
            <div className="mb-1 px-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Documents
            </div>
            <NavItem label="Overview" />
            <NavItem label="Architecture" active />
            <NavItem label="  Data Layer" indent />
            <NavItem label="  API Routes" indent />
            <NavItem label="Authentication" />
            <NavItem label="CLI Commands" />
            <NavItem label="Summary" />
          </div>
        </div>
      </div>

      {/* Overlay ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-900/5 dark:ring-white/5" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * SHOWCASE Mocks — One per tab (Explore, Review, Generate, Search)
 * Layout: LEFT = main content, RIGHT = activity sidebar
 * ═══════════════════════════════════════════════════════════════════ */

/** Tab 0: Explore — Agent actively exploring code */
export function ExploreMock() {
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <MockHeader projectName="react-app" analyzing progress="Exploring..." />
      <div className="flex h-[calc(100%-32px)]">
        {/* LEFT: Main — empty state with exploring indicator */}
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <svg className="h-4 w-4 animate-pulse text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
            Agent is exploring your codebase...
          </p>
          <p className="mt-1 text-[8px] text-neutral-400 dark:text-neutral-500">
            Reading files and building knowledge graph
          </p>
          {/* Animated dots */}
          <div className="mt-3 flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400 [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400 [animation-delay:400ms]" />
          </div>
        </div>

        {/* RIGHT: Sidebar with live events */}
        <div className="w-2/5 overflow-hidden border-l border-neutral-200 dark:border-neutral-800">
          <SidebarHeader label="Activity" />
          <div className="space-y-0.5 border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
            <div className="mb-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Phase
            </div>
            <PhaseStep label="Explore" status="active" />
            <PhaseStep label="Review" status="pending" />
            <PhaseStep label="Generate" status="pending" />
          </div>
          <div className="px-2.5 py-2">
            <div className="mb-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Thinking
            </div>
            <div className="space-y-0.5">
              <EventItem icon="think" text="Analyzing project structure..." />
              <EventItem icon="tool" text="list_files &rarr; src/" />
              <EventItem icon="file" text="read_file &rarr; package.json" />
              <EventItem icon="tool" text="list_files &rarr; src/components/" />
              <EventItem icon="file" text="read_file &rarr; src/App.tsx" />
              <EventItem icon="think" text="Found React + TypeScript setup" />
              <EventItem icon="file" text="read_file &rarr; src/hooks/useAuth.ts" />
              <EventItem icon="tool" text="grep_search &rarr; 'export'" dim />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tab 1: Review — Outline editor with domains */
export function ReviewMock() {
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <MockHeader projectName="react-app" />
      <div className="flex h-[calc(100%-32px)]">
        {/* LEFT: Main — Outline editor */}
        <div className="flex-1 overflow-hidden p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
              Outline Editor
            </span>
            <div className="flex gap-1">
              <span className="rounded bg-primary-500 px-1.5 py-0.5 text-[7px] font-medium text-white">
                Confirm
              </span>
              <span className="rounded border border-neutral-300 px-1.5 py-0.5 text-[7px] text-neutral-500 dark:border-neutral-600">
                Re-explore
              </span>
            </div>
          </div>
          {/* Domain cards */}
          <div className="space-y-1.5">
            {[
              { title: "Architecture & Core", subs: ["App Entry", "Routing", "State Management"], files: 8 },
              { title: "Authentication", subs: ["JWT Tokens", "OAuth Flow", "Session"], files: 5 },
              { title: "Data Access Layer", subs: ["API Client", "Cache Strategy"], files: 6 },
              { title: "UI Components", subs: ["Design System", "Forms", "Layouts"], files: 12 },
            ].map((d) => (
              <div
                key={d.title}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="flex items-center gap-1.5">
                  <span className="cursor-grab text-[8px] text-neutral-300 dark:text-neutral-600">
                    &#x2807;
                  </span>
                  <span className="text-[9px] font-semibold text-neutral-800 dark:text-neutral-200">
                    {d.title}
                  </span>
                  <span className="ml-auto text-[7px] text-neutral-400">
                    {d.files} files
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.subs.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-primary-50 px-1 py-0.5 text-[7px] text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="hidden w-1/3 flex-col border-l border-neutral-200 dark:border-neutral-800 sm:flex">
          <SidebarHeader label="Activity" />
          <div className="space-y-0.5 px-2.5 py-2">
            <PhaseStep label="Explore" status="done" />
            <PhaseStep label="Review" status="active" />
            <PhaseStep label="Generate" status="pending" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tab 2: Generate — Documents being written with progress */
export function GenerateMock() {
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <MockHeader projectName="react-app" analyzing progress="Generating 3/5..." />
      <div className="flex h-[calc(100%-32px)]">
        {/* LEFT: Main — live preview of generated markdown */}
        <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
          {/* Progress bar */}
          <div className="border-b border-neutral-100 px-3 py-1.5 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-medium text-neutral-500">Generating: Authentication</span>
              <span className="text-[8px] text-primary-500">3/5</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full w-3/5 rounded-full bg-primary-500 transition-all" />
            </div>
          </div>
          {/* Simulated streaming markdown */}
          <div className="flex-1 overflow-hidden p-3">
            <div className="h-3 w-1/2 rounded bg-neutral-900/80 dark:bg-neutral-100/80" />
            <div className="mt-2 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
            {/* Code block */}
            <div className="mt-2 rounded bg-neutral-900 p-1.5 dark:bg-neutral-800">
              <div className="h-1.5 w-3/4 rounded bg-blue-400/30" />
              <div className="mt-0.5 h-1.5 w-1/2 rounded bg-green-400/30" />
            </div>
            <div className="mt-2 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
            {/* Streaming cursor */}
            <div className="mt-1 flex items-center gap-1">
              <div className="h-2 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
              <span className="h-3 w-0.5 animate-pulse bg-primary-500" />
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar with nav items appearing */}
        <div className="hidden w-1/3 flex-col border-l border-neutral-200 dark:border-neutral-800 sm:flex">
          <SidebarHeader label="Activity" />
          <div className="space-y-0.5 border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
            <PhaseStep label="Explore" status="done" />
            <PhaseStep label="Review" status="done" />
            <PhaseStep label="Generate" status="active" />
          </div>
          <div className="flex-1 px-1.5 py-1.5">
            <div className="mb-1 px-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Documents
            </div>
            <NavItem label="Overview" />
            <NavItem label="Architecture" />
            <NavItem label="Authentication" active />
            <NavItem label="Data Access" />
            <div className="mt-1 flex items-center gap-1 px-2">
              <span className="h-2 w-2 animate-spin rounded-full border border-primary-400 border-t-transparent" />
              <span className="text-[8px] text-primary-500">Writing...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tab 3: Search — Chat widget with Q&A */
export function SearchMock() {
  return (
    <div className="aspect-[4/3] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <MockHeader projectName="react-app" />
      <div className="flex h-[calc(100%-32px)]">
        {/* LEFT: Main — document view with chat overlay */}
        <div className="relative flex flex-1 flex-col bg-white dark:bg-neutral-950">
          {/* Faded document background */}
          <div className="flex-1 overflow-hidden p-3 opacity-40">
            <div className="h-3 w-3/4 rounded bg-neutral-900/80 dark:bg-neutral-100/80" />
            <div className="mt-2 h-2 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-1 h-2 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-2.5 rounded bg-neutral-900 p-1.5 dark:bg-neutral-800">
              <div className="h-1.5 w-2/3 rounded bg-green-400/30" />
              <div className="mt-0.5 h-1.5 w-4/5 rounded bg-blue-400/30" />
            </div>
          </div>

          {/* Chat widget overlay */}
          <div className="absolute right-2 bottom-2 left-2 rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {/* Chat header */}
            <div className="flex items-center gap-1.5 border-b border-neutral-100 px-3 py-1.5 dark:border-neutral-800">
              <svg className="h-3 w-3 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[9px] font-semibold text-neutral-700 dark:text-neutral-300">
                Ask Your Codebase
              </span>
            </div>
            {/* Messages */}
            <div className="space-y-2 p-2.5">
              {/* User question */}
              <div className="flex justify-end">
                <div className="rounded-lg bg-primary-500 px-2 py-1 text-[8px] text-white">
                  How does authentication work?
                </div>
              </div>
              {/* AI answer */}
              <div className="rounded-lg bg-neutral-100 px-2 py-1.5 dark:bg-neutral-800">
                <p className="text-[8px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  The app uses JWT-based auth with a refresh token flow. The main entry is{" "}
                  <code className="rounded bg-neutral-200 px-0.5 text-[7px] dark:bg-neutral-700">useAuth.ts</code>{" "}
                  hook which manages tokens and user state...
                </p>
                <div className="mt-1 flex gap-1">
                  <span className="rounded bg-blue-50 px-1 py-0.5 text-[6px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    src/hooks/useAuth.ts
                  </span>
                  <span className="rounded bg-blue-50 px-1 py-0.5 text-[6px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    src/api/auth.ts
                  </span>
                </div>
              </div>
            </div>
            {/* Input */}
            <div className="border-t border-neutral-100 px-2.5 py-1.5 dark:border-neutral-800">
              <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
                <span className="flex-1 text-[8px] text-neutral-400">Ask a question...</span>
                <span className="ml-1 rounded bg-primary-500 px-1 py-0.5 text-[6px] text-white">Send</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar with completed docs */}
        <div className="hidden w-1/3 flex-col border-l border-neutral-200 dark:border-neutral-800 sm:flex">
          <SidebarHeader label="Activity" />
          <div className="space-y-0.5 border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
            <PhaseStep label="Explore" status="done" />
            <PhaseStep label="Review" status="done" />
            <PhaseStep label="Generate" status="done" />
          </div>
          <div className="flex-1 px-1.5 py-1.5">
            <div className="mb-1 px-1 text-[7px] font-semibold uppercase tracking-wider text-neutral-400">
              Documents
            </div>
            <NavItem label="Overview" />
            <NavItem label="Architecture" />
            <NavItem label="Authentication" />
            <NavItem label="Data Access" />
            <NavItem label="UI Components" />
            <NavItem label="Summary" />
          </div>
        </div>
      </div>
    </div>
  );
}
