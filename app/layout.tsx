import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revival Dashboard",
  description: "Team Collaboration & Project Management Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="grid-bg">{children}</body>
    </html>
  );
}
