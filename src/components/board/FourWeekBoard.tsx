"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, DropResult, Draggable } from "@hello-pangea/dnd";
import { addDays, format, startOfWeek } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import CompactDayColumn from "./CompactDayColumn";
import JobCard from "../jobs/JobCard";

type Props = {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onZoomToWeek?: (offset: number) => void;
};

type Week = {
  start: Date;
  days: { label: string; date: Date; iso: string }[];
  displayRange: string;
};

export default function FourWeekBoard({
  weekOffset,
  onWeekOffsetChange,
  onZoomToWeek
}: Props) {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});

  const baseStart = useMemo(
    () => startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const weeks: Week[] = useMemo(() => {
    const buildWeek = (start: Date) => {
      const days: Week["days"] = [];
      // Monday through Friday (Sunday/Saturday excluded)
      for (let i = 0; i < 5; i++) {
        const dayDate = addDays(start, i);
        const iso = format(dayDate, "yyyy-MM-dd");
        days.push({ label: format(dayDate, "EEE"), date: dayDate, iso });
      }
      const range = `${format(days[0].date, "d MMM")} - ${format(
        days[days.length - 1].date,
        "d MMM"
      )}`;
      return { start, days, displayRange: range };
    };

    return Array.from({ length: 4 }, (_, i) => {
      const start = addDays(baseStart, i * 7);
      return buildWeek(start);
    });
  }, [baseStart]);

  const backlogJobs = jobs.filter(
    (j) =>
      (!j.assignedDate || j.status === "backlog") &&
      j.status !== "completed" &&
      j.status !== "cancelled"
  );
  const orderedBacklogJobs = orderJobs("backlog", orderByList, backlogJobs);

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const w of weeks) {
    for (const d of w.days) {
      jobsByDate[d.iso] = jobs.filter(
        (j) =>
          j.assignedDate === d.iso &&
          j.status !== "cancelled" &&
          j.status !== "completed" &&
          !j.deletedAt
      );
    }
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const target = destination.droppableId;
    const assignedDate = target === "backlog" ? null : target;

    // Handle backlog ordering
    if (source.droppableId === "backlog" || destination.droppableId === "backlog") {
      setOrderByList((prev) => {
        const currentIds = orderedBacklogJobs.map((j) => j.id);
        let next = mergeOrder(prev.backlog, currentIds);

        // remove dragged card from current ordering
        next = next.filter((id) => id !== draggableId);

        // insert when dropping into backlog
        if (!assignedDate) {
          const insertAt = Math.min(Math.max(destination.index, 0), next.length);
          next.splice(insertAt, 0, draggableId);
        }

        return { ...prev, backlog: next };
      });
    }

    // If just reordering inside backlog, no backend call needed.
    if (source.droppableId === "backlog" && destination.droppableId === "backlog") {
      return;
    }

    if (assignedDate) {
      const job = jobs.find((j) => j.id === draggableId);
      const dayArea = dayAreaLabels[assignedDate];
      const jobArea = job?.areaTag;
      if (
        job &&
        dayArea &&
        jobArea &&
        normalize(dayArea) &&
        normalize(jobArea) !== normalize(dayArea)
      ) {
        const ok = window.confirm(
          `This job is tagged "${jobArea}", but the day is set to "${dayArea}". Drop here anyway?`
        );
        if (!ok) return;
      }
    }

    void moveJob(draggableId, assignedDate);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-2 h-[calc(100vh-56px)] overflow-y-auto">
        <div className="px-4 pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-900">
            <span className="font-semibold">Week range {weeks[0].displayRange}</span>
            <span className="text-[11px] font-semibold">Backlog</span>
          </div>
          <Droppable droppableId="backlog" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-2 overflow-x-auto rounded-2xl border border-amber-200/70 bg-[#f6f0e7]/90 p-3 shadow-inner"
              >
                {orderedBacklogJobs.map((j, index) => (
                  <Draggable key={j.id} draggableId={j.id} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="min-w-[200px] max-w-[220px] flex-shrink-0"
                      >
                        <JobCard job={j} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-2">
          {weeks.map((week, index) => (
            <div key={week.start.toISOString()} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-amber-900">
                <span className="font-semibold">
                  Week {index + 1} ({week.displayRange})
                </span>
                {onZoomToWeek ? (
                  <button
                    className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs"
                    onClick={() => onZoomToWeek(weekOffset + index)}
                  >
                    Zoom to this week
                  </button>
                ) : null}
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
                {week.days.map((d) => (
                  <Droppable droppableId={d.iso} key={d.iso} direction="vertical">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="min-w-[160px] min-h-[170px]"
                      >
                        <CompactDayColumn
                          date={d.date}
                          isoDate={d.iso}
                          label={d.label}
                          jobs={jobsByDate[d.iso] ?? []}
                          areaLabel={dayAreaLabels[d.iso]}
                          placeholder={provided.placeholder}
                        />
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}

function normalize(val?: string | null) {
  return val?.trim().toLowerCase() ?? "";
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
