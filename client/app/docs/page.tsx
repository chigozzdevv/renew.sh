import type { Metadata } from "next";

import { DocsPageClient } from "@/components/docs/docs-page-client";

export const metadata: Metadata = {
  title: "Renew Docs | Billing API and Operations",
  description:
    "Documentation for the Renew billing platform API, operational workflows, and optional server-side SDK.",
};

export default function DocsPage() {
  return (
    <div className="page-shell min-h-screen">
      <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#ffffff_72%,#fcfdfb_100%)]">
        <DocsPageClient />
      </main>
    </div>
  );
}
