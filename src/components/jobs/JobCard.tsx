"use client";

import type { Job } from "@/lib/types";
import { useRouter } from "next/navigation";

function areaColor(area: Job["areaTag"]) {
  switch (area) {
    case "Lakes":
      return "bg-sky-500";
    case "Bairnsdale":
      return "bg-emerald-500";
    case "Metung":
      return "bg-teal-500";
    case "Orbost":
      return "bg-orange-500";
    default:
      return "bg-slate-400";
  }
}

interface Props {
  job: Job;
}

export default function JobCard({ job }: Props) {
  const router = useRouter();
  const suburb = job.jobAddress.split(",")[1]?.trim() ?? "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/jobs/${job.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/jobs/${job.id}`);
        }
      }}
      className="w-full cursor-pointer text-left bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 relative hover:shadow-md transition-shadow"
    >
      <span
        className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${areaColor(
          job.areaTag
        )} shadow`}
      />
      <div className={`h-1 rounded-t-xl -mx-3 mb-1 ${areaColor(job.areaTag)}`} />
      <div className="text-sm font-semibold text-slate-900 truncate">
        {job.clientName}
      </div>
      <div className="text-xs text-slate-600 truncate">
        {suburb || job.jobAddress}
      </div>
      <div className="text-xs text-slate-500 line-clamp-2 mt-1">
        {job.description}
      </div>
      {job.estimatedDurationHours && (
        <div className="mt-1 text-[11px] text-slate-500">
          ~{job.estimatedDurationHours}h ƒ?½ {job.crew ?? "Install crew"}
        </div>
      )}
    </div>
  );
}
