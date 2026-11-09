import { BaggageSection } from "@/components/BaggageSection";
import { BoardingExperience } from "@/components/BoardingExperience";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/Loader";
import { Navbar } from "@/components/Navbar";
import { StatsSection } from "@/components/StatsSection";
import { TicketSection } from "@/components/TicketSection";
import { ZonesSection } from "@/components/ZonesSection";

export default function Home() {
  return (
    <>
      <Loader />
      <Navbar />
      <main>
        <BoardingExperience />
        <ZonesSection />
        <BaggageSection />
        <StatsSection />
        <TicketSection />
      </main>
      <Footer />
    </>
  );
}
