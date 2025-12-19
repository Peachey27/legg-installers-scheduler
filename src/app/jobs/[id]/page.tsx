import Link from "next/link";
import JobDetailEditor from "@/components/jobs/JobDetailEditor";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: { id: string };
}

export default async function JobDetailPage({ params }: Params) {
  let job: any = null;
  try {
    const hdrs = headers();
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/jobs/${params.id}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[job-detail] fetch failed", res.status, body);
      return <div className="p-4">Job not found.</div>;
    }
    job = await res.json();
  } catch (err) {
    console.error("[job-detail] fetch error", err);
    return <div className="p-4">Job not found.</div>;
  }

  if (!job || job.deletedAt) {
    return <div className="p-4">Job not found.</div>;
  }

  const statusLabel = job.status.replace("_", " ");
  const scheduleLabel = job.assignedDate ? `Scheduled ${job.assignedDate}` : "Backlog";

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Job #{job.id}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {job.clientName}
            </h1>
            <p className="text-sm text-slate-600">
              {statusLabel} · {scheduleLabel}
            </p>
            <p className="text-xs text-slate-500">
              Taken: {job.dateTaken} · Area: {job.areaTag}
            </p>
          </div>
        </div>

        <JobDetailEditor job={job} />
      </div>
    </main>
  );
}
