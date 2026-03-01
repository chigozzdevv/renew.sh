import { Hero } from "@/components/landing/hero";
import { ProductPulse } from "@/components/landing/product-pulse";
import { ProofStrip } from "@/components/landing/proof-strip";
import { SettlementFlow } from "@/components/landing/settlement-flow";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export default function Home() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <Hero />
        <ProofStrip />
        <ProductPulse />
        <SettlementFlow />
      </main>
      <SiteFooter />
    </div>
  );
}

