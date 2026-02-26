import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Problems } from "@/components/problems";
import { Solution } from "@/components/solution";
import { HowItWorks } from "@/components/how-it-works";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Problems />
      <Solution />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  );
}
