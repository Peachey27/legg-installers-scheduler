"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import DayColumn from "./DayColumn";
import BacklogColumn from "./BacklogColumn";
import { startOfWeek, addDays, addWeeks, format } from "date-fns";

export default function WeekBoard() {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  // Show a 5-week window by default: previous week + current + next 3 weeks.
  const weekStart = startOfWeek(addWeeks(today, weekOffset - 1), {
    weekStartsOn: 1
  });

  const days = useMemo(() => {
    const result: { label: string; date: Date; iso: string }[] = [];
    for (let week = 0; week < 5; week++) {
      for (let day = 0; day < 5; day++) {
        const date = addDays(weekStart, week * 7 + day); // Mon–Fri only
        const iso = format(date, "yyyy-MM-dd");
        result.push({ label: format(date, "EEE d/M"), date, iso });
      }
    }
    return result;
  }, [weekStart]);

  const backlogJobs = jobs.filter(
    (j) =>
      (!j.assignedDate || j.status === "backlog") &&
      j.status !== "completed" &&
      j.status !== "cancelled"
  );

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const d of days) {
    jobsByDate[d.iso] = jobs.filter(
      (j) =>
        j.assignedDate === d.iso &&
        j.status !== "cancelled" &&
        j.status !== "completed" &&
        !j.deletedAt
    );
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

    // Warn if dropping onto a day with a different area label.
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
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="flex items-center gap-2 px-4 pt-3 text-sm text-amber-900">
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => setWeekOffset((v) => v - 1)}
          >
            ← Prev week
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => setWeekOffset(1)}
          >
            Today
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => setWeekOffset((v) => v + 4)}
          >
            +4 weeks →
          </button>
          <span className="ml-auto text-xs">
            Starting {format(weekStart, "d MMM")}
          </span>
        </div>

        <div className="flex-1 flex overflow-x-scroll px-4 py-3 gap-3 scrollbar-thin">
          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="w-64 flex-shrink-0"
              >
                <BacklogColumn jobs={backlogJobs} />
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {days.map((d) => (
            <Droppable droppableId={d.iso} key={d.iso}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 min-w-[260px] px-1"
                >
                  <DayColumn
                    date={d.date}
                    isoDate={d.iso}
                    label={d.label}
                    jobs={jobsByDate[d.iso] ?? []}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}

function normalize(val?: string | null) {
  return val?.trim().toLowerCase() ?? "";
}
