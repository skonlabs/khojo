import { useRuns } from "@/hooks/useRuns";
import { FailureBadge } from "@/components/FailureBadge";
import { timeAgo } from "@/lib/timeAgo";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell,
  LineChart, Line, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Activity, AlertTriangle, Zap, TrendingUp } from "lucide-react";

export default function OverviewPage() {
  const { profile } = useAuth();
  const { data: runs, isLoading } = useRuns();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!runs || runs.length === 0) return null;
    const total = runs.length;
    const withFailure = runs.filter((r) => r.failure_types && r.failure_types.length > 0);
    const failureRate = (withFailure.length / total) * 100;
    const avgTokens = Math.round(runs.reduce((s, r) => s + r.total_tokens, 0) / total);
    const verboseCount = runs.filter((r) => r.failure_types?.includes("verbose")).length;
    const wasteRate = (verboseCount / total) * 100;

    const breakdownMap: Record<string, number> = {};
    for (const r of runs) {
      for (const ft of r.failure_types ?? []) {
        breakdownMap[ft] = (breakdownMap[ft] ?? 0) + 1;
      }
    }
    const breakdown = Object.entries(breakdownMap)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const dayMap: Record<string, { total: number; failed: number; hallucinated: number }> = {};
    for (const r of runs) {
      const day = r.timestamp.slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { total: 0, failed: 0, hallucinated: 0 };
      dayMap[day].total++;
      if (r.failure_types?.length > 0) dayMap[day].failed++;
      if (r.failure_types?.includes("hallucination")) dayMap[day].hallucinated++;
    }
    const trend = Object.entries(dayMap)
      .map(([date, d]) => ({
        date,
        failureRate: Math.round((d.failed / d.total) * 100),
        hallucinationRate: Math.round((d.hallucinated / d.total) * 100),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    const topIssues = runs.filter((r) => r.primary_failure).slice(0, 5);

    return { total, failureRate, avgTokens, wasteRate, breakdown, trend, topIssues };
  }, [runs]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Waiting for your first run...</h2>
          <p className="text-sm text-muted-foreground">Add the SDK to your app and run it to start seeing data.</p>
          <div className="bg-surface-1 rounded-lg p-4 border border-border text-left">
            <code className="text-xs font-mono text-muted-foreground">npm install @khojo/sdk</code>
          </div>
        </div>
      </div>
    );
  }

  const failureRateColor = stats!.failureRate < 10 ? "text-success" : stats!.failureRate < 25 ? "text-warning" : "text-critical";
  const barColors: Record<string, string> = {
    hallucination: "hsl(280, 67%, 60%)",
    incomplete: "hsl(38, 92%, 50%)",
    irrelevant: "hsl(217, 91%, 60%)",
    inconsistent: "hsl(330, 70%, 55%)",
    verbose: "hsl(190, 80%, 45%)",
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Project health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.project_name ? `${profile.project_name} · ` : ""}Last 30 days · {stats!.total} runs
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total runs" value={stats!.total.toLocaleString()} />
        <StatCard icon={AlertTriangle} label="Failure rate" value={`${stats!.failureRate.toFixed(1)}%`} valueClass={failureRateColor} />
        <StatCard icon={Zap} label="Avg tokens/run" value={stats!.avgTokens.toLocaleString()} />
        <StatCard icon={TrendingUp} label="Token waste" value={`${stats!.wasteRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Failure breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats!.breakdown} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,4%,16%)" />
              <XAxis type="number" tick={{ fill: "hsl(240,5%,55%)", fontSize: 12 }} />
              <YAxis dataKey="type" type="category" tick={{ fill: "hsl(240,5%,55%)", fontSize: 12 }} width={80} />
              <RechartsTooltip contentStyle={{ background: "hsl(240,8%,7%)", border: "1px solid hsl(240,4%,16%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stats!.breakdown.map((entry) => (
                  <Cell key={entry.type} fill={barColors[entry.type] ?? "hsl(240,4%,16%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Failure trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats!.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,4%,16%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(240,5%,55%)", fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fill: "hsl(240,5%,55%)", fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ background: "hsl(240,8%,7%)", border: "1px solid hsl(240,4%,16%)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={10} stroke="hsl(142,71%,45%)" strokeDasharray="5 5" label={{ value: "target", fill: "hsl(142,71%,45%)", fontSize: 10 }} />
              <Line type="monotone" dataKey="failureRate" stroke="hsl(0,84%,60%)" name="Failure %" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hallucinationRate" stroke="hsl(280,67%,60%)" name="Hallucination %" strokeWidth={2} dot={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Top issues</h3>
        </div>
        <div className="divide-y divide-border">
          {stats!.topIssues.map((run) => (
            <button key={run.id} onClick={() => navigate(`/runs/${run.id}`)} className="w-full flex items-center justify-between p-3 hover:bg-surface-1 transition-colors text-left">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-sm text-foreground truncate max-w-[300px]">{run.input.slice(0, 80)}{run.input.length > 80 ? "…" : ""}</span>
                {run.primary_failure && <FailureBadge type={run.primary_failure} />}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-3" title={run.timestamp}>{timeAgo(run.timestamp)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${valueClass ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
