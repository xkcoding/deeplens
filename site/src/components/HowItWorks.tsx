interface HowItWorksProps {
  t: {
    title: string;
    subtitle: string;
    steps: Array<{
      step: string;
      title: string;
      description: string;
      code: string | null;
    }>;
  };
}

export default function HowItWorks({ t }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-28"
      aria-labelledby="how-it-works-title"
    >
      <div className="mx-auto max-w-[var(--width-content)] px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2
            id="how-it-works-title"
            className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">
            {t.subtitle}
          </p>
        </div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-0">
          {/* Desktop connector line */}
          <div
            className="pointer-events-none absolute top-6 right-[calc(12.5%+1rem)] left-[calc(12.5%+1rem)] hidden border-t-2 border-dashed border-neutral-300 dark:border-neutral-700 md:block"
            aria-hidden="true"
          />

          {t.steps.map((step, index) => (
            <div
              key={step.step}
              className="relative flex flex-col items-center text-center md:px-4"
            >
              {/* Mobile connector line (between cards, not on last) */}
              {index < t.steps.length - 1 && (
                <div
                  className="absolute top-14 left-1/2 h-[calc(100%-3.5rem+2.5rem)] w-0 -translate-x-1/2 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700 md:hidden"
                  aria-hidden="true"
                />
              )}

              {/* Step number */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white shadow-md">
                {step.step}
              </div>

              {/* Content */}
              <h3 className="mt-5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {step.description}
              </p>

              {/* Optional code block */}
              {step.code && (
                <code className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2.5 font-mono text-sm text-neutral-200 dark:bg-neutral-800">
                  {step.code}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
