interface ProgressBarProps {
  phase: string;
  current: number;
  total: number;
}

export function ProgressBar({ phase, current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="py-1">
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
        <span className="font-medium">{phase}</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
