import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { EscrowDashboard } from "@/components/escrow/escrow-dashboard";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <EscrowDashboard />
      </main>
      <Footer />
    </>
  );
}
