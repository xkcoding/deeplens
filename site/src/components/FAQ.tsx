import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface FAQProps {
  t: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>("0px");

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setMaxHeight(`${contentRef.current.scrollHeight}px`);
    } else {
      setMaxHeight("0px");
    }
  }, [isOpen]);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => {
          window.posthog?.capture("faq_toggle", { question: item.question, action: isOpen ? "close" : "open" });
          onToggle();
        }}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors duration-[var(--transition-duration-fast)] hover:text-primary-600 dark:hover:text-primary-400"
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          {item.question}
        </span>
        <ChevronDown
          className={[
            "h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform duration-[var(--transition-duration-normal)] dark:text-neutral-500",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-[var(--transition-duration-slow)] ease-[var(--ease-spring)]"
        style={{ maxHeight }}
        role="region"
        aria-hidden={!isOpen}
      >
        <p className="pb-5 leading-relaxed text-neutral-500 dark:text-neutral-400">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export default function FAQ({ t }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section
      id="faq"
      className="py-20 sm:py-28"
      aria-labelledby="faq-title"
    >
      <div className="mx-auto max-w-[var(--width-content)] px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2
            id="faq-title"
            className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
          >
            {t.title}
          </h2>
        </div>

        {/* Accordion */}
        <div className="mx-auto max-w-3xl">
          {t.items.map((item, index) => (
            <FAQItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
