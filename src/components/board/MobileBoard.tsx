"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { addDays, format, startOfWeek } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import type { Job } from "@/lib/types";
import SortableJobCard from "./SortableJobCard";
import JobCard from "../jobs/JobCard";
import BacklogColumn from "./BacklogColumn";

const DAY_PREFIX = "day:";
const DEBUG_MOBILE_DND = false;
const DEBUG_MOBILE_ERRORS = false;

const EDGE_SWIPE_PX = 24;
const DRAWER_WIDTH = 300;

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const tintPalette = [
  "bg-sky-200/30",
  "bg-emerald-200/30",
  "bg-rose-200/30",
  "bg-violet-200/30",
  "bg-amber-200/30",
  "bg-orange-200/30",
  "bg-teal-200/30",
  "bg-cyan-200/30"
];

type Day = { label: string; date: Date; iso: string };

function buildWeekdays(weekOffset: number): Day[] {
  const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => {
    const dayDate = addDays(start, i);
    return {
      label: format(dayDate, "EEE"),
      date: dayDate,
      iso: format(dayDate, "yyyy-MM-dd")
    };
  });
}

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getAreaTint(area: string | undefined, order: string[]) {
  if (!area) return "";
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % tintPalette.length : 0;
  return tintPalette[pos];
}

function pointInRect(
  p: { x: number; y: number } | null,
  rect: DOMRect | null
): boolean {
  if (!p || !rect) return false;
  return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
}

