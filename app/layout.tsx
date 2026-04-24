import type { Metadata } from "next";
import "./globals.css";
import { ForgeQueryProvider } from "@/lib/query-client";

export const metadata: Metadata = {
  title: "ForgeSentinel | SOC & Asset Risk Intelligence",
  description:
    "Manufacturing-focused SOC command center for asset discovery, risk decisions, correlated incidents, and audit replay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ForgeQueryProvider>{children}</ForgeQueryProvider>
      </body>
    </html>
  );
}
