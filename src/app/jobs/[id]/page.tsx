import Link from "next/link";
import JobDetailEditor from "@/components/jobs/JobDetailEditor";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

interface Params {
  params: { id: string };
}

export default async function JobDetailPage({ params }: Params) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/jobs/${params.id}`, {
    cache: "no-store"
  });
  if (!res.ok) {
    return <div className="p-4">Job not found.</div>;
  }

  const job = await res.json();

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
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href={`/jobs/${job.id}/print`}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
            >
              Print card
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Back to board
            </Link>
          </div>
        </div>

        <JobDetailEditor job={job} />
      </div>
    </main>
  );
}
