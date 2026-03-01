import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "The Semantic Cinematographer",
  description: "The world's first real-time AI cinematographer. Live.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
