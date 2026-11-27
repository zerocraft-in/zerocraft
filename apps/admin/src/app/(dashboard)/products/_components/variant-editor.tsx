"use client";

import * as React from "react";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { GripVertical, Plus, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  MAX_OPTIONS,
  VARIANT_LIMIT,
  builderReducer,
  cleanValues,
  countCombos,
  optionHasErrors,
  toPayload,
  uid,
  validateOption,
  validateVariants,
  type BuilderAction,
  type OptionErrors,
  type ProductOption,
  type VariantBuilderValue,
  createStateFromValue,
} from "../lib/variant-builder";
import { VariantTable } from "./variant-table";

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

const dragStyle = (
  transform: { x: number; y: number } | null,
  transition: string | undefined,
  isDragging: boolean,
): React.CSSProperties => ({
  transform: transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined,
  transition,
  zIndex: isDragging ? 20 : undefined,
});

/* ───────────────────────── value row ───────────────────────── */
function ValueRow({
  optionId,
  value,
  isTrailingBlank,
  error,
  dispatch,
}: {
  optionId: string;
  value: { id: string; label: string };
  isTrailingBlank: boolean;
  error?: string;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id, disabled: isTrailingBlank });

  return (
    <div ref={setNodeRef} style={dragStyle(transform, transition, isDragging)}>
      <div
        className={cn("flex items-center gap-2", isDragging && "opacity-80")}
      >
        <button
          type="button"
          aria-label="Drag to reorder value"
          className={cn(
            "shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing",
            isTrailingBlank && "invisible",
          )}
          {...attributes}
          {...listeners}
          tabIndex={isTrailingBlank ? -1 : 0}
        >
          <GripVertical className="size-4" />
        </button>
        <Input
          value={value.label}
          placeholder={isTrailingBlank ? "Add another value" : "Value"}
          onChange={(e) =>
            dispatch({
              type: "SET_VALUE",
              optionId,
              valueId: value.id,
              label: e.target.value,
              nextId: uid(),
            })
          }
          aria-invalid={!!error || undefined}
          className={cn(
            "h-9 min-w-0 flex-1 text-sm",
            error && "border-destructive",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove value"
          onClick={() =>
            dispatch({
              type: "REMOVE_VALUE",
              optionId,
              valueId: value.id,
              nextId: uid(),
            })
          }
          className={cn("h-8 w-8 shrink-0", isTrailingBlank && "invisible")}
          tabIndex={isTrailingBlank ? -1 : 0}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {error && (
        <p className="ml-8 mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── option card ───────────────────────── */
function OptionCard({
  option,
  expanded,
  errors,
  onOpen,
  onDone,
  onRemove,
  dispatch,
}: {
  option: ProductOption;
  expanded: boolean;
  errors: OptionErrors | null;
  onOpen: () => void;
  onDone: () => void;
  onRemove: () => void;
  dispatch: React.Dispatch<BuilderAction>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });
  const sensors = useDndSensors();

  const chips = cleanValues(option);
  const valueIds = option.values.map((v) => v.id);

  const onValuesDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    dispatch({
      type: "REORDER_VALUES",
      optionId: option.id,
      activeId: String(e.active.id),
      overId: String(e.over.id),
    });
  };

  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder option"
      onClick={(e) => e.stopPropagation()}
      className="mt-0.5 shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={dragStyle(transform, transition, isDragging)}
      className={cn(
        "rounded-lg border border-border bg-card",
        isDragging && "shadow-lg ring-1 ring-ring/30",
      )}
    >
      {!expanded ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
          className="flex cursor-pointer items-start gap-2 rounded-lg p-3 hover:bg-muted/50"
        >
          {handle}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {option.name.trim() || "Untitled option"}
            </p>
            {chips.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {chips.map((v) => (
                  <span
                    key={v.id}
                    className="max-w-[160px] truncate rounded-md bg-muted px-2 py-0.5 text-xs"
                    title={v.label.trim()}
                  >
                    {v.label.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-3">
          <div className="flex items-start gap-2">
            {handle}
            <div className="min-w-0 flex-1 space-y-1">
              <label className="block text-xs font-medium">Option name</label>
              <Input
                autoFocus={!option.name}
                value={option.name}
                placeholder="Size, Color, Material…"
                onChange={(e) =>
                  dispatch({
                    type: "SET_OPTION_NAME",
                    id: option.id,
                    name: e.target.value,
                  })
                }
                aria-invalid={!!errors?.name || undefined}
                className={cn(
                  "h-9 text-sm",
                  errors?.name && "border-destructive",
                )}
              />
              {errors?.name && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3.5" />
                  {errors.name}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium">Option values</label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onValuesDragEnd}
            >
              <SortableContext
                items={valueIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {option.values.map((v, i) => (
                    <ValueRow
                      key={v.id}
                      optionId={option.id}
                      value={v}
                      isTrailingBlank={
                        i === option.values.length - 1 && v.label.trim() === ""
                      }
                      error={errors?.values[v.id]}
                      dispatch={dispatch}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive"
            >
              Delete
            </Button>
            <Button type="button" size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── variant editor ───────────────────────── */
interface VariantEditorProps {
  onVariantChange?: (value: VariantBuilderValue) => void;
  initialValue?: VariantBuilderValue;
  hideSingleVariantTable?: boolean;
}

export function VariantEditor({ onVariantChange, initialValue, hideSingleVariantTable = false }: VariantEditorProps) {
  const [state, dispatch] = React.useReducer(
    builderReducer,
    initialValue,
    createStateFromValue,
  );
  const { options, variants } = state;

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showErrors, setShowErrors] = React.useState<Set<string>>(new Set());
  const sensors = useDndSensors();

  const variantErrors = React.useMemo(
    () => validateVariants(variants),
    [variants],
  );
  const overLimit = countCombos(options) > VARIANT_LIMIT;

  /* report to parent (callback kept in a ref so inline functions don't re-trigger it) */
  const cbRef = React.useRef(onVariantChange);
  React.useEffect(() => {
    cbRef.current = onVariantChange;
  });
  React.useEffect(() => {
    cbRef.current?.(toPayload(state));
  }, [state]);

  const hideErrors = (id: string) =>
    setShowErrors((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  /** validate an open option, collapse it when ok. Returns false if it must stay open */
  const finalize = (id: string): boolean => {
    const opt = options.find((o) => o.id === id);
    if (!opt) return true;
    if (optionHasErrors(validateOption(opt, options))) {
      setShowErrors((prev) => new Set(prev).add(id));
      return false;
    }
    if (overLimit) return false;
    dispatch({ type: "FINALIZE_OPTION", id });
    hideErrors(id);
    setExpandedId((cur) => (cur === id ? null : cur));
    return true;
  };

  const handleAdd = () => {
    if (options.length >= MAX_OPTIONS) return;
    if (expandedId && !finalize(expandedId)) return; // previous option must be valid first
    const id = uid();
    dispatch({ type: "ADD_OPTION", id, valueId: uid() });
    setExpandedId(id); // only the new option is open, old ones collapse, old variants stay
  };

  const handleOpen = (id: string) => {
    if (expandedId === id) return;
    if (expandedId && !finalize(expandedId)) return;
    dispatch({ type: "OPEN_OPTION", id, nextId: uid() });
    setExpandedId(id);
  };

  const handleRemove = (id: string) => {
    dispatch({ type: "REMOVE_OPTION", id });
    hideErrors(id);
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  const onOptionsDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    dispatch({
      type: "REORDER_OPTIONS",
      activeId: String(e.active.id),
      overId: String(e.over.id),
    });
  };

  return (
    <section className="space-y-4">
      {/* options */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        {options.length === 0 ? (
          <Button type="button" variant="outline" onClick={handleAdd}>
            <Plus className="mr-2 size-4" />
            Add options like size or color
          </Button>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onOptionsDragEnd}
            >
              <SortableContext
                items={options.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {options.map((o) => (
                    <OptionCard
                      key={o.id}
                      option={o}
                      expanded={expandedId === o.id}
                      errors={
                        showErrors.has(o.id) ? validateOption(o, options) : null
                      }
                      onOpen={() => handleOpen(o.id)}
                      onDone={() => finalize(o.id)}
                      onRemove={() => handleRemove(o.id)}
                      dispatch={dispatch}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {options.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAdd}
              >
                <Plus className="mr-1.5 size-4" />
                Add another option
              </Button>
            )}
          </>
        )}

        {overLimit && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" />
            These options create {countCombos(options)} variants. The limit is{" "}
            {VARIANT_LIMIT} — remove some values.
          </p>
        )}
      </div>

      {/* variants */}
      {variants.length > 0 && !(hideSingleVariantTable && options.length === 0) && (
        <VariantTable
          options={options}
          variants={variants}
          errors={variantErrors}
          dispatch={dispatch}
        />
      )}
    </section>
  );
}
