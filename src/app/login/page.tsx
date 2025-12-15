import Link from "next/link";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    from?: string;
  };
}) {
  const showError = searchParams?.error === "1";
  const from = searchParams?.from;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f3e6d9]">
      <div className="w-full max-w-sm bg-white/90 rounded-2xl shadow-lg border border-amber-200 p-6 space-y-4">
        <h1 className="text-lg font-semibold text-amber-900">
          Scheduler Login
        </h1>

        <form action="/api/login" method="POST" className="space-y-3">
          {from && <input type="hidden" name="from" value={from} />}

          <label className="block text-sm text-amber-900/80 space-y-1">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-amber-200 px-3 py-2 bg-white text-amber-900"
            />
          </label>

          {showError && (
            <p className="text-sm text-red-700">Incorrect password</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-amber-600 text-white py-2 hover:bg-amber-500"
          >
            Log in
          </button>
        </form>

        <div className="text-xs text-amber-700">
          Need access? Contact the scheduler admin.
        </div>

        <div className="text-xs text-amber-700">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
