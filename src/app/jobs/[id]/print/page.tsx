import PrintJobCard from "@/components/jobs/PrintJobCard";

interface Params {
  params: { id: string };
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function PrintJobPage({ params }: Params) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/jobs/${params.id}`, {
    cache: "no-store"
  });
  if (!res.ok) {
    return <div className="p-4">Not found</div>;
  }

  const job = await res.json();

  if (!job || job.deletedAt) {
    return <div className="p-4">Not found</div>;
  }

  return <PrintJobCard job={job} />;
}
