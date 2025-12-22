"use client";

import { useEffect, useRef } from "react";
import type { Job } from "@/lib/types";
import { formatClientName } from "@/lib/formatClientName";

export function PrintJobCard({ job }: { job: Job }) {
  const areaHighlight = getAreaHighlight(job.areaTag);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (hasPrintedRef.current) return;
    hasPrintedRef.current = true;

    const hasOpener = typeof window !== "undefined" && !!window.opener;
    function finish() {
      if (hasOpener) {
        window.close();
        return;
      }
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/";
      }
    }

    window.onafterprint = finish;
    window.print();

    const timer = window.setTimeout(finish, 1500);
    return () => {
      window.onafterprint = null;
      window.clearTimeout(timer);
    };
  }, []);

  const descriptionLines = (job.description ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const noteLines = (job.internalNotes ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lineTexts = [...descriptionLines, ...noteLines].slice(0, 4);
  while (lineTexts.length < 4) {
    lineTexts.push("");
  }

  return (
    <div className="print-wrapper">
      <style>{`
        @page { size: 150mm 100mm; margin: 2mm; }
        body {
          margin: 0;
          background: white !important;
          font-family: "Inter", system-ui, sans-serif;
          color: #111;
        }
        .print-wrapper {
          display: flex;
          justify-content: center;
          padding: 0;
          width: 100%;
          height: 100%;
        }
        .card {
          width: 150mm;
          min-height: 100mm;
          max-height: 100mm;
          border: none;
          padding: 6mm 6mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 4mm;
          overflow: hidden;
          page-break-inside: avoid;
        }
        .row {
          display: flex;
          gap: 4mm;
        }
        .label {
          font-size: 11px;
          font-weight: 600;
          margin-right: 2mm;
          white-space: nowrap;
        }
        .value {
          flex: 1;
          border-bottom: 1px solid #000;
          min-height: 12px;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 700;
          font-style: italic;
          color: #0a61c5;
          padding-bottom: 1mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lines {
          display: grid;
          grid-template-rows: repeat(4, 1fr);
          gap: 2.5mm;
        }
        .line {
          border-bottom: 1px solid #000;
          min-height: 8mm;
          font-size: 13px;
          font-weight: 700;
          font-style: italic;
          color: #0a61c5;
          padding-bottom: 1mm;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          display: flex;
          align-items: flex-end;
        }
        .bottom-row {
          display: flex;
          gap: 4mm;
          align-items: flex-end;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      `}</style>

      <div className="card">
        <div className="row">
          <div style={{ flex: 1.2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
              <span className="label">Name:</span>
              <span className="value">{formatClientName(job.clientName)}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2mm",
                marginTop: "3mm"
              }}
            >
              <span className="label">Address:</span>
              <span
              className="value"
              style={
                areaHighlight
                  ? {
                      ...areaHighlight,
                      borderRadius: "2mm",
                      padding: "0.9mm 1.4mm"
                    }
                  : undefined
              }
            >
              {job.clientAddress}
            </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2mm",
                marginTop: "3mm"
              }}
            >
              <span className="label">Phone:</span>
              <span className="value">{job.clientPhone}</span>
            </div>
          </div>
          <div style={{ flex: 0.8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
              <span className="label">Invoice No.:</span>
              <span className="value">{job.invoiceNumber ?? ""}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2mm",
                marginTop: "3mm"
              }}
            >
              <span className="label">Estimate No.:</span>
              <span className="value">{job.estimateNumber ?? ""}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2mm",
                marginTop: "3mm"
              }}
            >
              <span className="label">Cash Sale No.:</span>
              <span className="value">{job.cashSaleNumber ?? ""}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2mm",
                marginTop: "3mm"
              }}
            >
              <span className="label">Date:</span>
              <span className="value">{job.dateTaken}</span>
            </div>
          </div>
        </div>

        <div className="lines">
          {lineTexts.map((text, idx) => (
            <div className="line" key={idx}>{text}</div>
          ))}
        </div>

        <div className="bottom-row">
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "2mm" }}>
            <span className="label">Job Address:</span>
            <span
              className="value"
              style={
                areaHighlight
                  ? {
                      ...areaHighlight,
                      borderRadius: "2mm",
                      padding: "0.9mm 1.4mm"
                    }
                  : undefined
              }
            >
              {job.jobAddress}
            </span>
          </div>
          <div
            style={{
              flex: 0.6,
              display: "flex",
              alignItems: "center",
              gap: "2mm"
            }}
          >
            <span className="label">Total Price: $</span>
            <span className="value" style={{ minWidth: "20mm" }}>
              {job.totalPrice ?? ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrintJobCard;

function getAreaHighlight(area: Job["areaTag"]) {
  const normalized = area?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const map: Record<string, [number, number, number]> = {
    bairnsdale: [59, 130, 246],
    bdale: [59, 130, 246],
    lakes: [34, 197, 94],
    lakesentrance: [34, 197, 94],
    sale: [168, 85, 247],
    melbourne: [239, 68, 68],
    melb: [239, 68, 68],
    orbost: [249, 115, 22],
    saphirecoast: [234, 179, 8],
    sapphirecoast: [234, 179, 8]
  };
  const rgb = map[normalized] ?? [148, 163, 184];
  const bgAlpha = 0.65;
  return {
    backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${bgAlpha})`,
    border: `1px solid rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`,
    boxShadow: `0 0 1mm rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.7) inset`
  };
}
