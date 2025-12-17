export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, params.id));
  if (!job || job.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(job);
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const normalizedBody = {
      ...body,
      materialProductUpdates: Array.isArray(body.materialProductUpdates)
        ? body.materialProductUpdates
        : []
    };
    const updatePayload =
      normalizedBody.status === "cancelled"
        ? { ...normalizedBody, deletedAt: new Date().toISOString() }
        : normalizedBody;

    await db.update(jobs).set(updatePayload).where(eq(jobs.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await db
    .update(jobs)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(jobs.id, params.id));
  return NextResponse.json({ ok: true });
}
