// Allow any backend string value
// Allow any backend string value
export type JobStatus = string;
export type AreaTag = string;

export interface MaterialProductUpdate {
  id: string;
  label: string;
  date: string;
}

export interface Job {
  id: string;
  clientName: string;
  clientAddress: string;
  clientAddressLat: number | null;
  clientAddressLng: number | null;
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
  materialProductUpdates: MaterialProductUpdate[];

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
