"use client";

import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import DayColumn from "./DayColumn";
import BacklogColumn from "./BacklogColumn";
import { startOfWeek, addDays, format } from "date-fns";

export default function WeekBoard() {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const days = Array.from({ length: 5 }).map((_, i) => {
    const date = addDays(weekStart, i);
    const iso = format(date, "yyyy-MM-dd");
    return { label: format(date, "EEE"), date, iso };
  });

  const backlogJobs = jobs.filter(
    (j) => !j.assignedDate || j.status === "backlog"
  );

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const d of days) {
    jobsByDate[d.iso] = jobs.filter(
      (j) =>
        j.assignedDate === d.iso &&
        j.status !== "cancelled" &&
        !j.deletedAt
    );
  }

  function onDragEnd(result: DropResult) {
    console.log("onDragEnd fired", result);

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

    // If dropping onto a dated column, warn when job area differs from the day's area label.
    if (assignedDate) {
      const job = jobs.find((j) => j.id === draggableId);
      const dayArea = dayAreaLabels[assignedDate];
      const jobArea = job?.areaTag;
      if (job && dayArea && jobArea && normalize(dayArea) && normalize(jobArea) !== normalize(dayArea)) {
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
      <div className="flex h-[calc(100vh-56px)] overflow-x-auto px-4 py-4 gap-3">
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
    </DragDropContext>
  );
}

function normalize(val?: string | null) {
  return val?.trim().toLowerCase() ?? "";
}
