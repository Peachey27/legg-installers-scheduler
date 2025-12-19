"use client";

import { useMemo } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { addDays, format, startOfWeek } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import BacklogColumn from "./BacklogColumn";
import CompactDayColumn from "./CompactDayColumn";

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

  const baseStart = useMemo(
    () => startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const weeks: Week[] = useMemo(() => {
    const buildWeek = (start: Date) => {
      const days: Week["days"] = [];
      // Monday through Saturday (Sunday excluded)
      for (let i = 0; i < 6; i++) {
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
        <div className="flex items-center gap-2 px-4 pt-3 text-sm text-amber-900">
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => onWeekOffsetChange(weekOffset - 1)}
          >
            ƒÅ? Prev weeks
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => onWeekOffsetChange(0)}
          >
            Today
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => onWeekOffsetChange(weekOffset + 1)}
          >
            Next weeks ƒÅ'
          </button>
          <span className="ml-auto text-xs">
            Starting {format(weeks[0].days[0].date, "d MMM")}
          </span>
        </div>

        <div className="px-4">
          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="w-full max-w-xl"
              >
                <BacklogColumn jobs={backlogJobs} placeholder={provided.placeholder} />
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
