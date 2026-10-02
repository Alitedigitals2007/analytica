import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Signed in as {user.name ? `${user.name} · ` : ""}
            {user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-8 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        Projects, imports and analyses arrive in Phase 1.
      </section>
    </main>
  );
}
