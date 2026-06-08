import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PricingClient } from "./PricingClient";
import { auth } from "@/lib/auth";
import { resolvePlanCode } from "@/lib/usage-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos e preços | PDF Master Pro",
  description:
    "Conheça os planos do PDF Master Pro: Básico, Plus, Premium e Empresarial.",
};

export default async function PricingPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const currentPlan = session?.user?.planCode ? resolvePlanCode(session.user.planCode) : undefined;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <PricingClient isLoggedIn={isLoggedIn} currentPlan={currentPlan} />
      </section>
      <Footer />
    </main>
  );
}
