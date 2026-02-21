import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DomainNode } from "./OutlineNode";
import { OutlineActionBar } from "./OutlineActionBar";
import {
  validateOutline,
  type OutlineData,
  type DomainData,
  type ValidationError,
} from "./OutlineValidation";
import { OverviewSection } from "./OverviewSection";
import { SummarySection } from "./SummarySection";

interface OutlineEditorProps {
  outline: OutlineData;
  onConfirm: (outline: OutlineData) => void;
  onReExplore: () => void;
  onExportJson: () => void;
}

export function OutlineEditor({
  outline: initialOutline,
  onConfirm,
  onReExplore,
  onExportJson,
}: OutlineEditorProps) {
  const [outline, setOutline] = useState<OutlineData>(initialOutline);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);

  // Sync when initialOutline prop changes (e.g., re-explore)
  useEffect(() => {
    setOutline(initialOutline);
    setErrors([]);
  }, [initialOutline]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const domainIds = useMemo(
    () => outline.knowledge_graph.map((d) => d.id),
    [outline.knowledge_graph],
  );

  const activeDomain = useMemo(
    () => outline.knowledge_graph.find((d) => d.id === activeDomainId) ?? null,
    [outline.knowledge_graph, activeDomainId],
  );

  // ── Drag handlers ───────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDomainId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDomainId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOutline((prev) => {
        const oldIndex = prev.knowledge_graph.findIndex(
          (d) => d.id === active.id,
        );
        const newIndex = prev.knowledge_graph.findIndex(
          (d) => d.id === over.id,
        );
        if (oldIndex === -1 || newIndex === -1) return prev;
        return {
          ...prev,
          knowledge_graph: arrayMove(prev.knowledge_graph, oldIndex, newIndex),
        };
      });
    },
    [],
  );

  // ── CRUD operations ─────────────────────────────────────────

  const updateDomain = useCallback(
    (domainId: string, updater: (d: DomainData) => DomainData) => {
      setOutline((prev) => ({
        ...prev,
        knowledge_graph: prev.knowledge_graph.map((d) =>
          d.id === domainId ? updater(d) : d,
        ),
      }));
    },
    [],
  );

  const handleRenameDomain = useCallback(
    (id: string, title: string) => {
      updateDomain(id, (d) => ({ ...d, title }));
    },
    [updateDomain],
  );

  const handleDeleteDomain = useCallback((id: string) => {
    setOutline((prev) => ({
      ...prev,
      knowledge_graph: prev.knowledge_graph.filter((d) => d.id !== id),
    }));
  }, []);

  const handleAddSubConcept = useCallback(
    (domainId: string) => {
      const newId = `sc-${Date.now()}`;
      updateDomain(domainId, (d) => ({
        ...d,
        sub_concepts: [
          ...(d.sub_concepts ?? []),
          { id: newId, name: "New Concept", description: "" },
        ],
      }));
    },
    [updateDomain],
  );

  const handleRenameSubConcept = useCallback(
    (domainId: string, subId: string, name: string) => {
      updateDomain(domainId, (d) => ({
        ...d,
        sub_concepts: (d.sub_concepts ?? []).map((sc) =>
          sc.id === subId ? { ...sc, name } : sc,
        ),
      }));
    },
    [updateDomain],
  );

  const handleDeleteSubConcept = useCallback(
    (domainId: string, subId: string) => {
      updateDomain(domainId, (d) => ({
        ...d,
        sub_concepts: (d.sub_concepts ?? []).filter((sc) => sc.id !== subId),
      }));
    },
    [updateDomain],
  );

  const handleMoveSubConcept = useCallback(
    (fromDomainId: string, subId: string, toDomainId: string) => {
      setOutline((prev) => {
        const fromDomain = prev.knowledge_graph.find(
          (d) => d.id === fromDomainId,
        );
        const sub = fromDomain?.sub_concepts?.find((sc) => sc.id === subId);
        if (!sub) return prev;

        return {
          ...prev,
          knowledge_graph: prev.knowledge_graph.map((d) => {
            if (d.id === fromDomainId) {
              return {
                ...d,
                sub_concepts: (d.sub_concepts ?? []).filter(
                  (sc) => sc.id !== subId,
                ),
              };
            }
            if (d.id === toDomainId) {
              return {
                ...d,
                sub_concepts: [...(d.sub_concepts ?? []), sub],
              };
            }
            return d;
          }),
        };
      });
    },
    [],
  );

  // ── Actions ─────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const result = validateOutline(outline);
    if (result.success && result.data) {
      setErrors([]);
      onConfirm(result.data);
    } else {
      setErrors(result.errors);
    }
  }, [outline, onConfirm]);

  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(outline, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${outline.project_name}-outline.json`;
    a.click();
    URL.revokeObjectURL(url);
    onExportJson();
  }, [outline, onExportJson]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-800">
          Outline Editor
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {outline.project_name} &mdash; {outline.knowledge_graph.length}{" "}
          domains
        </p>
        {outline.detected_stack.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {outline.detected_stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Validation errors summary */}
      {errors.length > 0 && (
        <div className="shrink-0 border-b border-error bg-error-bg px-4 py-2">
          <p className="text-xs font-medium text-error">
            {errors.length} validation error{errors.length > 1 ? "s" : ""} found
          </p>
          <ul className="mt-1 space-y-0.5">
            {errors.slice(0, 3).map((e, i) => (
              <li key={i} className="text-xs text-error/80">
                {e.message}
              </li>
            ))}
            {errors.length > 3 && (
              <li className="text-xs text-error/60">
                ...and {errors.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Domain list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {/* Overview label — fixed above domains, not sortable */}
          <OverviewSection />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={domainIds}
              strategy={verticalListSortingStrategy}
            >
              {outline.knowledge_graph.map((domain, index) => (
                <DomainNode
                  key={domain.id}
                  domain={domain}
                  index={index}
                  errors={errors.filter((e) => e.domainId === domain.id)}
                  onRename={handleRenameDomain}
                  onDelete={handleDeleteDomain}
                  onAddSubConcept={handleAddSubConcept}
                  onRenameSubConcept={handleRenameSubConcept}
                  onDeleteSubConcept={handleDeleteSubConcept}
                  onMoveSubConcept={handleMoveSubConcept}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeDomain && (
                <div className="rounded-lg border border-primary-300 bg-primary-50 px-4 py-2 shadow-lg">
                  <span className="text-sm font-semibold text-primary-700">
                    {activeDomain.title}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Summary label — pinned at the bottom, not sortable */}
          <SummarySection />
        </div>
      </ScrollArea>

      {/* Action bar */}
      <OutlineActionBar
        onConfirm={handleConfirm}
        onReExplore={onReExplore}
        onExportJson={handleExportJson}
        hasErrors={errors.length > 0}
      />
    </div>
  );
}
