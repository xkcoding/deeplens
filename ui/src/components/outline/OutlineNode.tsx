import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DomainData, SubConceptData, ValidationError } from "./OutlineValidation";

// ── Domain Node ───────────────────────────────────────────────

interface DomainNodeProps {
  domain: DomainData;
  index: number;
  errors: ValidationError[];
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAddSubConcept: (domainId: string) => void;
  onRenameSubConcept: (domainId: string, subId: string, name: string) => void;
  onDeleteSubConcept: (domainId: string, subId: string) => void;
  onMoveSubConcept: (
    fromDomainId: string,
    subId: string,
    toDomainId: string,
  ) => void;
}

export function DomainNode({
  domain,
  errors,
  onRename,
  onDelete,
  onAddSubConcept,
  onRenameSubConcept,
  onDeleteSubConcept,
}: DomainNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(domain.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasError = errors.some((e) => e.domainId === domain.id && !e.subConceptId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain.id, data: { type: "domain" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== domain.title) {
      onRename(domain.id, trimmed);
    } else {
      setEditValue(domain.title);
    }
    setEditing(false);
  }, [editValue, domain.title, domain.id, onRename]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-white transition-shadow",
        isDragging && "z-10 shadow-lg opacity-80",
        hasError ? "border-error" : "border-neutral-200",
      )}
    >
      {/* Domain header */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          className="cursor-grab touch-none text-neutral-400 hover:text-neutral-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setEditValue(domain.title);
                setEditing(false);
              }
            }}
            className="flex-1 rounded border border-primary-300 bg-primary-50 px-2 py-0.5 text-sm font-medium outline-none focus:ring-1 focus:ring-primary-400"
          />
        ) : (
          <span
            className="flex-1 cursor-default text-sm font-semibold text-neutral-800"
            onDoubleClick={() => {
              setEditValue(domain.title);
              setEditing(true);
            }}
            title={hasError ? "Validation error on this domain" : undefined}
          >
            {domain.title}
          </span>
        )}

        <span className="text-xs text-neutral-400">
          {domain.sub_concepts?.length ?? 0} concepts
        </span>

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditValue(domain.title);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddSubConcept(domain.id)}>
              <Plus className="size-3.5" />
              Add Sub-Concept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowFiles(!showFiles)}>
              <FileText className="size-3.5" />
              {showFiles ? "Hide Files" : "View Files"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(domain.id)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {expanded && (
        <div className="px-9 pb-1 text-xs text-neutral-500">
          {domain.description}
        </div>
      )}

      {/* Sub-concepts */}
      {expanded && domain.sub_concepts && domain.sub_concepts.length > 0 && (
        <div className="space-y-0.5 px-6 pb-2">
          {domain.sub_concepts.map((sc) => (
            <SubConceptNode
              key={sc.id}
              subConcept={sc}
              domainId={domain.id}
              errors={errors}
              onRename={onRenameSubConcept}
              onDelete={onDeleteSubConcept}
            />
          ))}
        </div>
      )}

      {/* Files */}
      {expanded && showFiles && domain.files && domain.files.length > 0 && (
        <div className="border-t border-neutral-100 px-6 py-2">
          <p className="mb-1 text-xs font-medium text-neutral-500">
            Associated Files
          </p>
          <div className="space-y-0.5">
            {domain.files.map((f) => (
              <div
                key={f.path}
                className="flex items-center gap-2 text-xs text-neutral-600"
              >
                <FileText className="size-3 shrink-0 text-neutral-400" />
                <span className="truncate font-mono">{f.path}</span>
                <span className="shrink-0 text-neutral-400">({f.role})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-Concept Node ──────────────────────────────────────────

interface SubConceptNodeProps {
  subConcept: SubConceptData;
  domainId: string;
  errors: ValidationError[];
  onRename: (domainId: string, subId: string, name: string) => void;
  onDelete: (domainId: string, subId: string) => void;
}

function SubConceptNode({
  subConcept,
  domainId,
  errors,
  onRename,
  onDelete,
}: SubConceptNodeProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(subConcept.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasError = errors.some(
    (e) => e.domainId === domainId && e.subConceptId === subConcept.id,
  );

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== subConcept.name) {
      onRename(domainId, subConcept.id, trimmed);
    } else {
      setEditValue(subConcept.name);
    }
    setEditing(false);
  }, [editValue, subConcept.name, subConcept.id, domainId, onRename]);

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded px-2 py-1 hover:bg-neutral-50",
        hasError && "ring-1 ring-error",
      )}
    >
      <div className="size-1.5 rounded-full bg-primary-400" />

      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditValue(subConcept.name);
              setEditing(false);
            }
          }}
          className="flex-1 rounded border border-primary-300 bg-primary-50 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary-400"
        />
      ) : (
        <span
          className="flex-1 cursor-default text-xs text-neutral-700"
          onDoubleClick={() => {
            setEditValue(subConcept.name);
            setEditing(true);
          }}
        >
          {subConcept.name}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 hover:!opacity-100">
            <MoreHorizontal className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setEditValue(subConcept.name);
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(domainId, subConcept.id)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
