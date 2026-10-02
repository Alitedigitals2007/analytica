import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-dvh bg-neutral-50">
      <Nav />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
