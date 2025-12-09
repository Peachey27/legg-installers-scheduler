import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "LEGG Installers Scheduler"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f3e6d9]">
        <div className="min-h-screen bg-[radial-gradient(circle_at_1px_1px,#d9c4a5_1px,transparent_0)] bg-[length:12px_12px]">
          {children}
        </div>
      </body>
    </html>
  );
}
