import {
  Compass,
  Network,
  Search,
  Plug,
  GitBranch,
  Languages,
} from "lucide-react";

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesProps {
  t: {
    title: string;
    subtitle: string;
    items: FeatureItem[];
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Compass,
  Network,
  Search,
  Plug,
  GitBranch,
  Languages,
};

export default function Features({ t }: FeaturesProps) {
  return (
    <section
      id="features"
      className="py-20 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-[1200px] px-6">
        {/* ── Section header ─────────────────────────────────── */}
        <div className="text-center">
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">
            {t.subtitle}
          </p>
        </div>

        {/* ── Feature grid ───────────────────────────────────── */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item) => {
            const Icon = iconMap[item.icon];

            return (
              <article
                key={item.title}
                className={[
                  "group rounded-xl border p-6 transition-all",
                  "border-neutral-200 bg-white",
                  "dark:border-neutral-800 dark:bg-neutral-900",
                  "hover:-translate-y-1 hover:shadow-lg",
                  "dark:hover:shadow-[0_10px_15px_rgba(249,115,22,0.05)]",
                  "focus-within:ring-2 focus-within:ring-primary-500/40",
                ].join(" ")}
              >
                {/* Icon */}
                <div
                  className={[
                    "mb-4 flex size-11 items-center justify-center rounded-lg",
                    "bg-primary-500/10 text-primary-600",
                    "dark:bg-primary-500/15 dark:text-primary-400",
                    "transition-colors group-hover:bg-primary-500/15 dark:group-hover:bg-primary-500/20",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {Icon ? (
                    <Icon className="size-5" />
                  ) : (
                    <span className="size-5" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold tracking-tight">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
