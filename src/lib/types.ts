export type JobStatus =
  | "backlog"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AreaTag = "Lakes" | "Bairnsdale" | "Metung" | "Orbost" | "Other";

export interface Job {
  id: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  billingAddress: string | null;
  jobAddress: string;
  dateTaken: string;
  totalPrice: number | null;
  description: string;
  invoiceNumber: string | null;
  estimateNumber: string | null;
  cashSaleNumber: string | null;

  measurements: string | null;
  glassOrProductDetails: string | null;
  quotedRange: string | null;
  internalNotes: string | null;

  assignedDate: string | null;
  estimatedDurationHours: number | null;
  crew: string | null;
  areaTag: AreaTag;
  status: JobStatus;
  factoryJobId: string | null;

  photo1Url: string | null;
  photo2Url: string | null;
  photo3Url: string | null;

  deletedAt: string | null;
}
