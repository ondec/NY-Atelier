import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NY Atelier | Staff preview",
  description: "NY Atelier's connected order preview for the team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
