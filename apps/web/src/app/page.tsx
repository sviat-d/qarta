import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Problems } from "@/components/problems";
import { Solution } from "@/components/solution";
import { Calculator } from "@/components/calculator";
import { HowItWorks } from "@/components/how-it-works";
import { FAQ } from "@/components/faq";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Problems />
      <Solution />
      <Calculator />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
