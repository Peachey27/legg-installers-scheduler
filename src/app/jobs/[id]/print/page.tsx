import PrintJobCard from "@/components/jobs/PrintJobCard";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: { id: string };
}

export default async function PrintJobPage({ params }: Params) {
  let job: any = null;
  try {
    const rows = await db.select().from(jobs).where(eq(jobs.id, params.id));
    job = rows[0] ?? null;
  } catch (err) {
    console.error("[print-job] db fetch error", err);
    return <div className="p-4">Not found</div>;
  }

  if (!job || job.deletedAt) {
    return <div className="p-4">Not found</div>;
  }

  return <PrintJobCard job={job} />;
}
