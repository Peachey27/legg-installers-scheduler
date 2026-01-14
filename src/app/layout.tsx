import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "LEGG Installers Scheduler"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--app-bg)]">
        <div className="min-h-screen bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.25)_1px,transparent_0),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] bg-[length:18px_18px,auto]">
          {children}
        </div>
      </body>
    </html>
  );
}
