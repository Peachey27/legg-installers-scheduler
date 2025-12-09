import { db } from "./client";
import { jobs } from "./schema";
import { randomUUID } from "crypto";

async function main() {
  // @ts-ignore drizzle delete helper
  await db.delete(jobs);

  const today = new Date().toISOString().slice(0, 10);

  await db.insert(jobs).values([
    {
      id: randomUUID(),
      clientName: "Pet mesh rewire",
      clientAddress: "12 Nungurner Rd, Nungurner VIC",
      clientPhone: "0400 000 000",
      billingAddress: "12 Nungurner Rd, Nungurner VIC",
      jobAddress: "12 Nungurner Rd, Nungurner VIC",
      dateTaken: today,
      totalPrice: null,
      description: "Rewire pet mesh to sliding door and sidelight.",
      invoiceNumber: null,
      estimateNumber: "EST-1234",
      cashSaleNumber: null,
      measurements: "Door approx 900w x 2100h, sidelight 300w x 2100h",
      glassOrProductDetails: "Pet mesh, black",
      quotedRange: "$300–$350",
      internalNotes: "Dog is friendly but excitable. Parking on gravel drive.",
      assignedDate: null,
      estimatedDurationHours: 2,
      crew: "Install crew",
      areaTag: "Lakes",
      status: "backlog",
      factoryJobId: null,
      photo1Url: null,
      photo2Url: null,
      photo3Url: null,
      deletedAt: null
    },
    {
      id: randomUUID(),
      clientName: "Pool fence panel broke (warranty)",
      clientAddress: "21 Foreshore Dr, Newlands Arm VIC",
      clientPhone: "0401 111 111",
      billingAddress: "21 Foreshore Dr, Newlands Arm VIC",
      jobAddress: "21 Foreshore Dr, Newlands Arm VIC",
      dateTaken: today,
      totalPrice: null,
      description: "Replace shattered pool fence panel under warranty. Check all spigots.",
      invoiceNumber: null,
      estimateNumber: null,
      cashSaleNumber: null,
      measurements: "Panel ~1200w x 1200h – confirm on site.",
      glassOrProductDetails: "12mm CLR TGH pool glass",
      quotedRange: "$0 – warranty",
      internalNotes: "Customer expects same spec as original install.",
      assignedDate: today,
      estimatedDurationHours: 1.5,
      crew: "Service crew",
      areaTag: "Bairnsdale",
      status: "scheduled",
      factoryJobId: null,
      photo1Url: null,
      photo2Url: null,
      photo3Url: null,
      deletedAt: null
    }
  ]);

  console.log("Seeded jobs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
