export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0a111d_0%,#090f19_100%)] p-4 md:p-5 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <div className="w-full rounded-3xl border border-white/5 bg-white/[0.03] p-4 lg:h-[calc(100vh-2.5rem)] lg:w-72">
          <div className="h-12 w-40 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="h-10 animate-pulse rounded-xl bg-white/[0.06]" />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-28 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]" />
          <div className="grid gap-4">
            <div className="h-72 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]" />
            <div className="h-72 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
