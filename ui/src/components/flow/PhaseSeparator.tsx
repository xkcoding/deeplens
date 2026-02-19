interface PhaseSeparatorProps {
  phase: string;
}

export function PhaseSeparator({ phase }: PhaseSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-neutral-300" />
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {phase}
      </span>
      <div className="h-px flex-1 bg-neutral-300" />
    </div>
  );
}
