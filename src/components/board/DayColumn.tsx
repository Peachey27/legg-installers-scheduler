"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import JobCard from "../jobs/JobCard";
import { Draggable } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
}

export default function DayColumn({ label, date, isoDate, jobs }: Props) {
  const { dayAreaLabels, setDayAreaLabel } = useSchedulerStore();
  const area = dayAreaLabels[isoDate];
  const areaStyle = getAreaStyle(area);

  const totalHours = jobs.reduce(
    (sum, j) => sum + (j.estimatedDurationHours ?? 0),
    0
  );

  return (
    <div
      className={`h-full rounded-2xl bg-[#f6f0e7]/90 border border-amber-200/70 shadow-inner flex flex-col p-3 transition-shadow ${areaStyle?.ring ?? ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-amber-900">
            {label} {format(date, "d/MM")}
          </div>
          <div className="text-xs text-amber-900/70">
            Total hours: {totalHours.toFixed(1)}h
          </div>
        </div>
        <button
          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
            areaStyle?.badge ??
            "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
          }`}
          onClick={() => {
            const newLabel = prompt(
              "Area label for this day (e.g. Bairnsdale run):",
              area ?? ""
            );
            if (newLabel !== null) {
              const trimmed = newLabel.trim();
              setDayAreaLabel(isoDate, trimmed || undefined);
            }
          }}
        >
          {area ? area : "Set area"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {jobs.map((job, index) => (
          <Draggable draggableId={job.id} index={index} key={job.id}>
            {(provided) => (
              <div
                key={job.id}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <JobCard job={job} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}

function getAreaStyle(label?: string) {
  if (!label) return null;
  const normalized = label.toLowerCase().replace(/[^a-z]/g, "");

  const styleMap: Record<string, { ring: string; badge: string }> = {
    bairnsdale: {
      ring: "ring-4 ring-offset-2 ring-blue-400 ring-offset-amber-50 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    bdale: {
      ring: "ring-4 ring-offset-2 ring-blue-400 ring-offset-amber-50 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    lakesentrance: {
      ring: "ring-4 ring-offset-2 ring-green-400 ring-offset-amber-50 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    lakes: {
      ring: "ring-4 ring-offset-2 ring-green-400 ring-offset-amber-50 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    orbost: {
      ring: "ring-4 ring-offset-2 ring-orange-400 ring-offset-amber-50 shadow-lg",
      badge:
        "border-orange-200 text-orange-800 bg-orange-50/80 hover:bg-orange-100"
    },
    saphirecoast: {
      ring: "ring-4 ring-offset-2 ring-yellow-300 ring-offset-amber-50 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    sapphirecoast: {
      ring: "ring-4 ring-offset-2 ring-yellow-300 ring-offset-amber-50 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    melbourne: {
      ring: "ring-4 ring-offset-2 ring-red-400 ring-offset-amber-50 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    },
    melb: {
      ring: "ring-4 ring-offset-2 ring-red-400 ring-offset-amber-50 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    }
  };

  return styleMap[normalized] ?? null;
}
