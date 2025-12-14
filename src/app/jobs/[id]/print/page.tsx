import PrintJobCard from "@/components/jobs/PrintJobCard";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: { id: string };
}

function getBaseUrlFromHeaders() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

export default async function PrintJobPage({ params }: Params) {
  const baseUrl = getBaseUrlFromHeaders();
  let job: any = null;

  try {
    const res = await fetch(`${baseUrl}/api/jobs/${params.id}`, {
      cache: "no-store"
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[print-job] fetch failed", res.status, text);
      return <div className="p-4">Not found</div>;
    }
    try {
      job = JSON.parse(text);
    } catch (err) {
      console.error("[print-job] parse error", err, text);
      return <div className="p-4">Not found</div>;
    }
  } catch (err) {
    console.error("[print-job] fetch error", err);
    return <div className="p-4">Not found</div>;
  }

  if (!job || job.deletedAt) {
    return <div className="p-4">Not found</div>;
  }

  return <PrintJobCard job={job} />;
}
