import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
        Analytica
      </h1>
      <p className="mt-4 max-w-md text-base text-neutral-600">
        Upload your data, run real statistics, build charts and export
        ready-to-send reports.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Create account
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
