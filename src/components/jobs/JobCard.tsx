"use client";

import type { Job } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatClientName } from "@/lib/formatClientName";
import { useSchedulerStore } from "@/store/useSchedulerStore";

function areaColor(area: Job["areaTag"]) {
  const normalized = area?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const map: Record<string, string> = {
    bairnsdale: "bg-blue-500",
    bdale: "bg-blue-500",
    lakes: "bg-green-500",
    lakesentrance: "bg-green-500",
    sale: "bg-purple-500",
    melbourne: "bg-red-500",
    melb: "bg-red-500",
    orbost: "bg-orange-500",
    saphirecoast: "bg-yellow-400",
    sapphirecoast: "bg-yellow-400"
  };
  return map[normalized] ?? "bg-slate-400";
}

interface Props {
  job: Job;
  openOnClick?: boolean;
  onOpen?: () => void;
  compact?: boolean;
}

const OPEN_CLICK_COUNT = 2;

export default function JobCard({ job, openOnClick = true, onOpen, compact = false }: Props) {
  const router = useRouter();
  const { moveJob } = useSchedulerStore();
  const hasMaterialNotes = Array.isArray((job as any).materialProductUpdates)
    ? ((job as any).materialProductUpdates as any[]).length > 0
    : false;
  const hasAnyNotes = hasMaterialNotes || Boolean(job.internalNotes);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);

  const openJob =
    onOpen ??
    (() => {
      const returnTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search + window.location.hash
          : "";
      const href = returnTo
        ? `/jobs/${job.id}?return=${encodeURIComponent(returnTo)}`
        : `/jobs/${job.id}`;
      router.push(href);
    });

  const isBacklog = job.status === "backlog" && !job.assignedDate;
  const showBacklogButton = openOnClick && !isBacklog;

  const handleClick = useCallback(() => {
    if (!openOnClick) return;
    clickCountRef.current += 1;
    if (clickTimerRef.current == null) {
      clickTimerRef.current = window.setTimeout(() => {
        clickCountRef.current = 0;
        clickTimerRef.current = null;
      }, 450);
    }
    if (clickCountRef.current >= OPEN_CLICK_COUNT) {
      if (clickTimerRef.current != null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      openJob();
    }
  }, [openOnClick, openJob]);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current != null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const cardPadding = compact ? "px-2 py-1.5" : "px-3 py-2";
  const backlogButtonClass = useMemo(
    () =>
      compact
        ? "mt-1 text-[10px] px-1.5 py-0.5 rounded border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
        : "mt-2 text-[11px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50",
    [compact]
  );

  return (
    <div
      id={`job-${job.id}`}
      data-job-id={job.id}
      role={openOnClick ? "button" : undefined}
      tabIndex={openOnClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={
        openOnClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openJob();
              }
          }
          : undefined
      }
      className={`w-full text-left app-card ${cardPadding} relative hover:shadow-md hover:border-slate-300 transition-shadow ${
        openOnClick ? "cursor-pointer" : ""
      }`}
    >
      <span
        className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${areaColor(
          job.areaTag
        )} shadow`}
      />
      <div className={`h-1 rounded-t-2xl -mx-3 mb-1 ${areaColor(job.areaTag)}`} />
      <div className={`${compact ? "text-sm" : "text-base"} font-semibold text-slate-900 truncate`}>
        {formatClientName(job.clientName)}
      </div>
      <div className="text-[11px] text-slate-600 truncate">
        {job.jobAddress}
      </div>
      {!compact && (
        <div className="text-xs text-slate-500 line-clamp-2 mt-1">
          {job.description}
        </div>
      )}
      {hasAnyNotes ? (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>See Note</span>
        </div>
      ) : null}
      {!compact && job.estimatedDurationHours && (
        <div className="mt-1 text-[11px] text-slate-500">
          ~{job.estimatedDurationHours}h - {job.crew ?? "Install crew"}
        </div>
      )}
      {showBacklogButton ? (
        <button
          type="button"
          className={backlogButtonClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            void moveJob(job.id, null);
          }}
        >
          Back to backlog
        </button>
      ) : null}
    </div>
  );
}
