import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://banners.carbon.is-a.dev"),
  title: "anime-banners · Rotating GitHub Profile Banner",
  description:
    "Dynamic rotating GitHub profile banners with 850+ anime girls holding programming books. Cropped to perfection with smart edge attention.",
  openGraph: {
    title: "anime-banners · GitHub Profile Banner Generator",
    description: "850+ curated anime programming banners for your GitHub profile README.",
    url: "https://banners.carbon.is-a.dev",
    siteName: "anime-banners",
    images: [
      {
        url: "/api/banner?preset=github&badge=true",
        width: 1844,
        height: 999,
        alt: "Anime Programming Banner",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "anime-banners · Rotating GitHub Profile Banner",
    description: "850+ curated anime programming banners for your GitHub profile README.",
    images: ["/api/banner?preset=github&badge=true"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>" />
      </head>
      <body className="min-h-screen bg-[#0d0e12] text-[#e8e9ed] selection:bg-pink-500/30 selection:text-pink-200">
        {children}
      </body>
    </html>
  );
}
