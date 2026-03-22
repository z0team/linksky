import { BarChart3, Eye, MousePointerClick } from 'lucide-react';
import type { ProfileAnalytics } from '@/lib/db';

export function AnalyticsOverview({ analytics }: { analytics: ProfileAnalytics }) {
  const maxViewsCount = analytics.viewsByDay.reduce((max, point) => Math.max(max, point.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AnalyticsCard label="Views" value={analytics.totalViews.toString()} icon={<Eye size={15} />} />
        <AnalyticsCard label="Clicks" value={analytics.totalClicks.toString()} icon={<MousePointerClick size={15} />} />
        <AnalyticsCard label="CTR" value={`${analytics.ctr}%`} icon={<BarChart3 size={15} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="rounded-2xl border border-white/10 bg-[rgba(8,11,16,0.56)] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">Views in the last 14 days</p>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Trend</span>
          </div>
          <div className="mt-4 flex h-36 items-end gap-2">
            {analytics.viewsByDay.map((point) => {
              const height = Math.max(8, Math.round((point.count / maxViewsCount) * 100));
              return (
                <div key={point.label} className="flex-1">
                  <div
                    className="rounded-t-xl bg-[var(--accent)]/80 shadow-[0_10px_24px_var(--accent-glow)]"
                    style={{ height: `${height}%` }}
                    title={`${point.label}: ${point.count}`}
                  />
                  <p className="mt-2 text-center text-[10px] text-[color:var(--text-muted)]">{point.label.slice(5)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnalyticsList title="Top referrers" emptyLabel="No external referrers yet" items={analytics.topReferrers} />
          <AnalyticsList title="Clicks by platform" emptyLabel="No social clicks yet" items={analytics.clicksByPlatform} />
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(8,11,16,0.56)] p-4">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function AnalyticsList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: ProfileAnalytics['topReferrers'];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(8,11,16,0.56)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Live</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.length ? items.map((item) => (
          <div key={`${title}-${item.label}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
            <span className="truncate text-sm text-neutral-200">{item.label}</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-neutral-300">{item.count}</span>
          </div>
        )) : <p className="text-sm text-[color:var(--text-muted)]">{emptyLabel}</p>}
      </div>
    </div>
  );
}
