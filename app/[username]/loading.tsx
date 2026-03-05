export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#06070a_0%,#090b12_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-[520px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="mx-auto h-32 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mt-6 h-8 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mt-3 h-4 w-64 animate-pulse rounded-full bg-white/[0.08]" />
          <div className="mx-auto mt-8 flex justify-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
        <div className="mt-4 h-24 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </div>
  );
}
