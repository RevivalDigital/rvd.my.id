import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rvd.my.id"),
  title: {
    default: "Revival Digital Studio",
    template: "%s | Revival Digital Studio",
  },
  description:
    "Revival Digital Studio membantu bisnis dan creator membangun website, dashboard, dan produk digital modern yang siap skala.",
  keywords: [
    "Revival Digital Studio",
    "jasa pembuatan website",
    "web development studio",
    "Next.js",
    "PocketBase",
    "dashboard",
    "aplikasi web custom",
  ],
  openGraph: {
    type: "website",
    siteName: "Revival Digital Studio",
    title: "Revival Digital Studio",
    description:
      "Studio pengembangan web yang menghidupkan kembali ide dan sistem digital Anda dengan produk modern, cepat, dan presisi.",
    url: "https://rvd.my.id",
    images: [
      {
        url: "/images/tradelog-dashboard.png",
        width: 1200,
        height: 600,
        alt: "Tampilan dashboard TradeLog buatan Revival Digital Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Revival Digital Studio",
    description:
      "Studio pengembangan web untuk membangun website, dashboard, dan produk digital modern.",
    images: ["/images/tradelog-dashboard.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Revival Digital Studio",
  url: "https://rvd.my.id",
  description:
    "Revival Digital Studio adalah studio pengembangan web yang membantu bisnis membangun website, dashboard, dan aplikasi web modern.",
  sameAs: [],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="grid-bg">{children}</body>
    </html>
  );
}
