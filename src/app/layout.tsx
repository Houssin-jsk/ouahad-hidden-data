import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "HIDDEN DATA — by OUAHAD SPACE",
  description:
    "Explore color and light locally in your browser, with optional, consent-based Cloud AI observations.",
  icons: { icon: "/brand/app_icon.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
