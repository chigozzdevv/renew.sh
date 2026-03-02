import { Hero } from "@/components/landing/hero";
import { Lead } from "@/components/landing/lead";
import { WhyRenewSection } from "@/components/landing/product-section";
import { BillingFlow } from "@/components/landing/billing-flow";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/shared/header";

export default function Home() {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <Hero />
        <Lead />
        <WhyRenewSection />
        <BillingFlow />
      </main>
      <Footer />
    </div>
  );
}
