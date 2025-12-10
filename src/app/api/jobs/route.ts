export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const allJobs = await db.select().from(jobs);
    return NextResponse.json(allJobs, { status: 200 });
  } catch (error) {
    console.error("GET /api/jobs failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const today = new Date().toISOString().slice(0, 10);
    const id = randomUUID();
    const payload = {
      id,
      clientName: body.clientName ?? "",
      clientAddress: body.clientAddress ?? "",
      clientPhone: body.clientPhone ?? "",
      billingAddress: body.billingAddress ?? body.clientAddress ?? "",
      jobAddress: body.jobAddress ?? "",
      dateTaken: body.dateTaken ?? today,
      totalPrice: body.totalPrice ?? null,
      description: body.description ?? "",
      invoiceNumber: body.invoiceNumber ?? null,
      estimateNumber: body.estimateNumber ?? null,
      cashSaleNumber: body.cashSaleNumber ?? null,
      measurements: body.measurements ?? null,
      glassOrProductDetails: body.glassOrProductDetails ?? null,
      quotedRange: body.quotedRange ?? null,
      internalNotes: body.internalNotes ?? null,
      assignedDate: body.assignedDate ?? null,
      estimatedDurationHours: body.estimatedDurationHours ?? null,
      crew: body.crew ?? null,
      areaTag: body.areaTag ?? "Other",
      status: body.status ?? "backlog",
      factoryJobId: body.factoryJobId ?? null,
      photo1Url: body.photo1Url ?? null,
      photo2Url: body.photo2Url ?? null,
      photo3Url: body.photo3Url ?? null,
      deletedAt: null
    };

    // Basic sanity check
    const missing = ["clientName", "clientAddress", "jobAddress", "description"].filter(
      (k) => !(payload as any)[k]
    );
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    await db.insert(jobs).values(payload);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("Create job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
