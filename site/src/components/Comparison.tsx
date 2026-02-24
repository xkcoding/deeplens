import { Check, X } from "lucide-react";

interface ComparisonProps {
  t: {
    title: string;
    subtitle: string;
    headers: string[];
    rows: string[][];
  };
}

/**
 * Determines how to render a cell value in the comparison table.
 * "Yes" / "是" prefixed values get a green checkmark.
 * "No" / "否" prefixed values get a red X mark.
 * Other values render as plain text.
 */
function CellValue({ value, column }: { value: string; column: number }) {
  const isDeepLens = column === 1;
  const isDeepWiki = column === 2;

  // DeepLens column: positive indicators
  if (isDeepLens && /^(Yes|是)\s*[—\-–]?\s*/i.test(value)) {
    const text = value.replace(/^(Yes|是)\s*[—\-–]?\s*/i, "").trim();
    return (
      <span className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </span>
        <span>{text || value}</span>
      </span>
    );
  }

  // DeepWiki column: negative indicators
  if (isDeepWiki && /^(No|否)\s*[—\-–]?\s*/i.test(value)) {
    const text = value.replace(/^(No|否)\s*[—\-–]?\s*/i, "").trim();
    return (
      <span className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
          aria-hidden="true"
        >
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </span>
        <span>{text || value}</span>
      </span>
    );
  }

  return <span>{value}</span>;
}

export default function Comparison({ t }: ComparisonProps) {
  return (
    <section
      id="comparison"
      className="py-20 sm:py-28"
      aria-labelledby="comparison-title"
    >
      <div className="mx-auto max-w-[var(--width-content)] px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2
            id="comparison-title"
            className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">
            {t.subtitle}
          </p>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                {t.headers.map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={[
                      "px-5 py-4 text-left font-semibold",
                      index === 0
                        ? "w-[30%] text-neutral-700 dark:text-neutral-300"
                        : "w-[35%]",
                      index === 1
                        ? "text-primary-600 dark:text-primary-400"
                        : "",
                      index === 2
                        ? "text-neutral-500 dark:text-neutral-400"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={[
                    "border-b border-neutral-100 last:border-b-0 dark:border-neutral-800/50",
                    rowIndex % 2 === 1
                      ? "bg-neutral-50/50 dark:bg-neutral-900/30"
                      : "bg-neutral-0 dark:bg-transparent",
                  ].join(" ")}
                >
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className={[
                        "px-5 py-3.5",
                        colIndex === 0
                          ? "font-medium text-neutral-900 dark:text-neutral-100"
                          : "text-neutral-600 dark:text-neutral-300",
                      ].join(" ")}
                    >
                      <CellValue value={cell} column={colIndex} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
