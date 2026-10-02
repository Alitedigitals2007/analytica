import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">Your account</p>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Name
            </dt>
            <dd className="mt-1 text-sm text-neutral-900">
              {user.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Email
            </dt>
            <dd className="mt-1 text-sm text-neutral-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              User ID
            </dt>
            <dd className="mt-1 font-mono text-xs text-neutral-500">
              {user.id}
            </dd>
          </div>
        </dl>
        <div className="mt-6 border-t border-neutral-200 pt-4">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
