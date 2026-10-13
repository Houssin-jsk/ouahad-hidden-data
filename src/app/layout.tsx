import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "HIDDEN DATA — by OUAHAD SPACE",
  description:
    "Every image has a story. Explore color and light, privately in your browser.",
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
