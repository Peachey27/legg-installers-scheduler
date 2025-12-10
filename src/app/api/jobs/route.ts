export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { isNull } from "drizzle-orm";
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

    const requiredFields = [
      "clientName",
      "clientPhone",
      "clientAddress",
      "jobAddress",
      "description",
      "areaTag",
      "status"
    ] as const;

    for (const key of requiredFields) {
      if (!body[key]) {
        throw new Error(`Missing required field: ${key}`);
      }
    }

    const id = randomUUID();
    const payload = {
      id,
      clientName: body.clientName,
      clientAddress: body.clientAddress,
      clientPhone: body.clientPhone,
      billingAddress: body.billingAddress ?? body.clientAddress,
      jobAddress: body.jobAddress,
      dateTaken: body.dateTaken,
      totalPrice: body.totalPrice ?? null,
      description: body.description,
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

    await db.insert(jobs).values(payload);

    return NextResponse.json(payload, { status: 201 });
  } catch (error: any) {
    console.error("Create job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
