"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import JobCard from "../jobs/JobCard";
import { Draggable } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { useMemo, useState } from "react";

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
  const baseAreas = useMemo(
    () => ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"],
    []
  );
  const normalizedArea = area?.toLowerCase() ?? "";
  const isCustomArea = area ? !baseAreas.some((a) => a.toLowerCase() === normalizedArea) : false;
  const [customAreaInput, setCustomAreaInput] = useState(
    isCustomArea ? area ?? "" : ""
  );

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
        <div className="flex items-center gap-2">
          <select
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
            }`}
            value={
              isCustomArea
                ? "__custom"
                : baseAreas.find((a) => a.toLowerCase() === normalizedArea) ??
                  ""
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom") {
                setCustomAreaInput("");
                setDayAreaLabel(isoDate, undefined);
              } else {
                setCustomAreaInput("");
                setDayAreaLabel(isoDate, val || undefined);
              }
            }}
          >
            <option value="">Set area</option>
            {baseAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="__custom">Add new area</option>
          </select>
          { (isCustomArea || customAreaInput) && (
            <div className="flex items-center gap-1">
              <input
                className="text-xs rounded border border-amber-200 px-2 py-1 bg-white"
                placeholder="Custom area"
                value={customAreaInput || area || ""}
                onChange={(e) => setCustomAreaInput(e.target.value)}
              />
              <button
                className="text-[11px] px-2 py-1 rounded border border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
                onClick={() => {
                  const trimmed = (customAreaInput || area || "").trim();
                  setDayAreaLabel(isoDate, trimmed || undefined);
                  if (!trimmed) {
                    setCustomAreaInput("");
                  }
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
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
      ring: "border-[12px] border-blue-400 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    bdale: {
      ring: "border-[12px] border-blue-400 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    lakesentrance: {
      ring: "border-[12px] border-green-400 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    lakes: {
      ring: "border-[12px] border-green-400 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    orbost: {
      ring: "border-[12px] border-orange-400 shadow-lg",
      badge:
        "border-orange-200 text-orange-800 bg-orange-50/80 hover:bg-orange-100"
    },
    saphirecoast: {
      ring: "border-[12px] border-yellow-300 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    sapphirecoast: {
      ring: "border-[12px] border-yellow-300 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    melbourne: {
      ring: "border-[12px] border-red-400 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    },
    melb: {
      ring: "border-[12px] border-red-400 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    },
    sale: {
      ring: "border-[12px] border-purple-400 shadow-lg",
      badge:
        "border-purple-200 text-purple-800 bg-purple-50/80 hover:bg-purple-100"
    }
  };

  return styleMap[normalized] ?? null;
}
