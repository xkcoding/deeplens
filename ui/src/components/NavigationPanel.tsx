import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Circle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/events";

interface NavigationPanelProps {
  items: NavItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  collapsed?: boolean;
}

export function NavigationPanel({
  items,
  selectedId,
  onSelect,
  collapsed = false,
}: NavigationPanelProps) {
  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center gap-1 border-r border-neutral-200 bg-neutral-50 pt-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect?.(item.id)}
            className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
            title={item.title}
          >
            {item.type === "file" ? (
              <FileText className="size-4" />
            ) : (
              <Folder className="size-4" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex h-10 items-center px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Documents
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => (
          <NavTreeNode
            key={item.id}
            item={item}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface NavTreeNodeProps {
  item: NavItem;
  depth: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function NavTreeNode({ item, depth, selectedId, onSelect }: NavTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = item.id === selectedId;

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
    }
    onSelect?.(item.id);
  }, [hasChildren, item.id, onSelect]);

  return (
    <div>
      <button
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
          isSelected
            ? "bg-primary-50 text-primary-700"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse chevron */}
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-neutral-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-neutral-400" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Icon by type */}
        {item.type === "file" ? (
          <FileText className="size-4 shrink-0" />
        ) : hasChildren && expanded ? (
          <FolderOpen className="size-4 shrink-0" />
        ) : (
          <Folder className="size-4 shrink-0" />
        )}

        {/* Title */}
        <span className="truncate flex-1 text-left">{item.title}</span>

        {/* Status indicator */}
        <StatusIndicator status={item.status} />
      </button>

      {hasChildren && expanded && (
        <div>
          {item.children!.map((child) => (
            <NavTreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: NavItem["status"] }) {
  switch (status) {
    case "pending":
      return <Circle className="size-2.5 shrink-0 text-neutral-300" />;
    case "generating":
      return (
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary-500" />
        </span>
      );
    case "completed":
      return <Check className="size-3 shrink-0 text-success" />;
    default:
      return null;
  }
}
