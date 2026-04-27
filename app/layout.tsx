import type { Metadata } from "next";
import "./globals.css";
import { ForgeQueryProvider } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ForgeSentinel | SOC & Asset Risk Intelligence",
  description:
    "Manufacturing-focused SOC command center for asset discovery, risk decisions, correlated incidents, and audit replay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ForgeQueryProvider>
            {children}
          </ForgeQueryProvider>
        </ErrorBoundary>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
