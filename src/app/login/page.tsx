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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm app-surface p-6 space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Scheduler Login
        </h1>

        <form action="/api/login" method="POST" className="space-y-3">
          {from && <input type="hidden" name="from" value={from} />}

          <label className="block text-sm text-slate-700 space-y-1">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              className="app-input"
            />
          </label>

          {showError && (
            <p className="text-sm text-red-700">Incorrect password</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
          >
            Log in
          </button>
        </form>

        <div className="text-xs text-slate-600">
          Need access? Contact the scheduler admin.
        </div>

        <div className="text-xs text-slate-600">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
