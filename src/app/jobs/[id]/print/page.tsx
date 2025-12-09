import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import PrintJobCard from "@/components/jobs/PrintJobCard";

interface Params {
  params: { id: string };
}

export default async function PrintJobPage({ params }: Params) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));

  if (!job || job.deletedAt) {
    return <div className="p-4">Not found</div>;
  }

  return <PrintJobCard job={job} />;
}
