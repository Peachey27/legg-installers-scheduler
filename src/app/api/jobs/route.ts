import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest) {
  const rows = await db
    .select()
    .from(jobs)
    .where(isNull(jobs.deletedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const id = randomUUID();
    await db.insert(jobs).values({
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
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error("Create job failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