export default function MobileBoard() {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();

  const [weekOffset, setWeekOffset] = useState(0);
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(-DRAWER_WIDTH);

  const drawerRef = useRef<HTMLDivElement | null>(null);

  const drawerDrag = useRef<{
    startX: number;
    startOffset: number;
    pointerId: number;
  } | null>(null);

  const lastOver = useRef<{ id: UniqueIdentifier; data?: { current?: unknown } } | null>(null);
  const lastOverContainerId = useRef<string | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [debugState, setDebugState] = useState({
    activeId: null as string | null,
    lastOverId: null as string | null,
    rawOverId: null as string | null,
    resolvedDestListId: null as string | null,
    resolvedContainerId: null as string | null,
    drawerOpen: false,
    pointerX: null as number | null,
    pointerY: null as number | null,
    pointerInsideDrawer: false,
    action: null as string | null
  });
  const [errorEvents, setErrorEvents] = useState<string[]>([]);

  const days = useMemo(() => buildWeekdays(weekOffset), [weekOffset]);

  const areaOptions = useMemo(() => {
    const set = new Set<string>(baseAreas);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [dayAreaLabels]);

  /**
   * IMPORTANT:
   * Make list membership mutually exclusive to reduce “duplicate” appearance bugs
   * when something ends up with inconsistent assignedDate/status during edits.
   */
  const listJobsBase = useCallback(
    (listId: string) => {
      if (listId === "backlog") {
        return jobs.filter((j) => {
          const isDeleted = !!j.deletedAt;
          const isDone = j.status === "completed" || j.status === "cancelled";
          if (isDeleted || isDone) return false;

          // Backlog = explicitly backlog OR no assignedDate (null/undefined/empty)
          const noAssigned = !j.assignedDate;
          const isBacklog = j.status === "backlog";
          return isBacklog || noAssigned;
        });
      }

      if (!listId.startsWith(DAY_PREFIX)) return [];
      const dayKey = listId.slice(DAY_PREFIX.length);

      return jobs.filter((j) => {
        const isDeleted = !!j.deletedAt;
        const isDone = j.status === "completed" || j.status === "cancelled";
        if (isDeleted || isDone) return false;

        // Day list must match assignedDate AND must not be backlog
        return j.assignedDate === dayKey && j.status !== "backlog";
      });
    },
    [jobs]
  );

  const listJobs = useCallback((listId: string) => listJobsBase(listId), [listJobsBase]);

  const orderedBacklogJobs = orderJobs("backlog", orderByList, listJobs("backlog"));

  const jobsByDate: Record<string, Job[]> = {};
  for (const d of days) {
    const listId = `${DAY_PREFIX}${d.iso}`;
    const raw = listJobs(listId);
    jobsByDate[d.iso] = orderJobs(listId, orderByList, raw);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 160, tolerance: 6 }
    })
  );

  const getDrawerRect = useCallback(() => {
    const el = drawerRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, [drawerOpen]);

  const isBacklogEligible = useCallback(
    (pointer: { x: number; y: number } | null) => {
      if (!drawerOpen) return false;
      const rect = getDrawerRect();
      return pointInRect(pointer, rect);
    },
    [drawerOpen, getDrawerRect]
  );

  const getContainerIdFromOver = useCallback(
    (overId: UniqueIdentifier | null, overData?: { current?: unknown }, pointer?: { x: number; y: number } | null) => {
      if (!overId) return null;

      const current = overData?.current as
        | {
            containerId?: string;
            sortable?: { containerId?: string; index?: number };
          }
        | undefined;

      const sortableContainer = current?.sortable?.containerId;
      const directContainer = current?.containerId;

      const allowBacklog = isBacklogEligible(pointer ?? lastPointer.current);

      if (sortableContainer) {
        if (sortableContainer === "backlog" && !allowBacklog) return null;
        return sortableContainer;
      }
      if (directContainer) {
        if (directContainer === "backlog" && !allowBacklog) return null;
        return directContainer;
      }

      const asString = String(overId);
      if (asString === "backlog") return allowBacklog ? "backlog" : null;
      if (asString.startsWith(DAY_PREFIX)) return asString;

      return null;
    },
    [isBacklogEligible]
  );

  /**
   * Key fix:
   * Filter backlog collisions unless drawer is open AND pointer is inside drawer bounds.
   * Also prevent lastOver fallback from ever “sticking” to backlog unless eligible.
   */
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!activeId) return closestCenter(args);

      const pointer = args.pointerCoordinates
        ? { x: args.pointerCoordinates.x, y: args.pointerCoordinates.y }
        : lastPointer.current;

      const allowBacklog = isBacklogEligible(pointer);

      const pointerCollisions = pointerWithin(args);
      const intersections = pointerCollisions.length ? pointerCollisions : rectIntersection(args);

      // If backlog is not eligible, strip it out of collisions entirely.
      const filtered = allowBacklog
        ? intersections
        : intersections.filter((item) => {
            const current = item.data?.current as
              | { containerId?: string; sortable?: { containerId?: string }; type?: string }
              | undefined;
            const cId = current?.sortable?.containerId ?? current?.containerId ?? String(item.id);
            return cId !== "backlog" && String(item.id) !== "backlog";
          });

      const containerHit = filtered.find((item) => {
        const current = item.data?.current as { type?: string } | undefined;
        return current?.type === "container";
      });

      if (containerHit) {
        return [{ id: containerHit.id as UniqueIdentifier }];
      }

      const first = getFirstCollision(filtered, "id");
      if (first != null && String(first) !== String(activeId)) {
        return [{ id: first as UniqueIdentifier }];
      }

      // Fallback to lastOver ONLY if it is not backlog (unless eligible)
      if (lastOver.current) {
        const lastIdStr = String(lastOver.current.id);
        if (lastIdStr !== "backlog" || allowBacklog) {
          return [{ id: lastOver.current.id }];
        }
      }

      const filteredContainers = allowBacklog
        ? args.droppableContainers
        : args.droppableContainers.filter((container) => {
            const current = container.data?.current as
              | { containerId?: string; sortable?: { containerId?: string } }
              | undefined;
            const cId = current?.sortable?.containerId ?? current?.containerId ?? String(container.id);
            return cId !== "backlog" && String(container.id) !== "backlog";
          });

      return closestCenter({ ...args, droppableContainers: filteredContainers });
    },
    [activeId, isBacklogEligible]
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    if (DEBUG_MOBILE_DND) {
      setDebugState((prev) => ({
        ...prev,
        activeId: String(active.id),
        lastOverId: null,
        rawOverId: null,
        resolvedDestListId: null,
        resolvedContainerId: null,
        drawerOpen,
        action: null
      }));
    }
  }, []);

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return;

      const pointer = lastPointer.current;
      const containerId = getContainerIdFromOver(over.id, over.data as { current?: unknown }, pointer);

      // Only record lastOver if it resolves to a valid container
      if (String(over.id) !== String(active.id) && containerId) {
        lastOver.current = { id: over.id, data: over.data };
        lastOverContainerId.current = containerId;
      }

      if (DEBUG_MOBILE_DND) {
        const pointerInsideDrawer = isBacklogEligible(pointer ?? null);
        setDebugState((prev) => ({
          ...prev,
          activeId: String(active.id),
          lastOverId: lastOver.current ? String(lastOver.current.id) : null,
          rawOverId: over?.id ? String(over.id) : null,
          resolvedDestListId: containerId,
          resolvedContainerId: containerId,
          drawerOpen,
          pointerX: pointer?.x ?? null,
          pointerY: pointer?.y ?? null,
          pointerInsideDrawer,
          action: null
        }));
      }
    },
    [drawerOpen, getContainerIdFromOver, isBacklogEligible]
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeIdStr = String(active.id);

      const sourceListId =
        (active?.data?.current as { containerId?: string } | undefined)?.containerId ?? null;

      const isSelfOver = over && String(over.id) === activeIdStr;

      const overRecord =
        !over || isSelfOver
          ? lastOver.current
            ? { id: lastOver.current.id, data: lastOver.current.data }
            : null
          : { id: over.id, data: over.data };

      const overId = overRecord?.id ?? null;
      const overData = overRecord?.data as { current?: unknown } | undefined;

      const pointer = lastPointer.current;
      const allowBacklog = isBacklogEligible(pointer);
      const pointerInsideDrawer = allowBacklog;

      // Resolve destination container deterministically
      let destListId =
        getContainerIdFromOver(overId, overData, pointer) ??
        (lastOverContainerId.current && lastOverContainerId.current !== sourceListId
          ? lastOverContainerId.current
          : null);

      // HARD GUARD: never allow backlog unless pointer is inside the drawer bounds while open
      if (destListId === "backlog" && !allowBacklog) {
        destListId = null;
      }

      if (DEBUG_MOBILE_DND) {
        const sortable = (overData?.current as { sortable?: { containerId?: string; index?: number } } | undefined)
          ?.sortable;
        console.log("mobile:dnd:end", {
          activeId: activeIdStr,
          sourceListId,
          rawOverId: over?.id ?? null,
          resolvedOverId: overId,
          resolvedDestListId: destListId,
          overSortableContainerId: sortable?.containerId ?? null,
          overSortableIndex: sortable?.index ?? null,
          drawerOpen,
          allowBacklog,
          pointer
        });
      }

      const lastOverId =
        lastOver.current && lastOver.current.id != null ? String(lastOver.current.id) : null;

      // Cleanup drag state
      setActiveId(null);
      lastOver.current = null;
      lastOverContainerId.current = null;

      const action =
        !destListId
          ? "revert"
          : sourceListId === destListId
            ? "reorder"
            : destListId === "backlog"
              ? "move->backlog"
              : "move->day";

      if (DEBUG_MOBILE_DND) {
        setDebugState((prev) => ({
          ...prev,
          activeId: activeIdStr,
          lastOverId,
          rawOverId: over?.id ? String(over.id) : null,
          resolvedDestListId: destListId,
          resolvedContainerId: destListId,
          drawerOpen,
          pointerX: pointer?.x ?? null,
          pointerY: pointer?.y ?? null,
          pointerInsideDrawer,
          action
        }));
      }

      // If no valid destination, revert (do nothing)
      if (!sourceListId || !destListId) return;

      // Calculate indices for ordering
      const sourceIdsFull = orderJobs(sourceListId, orderByList, listJobsBase(sourceListId)).map(
        (j) => j.id
      );
      const destIdsFull = orderJobs(destListId, orderByList, listJobsBase(destListId)).map(
        (j) => j.id
      );

      const overSortable = (overData?.current as { sortable?: { containerId?: string; index?: number } } | undefined)
        ?.sortable;

      const fromIndex = sourceIdsFull.indexOf(activeIdStr);

      const toIndex =
        overSortable?.containerId === destListId && typeof overSortable.index === "number"
          ? overSortable.index
          : destIdsFull.length;

      // Update client-side ordering
      setOrderByList((prev) => {
        if (sourceListId === destListId) {
          // Reorder within same list
          if (fromIndex < 0) return prev;
          const nextIds = arrayMove(sourceIdsFull, fromIndex, toIndex);
          return { ...prev, [sourceListId]: nextIds };
        }

        // Move between lists
        const sourceIds = sourceIdsFull.filter((id) => id !== activeIdStr);
        const destIds = destIdsFull.filter((id) => id !== activeIdStr);
        const nextDest = [...destIds];
        nextDest.splice(Math.min(toIndex, nextDest.length), 0, activeIdStr);

        return {
          ...prev,
          [sourceListId]: sourceIds,
          [destListId]: nextDest
        };
      });

      // Only call moveJob if list changes OR list is a day (so assignedDate might change)
      if (sourceListId !== destListId) {
        const assignedDate = destListId === "backlog" ? null : destListId.slice(DAY_PREFIX.length);
        void moveJob(activeIdStr, assignedDate);
      } else {
        // If same list and it's a day, do not call moveJob (pure reorder)
        // If same list and backlog, also no moveJob (pure reorder)
      }
    },
    [drawerOpen, getContainerIdFromOver, isBacklogEligible, listJobsBase, moveJob, orderByList]
  );

  useEffect(() => {
    if (!drawerDrag.current) {
      setDrawerOffset(drawerOpen ? 0 : -DRAWER_WIDTH);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) {
      lastOver.current = null;
      lastOverContainerId.current = null;
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!activeId) return;

    const handleMove = (e: PointerEvent) => {
      lastPointer.current = { x: e.clientX, y: e.clientY };
      if (DEBUG_MOBILE_DND) {
        const pointerInsideDrawer = isBacklogEligible({ x: e.clientX, y: e.clientY });
        setDebugState((prev) => ({
          ...prev,
          pointerX: e.clientX,
          pointerY: e.clientY,
          pointerInsideDrawer,
          drawerOpen
        }));
      }
    };
    window.addEventListener("pointermove", handleMove);

    return () => {
      window.removeEventListener("pointermove", handleMove);
    };
  }, [activeId, drawerOpen, isBacklogEligible]);

  useEffect(() => {
    if (!DEBUG_MOBILE_ERRORS) return;

    const pushEvent = (message: string) => {
      setErrorEvents((prev) => {
        const next = [...prev, message];
        return next.slice(-20);
      });
    };

    const onError = (event: ErrorEvent) => {
      const msg = `[onerror] ${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`;
      pushEvent(msg);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      pushEvent(`[unhandledrejection] ${reason}`);
    };

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const formatted = args
        .map((arg) => {
          if (arg instanceof Error) return arg.message;
          if (typeof arg === "string") return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" ");
      pushEvent(`[console.error] ${formatted}`);
      originalError(...args);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      console.error = originalError;
    };
  }, []);

  function startDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;

    // Don’t steal pointer if user started on a draggable card
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-dnd-card='true']")) return;

    // Only allow edge swipe to open when closed
    if (!drawerOpen && e.clientX > EDGE_SWIPE_PX) return;

    drawerDrag.current = {
      startX: e.clientX,
      startOffset: drawerOpen ? 0 : -DRAWER_WIDTH,
      pointerId: e.pointerId
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawerDrag.current) return;
    const { startX, startOffset } = drawerDrag.current;
    const dx = e.clientX - startX;
    const next = Math.min(0, Math.max(-DRAWER_WIDTH, startOffset + dx));
    setDrawerOffset(next);
  }

  function endDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawerDrag.current) return;
    e.currentTarget.releasePointerCapture(drawerDrag.current.pointerId);

    const shouldOpen = drawerOffset > -DRAWER_WIDTH * 0.5;
    drawerDrag.current = null;
    setDrawerOpen(shouldOpen);
  }

  const weekRange = useMemo(() => {
    if (days.length === 0) return "";
    const first = days[0].date;
    const last = days[days.length - 1].date;
    return `${format(first, "d MMM")} - ${format(last, "d MMM")}`;
  }, [days]);

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  return (
    <div
      className="relative min-h-screen"
      onPointerDown={startDrawerDrag}
      onPointerMove={moveDrawerDrag}
      onPointerUp={endDrawerDrag}
      onPointerCancel={endDrawerDrag}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          lastOver.current = null;
          lastOverContainerId.current = null;
        }}
        autoScroll
      >
        <div className="px-4 py-3 space-y-3">
          <div className="app-surface px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setDrawerOpen(true)}
              >
                Menu
              </button>
              <div>
                <div className="text-[11px] text-slate-600">Week view</div>
                <div className="text-sm font-semibold text-slate-900">{weekRange}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setWeekOffset((v) => v - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setWeekOffset(0)}
              >
                Today
              </button>
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setWeekOffset((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </div>

          {days.map((day) => {
            const listId = `${DAY_PREFIX}${day.iso}`;
            const dayJobs = jobsByDate[day.iso] ?? [];
            const areaLabel = dayAreaLabels[day.iso];
            const tint = getAreaTint(areaLabel, areaOptions);

            return (
              <SortableContext
                key={day.iso}
                items={dayJobs.map((j) => j.id)}
                strategy={verticalListSortingStrategy}
              >
                <MobileDayColumn
                  listId={listId}
                  label={format(day.date, "EEEE")}
                  dateLabel={format(day.date, "d MMM")}
                  areaLabel={areaLabel}
                  tintClass={tint}
                  jobs={dayJobs}
                />
              </SortableContext>
            );
          })}
        </div>

        {/* Drawer */}
        <div
          ref={drawerRef}
          className="fixed inset-y-0 left-0 z-40 w-[300px] max-w-[80vw] transition-transform duration-300"
          style={{ transform: `translateX(${drawerOffset}px)` }}
        >
          <div className="h-full bg-white shadow-2xl border-r border-[var(--app-border)] flex flex-col">
            <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setDrawerOpen((v) => !v)}
              >
                Menu
              </button>
              <span className="text-sm font-semibold text-slate-900">Backlog</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {drawerOpen ? (
                <SortableContext
                  items={orderedBacklogJobs.map((j) => j.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <BacklogColumn jobs={orderedBacklogJobs} droppableId="backlog" hideHeader />
                </SortableContext>
              ) : (
                <div className="text-xs text-slate-500">Swipe to open backlog</div>
              )}
            </div>
          </div>
        </div>

        {drawerOpen && <div className="fixed inset-0 z-30 bg-black/20 pointer-events-none" />}

        {DEBUG_MOBILE_DND ? (
          <div className="fixed bottom-3 left-3 z-[60] max-w-[90vw] rounded-lg border border-slate-200 bg-white/90 p-2 text-[11px] text-slate-900 shadow-lg pointer-events-none">
            <div>activeId: {debugState.activeId ?? "-"}</div>
            <div>lastOverId: {debugState.lastOverId ?? "-"}</div>
            <div>rawOverId: {debugState.rawOverId ?? "-"}</div>
            <div>destListId: {debugState.resolvedDestListId ?? "-"}</div>
            <div>containerId: {debugState.resolvedContainerId ?? "-"}</div>
            <div>drawerOpen: {String(debugState.drawerOpen)}</div>
            <div>
              pointer: {debugState.pointerX ?? "-"}, {debugState.pointerY ?? "-"}
            </div>
            <div>pointerInsideDrawer: {String(debugState.pointerInsideDrawer)}</div>
            <div>action: {debugState.action ?? "-"}</div>
          </div>
        ) : null}

        {DEBUG_MOBILE_ERRORS ? (
          <div className="fixed top-3 left-3 z-[60] max-w-[90vw] rounded-lg border border-rose-200 bg-white/95 p-2 text-[11px] text-rose-800 shadow-lg pointer-events-none">
            <div className="font-semibold">Mobile errors</div>
            {errorEvents.length === 0 ? (
              <div>None</div>
            ) : (
              errorEvents.map((msg, idx) => <div key={`${idx}-${msg}`}>{msg}</div>)
            )}
          </div>
        ) : null}

        <DragOverlay>
          {activeJob ? (
            <div className="rotate-[-1.5deg] scale-[1.03] shadow-2xl">
              <JobCard job={activeJob} openOnClick={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function MobileDayColumn({
  listId,
  label,
  dateLabel,
  areaLabel,
  tintClass,
  jobs
}: {
  listId: string;
  label: string;
  dateLabel: string;
  areaLabel?: string;
  tintClass: string;
  jobs: Job[];
}) {
  const { setNodeRef } = useDroppable({
    id: listId,
    data: { type: "container", containerId: listId }
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border border-[var(--app-border)] shadow-[var(--app-shadow-soft)] p-3 ${
        tintClass || "bg-[var(--app-surface)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="text-xs text-slate-600">{dateLabel}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          {areaLabel ? <span className="badge-muted">{areaLabel}</span> : null}
          <span>Jobs {jobs.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {jobs.length === 0 ? (
          <p className="text-xs text-slate-500">No jobs scheduled</p>
        ) : (
          jobs.map((job) => <SortableJobCard key={job.id} job={job} listId={listId} />)
        )}
      </div>
    </section>
  );
}

function mergeOrder(existing: string[] | undefined, currentIds: string[]) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const id of existing ?? []) {
    if (!seen.has(id) && currentIds.includes(id)) {
      merged.push(id);
      seen.add(id);
    }
  }

  for (const id of currentIds) {
    if (!seen.has(id)) {
      merged.push(id);
      seen.add(id);
    }
  }

  return merged;
}

function orderJobs<T extends { id: string }>(
  listId: string,
  orderByList: Record<string, string[]>,
  list: T[]
): T[] {
  const currentIds = list.map((j) => j.id);
  const merged = mergeOrder(orderByList[listId], currentIds);

  const index = new Map<string, number>();
  merged.forEach((id, i) => index.set(id, i));

  const stablePos = new Map<string, number>();
  list.forEach((j, i) => stablePos.set(j.id, i));

  return [...list].sort((a, b) => {
    const ai = index.get(a.id);
    const bi = index.get(b.id);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return (stablePos.get(a.id) ?? 0) - (stablePos.get(b.id) ?? 0);
  });
}
