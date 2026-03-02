import { getDashboardStats } from "@/api/dashboard";
import type { DashboardStats } from "@/types";
import { ArrowLeft, Bot, Loader2, MessageSquare, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PROVIDER_COLORS: Record<string, string> = {
  groq: "#a78bfa",
  gemini: "#34d399",
  mistral: "#fb923c",
};

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError("Failed to load dashboard data. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-base">
        <Loader2 size={20} className="text-ink-muted animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-base px-6">
        <div className="text-center">
          <p className="text-ink-primary font-semibold mb-2">Access Denied</p>
          <p className="text-ink-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate("/chat")}
            className="px-4 py-2 rounded-xl bg-surface-overlay text-ink-secondary text-sm"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-ink-primary">
      {/* Header */}
      <header className="border-b border-line px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/chat")}
          className="text-ink-muted hover:text-ink-primary transition-colors p-1.5 rounded-lg hover:bg-surface-overlay"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold">Usage Dashboard</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<MessageSquare size={16} />}
            label="Total Messages"
            value={stats!.total_messages.toLocaleString()}
          />
          <StatCard
            icon={<Bot size={16} />}
            label="Total Sessions"
            value={stats!.total_sessions.toLocaleString()}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Total Users"
            value={stats!.total_users.toLocaleString()}
          />
        </div>

        {/* Messages Per Day */}
        <Section title="Messages — Last 7 Days">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats!.messages_per_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString("en", { weekday: "short" })}
                tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-overlay)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "var(--color-ink-primary)",
                }}
                labelFormatter={(d) =>
                  new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })
                }
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ fill: "var(--color-accent)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        {/* Provider Breakdown */}
        <Section title="Provider Breakdown (All Time)">
          {stats!.provider_breakdown.length === 0 ? (
            <p className="text-ink-muted text-sm">No AI messages yet.</p>
          ) : (
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats!.provider_breakdown} barSize={32}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-line)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="provider"
                    tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-overlay)",
                      border: "1px solid var(--color-line)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "var(--color-ink-primary)",
                    }}
                    formatter={(value, _name, props) => [
                      `${value} messages (${props.payload.percentage}%)`,
                      props.payload.provider,
                    ]}
                  />
                  <Bar
                    dataKey="count"
                    radius={[6, 6, 0, 0]}
                    label={false}
                    shape={(props: unknown) => {
                      const p = props as {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                        provider: string;
                      };
                      return (
                        <rect
                          x={p.x}
                          y={p.y}
                          width={p.width}
                          height={p.height}
                          fill={PROVIDER_COLORS[p.provider] ?? "var(--color-accent)"}
                          rx={6}
                          ry={6}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-col gap-2 min-w-35">
                {stats!.provider_breakdown.map((p) => (
                  <div key={p.provider} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PROVIDER_COLORS[p.provider] ?? "var(--color-accent)" }}
                    />
                    <span className="text-ink-secondary text-xs capitalize">{p.provider}</span>
                    <span className="text-ink-muted text-xs ml-auto">{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Today's Quota Usage */}
        <Section title="Today's Quota Usage">
          <div className="flex flex-col gap-4">
            {stats!.today_usage.map((p) => {
              const pct = Math.min((p.used / p.limit) * 100, 100);
              return (
                <div key={p.provider}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Zap size={12} style={{ color: PROVIDER_COLORS[p.provider] }} />
                      <span className="text-ink-secondary text-xs capitalize">{p.provider}</span>
                    </div>
                    <span className="text-ink-muted text-xs">
                      {p.used.toLocaleString()} / {p.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct > 90 ? "var(--color-danger)" : PROVIDER_COLORS[p.provider],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </main>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="bg-surface-raised border border-line rounded-2xl px-5 py-4 flex items-center gap-4">
    <div className="w-9 h-9 rounded-xl bg-surface-overlay border border-line flex items-center justify-center text-ink-secondary shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-ink-muted text-xs">{label}</p>
      <p className="text-ink-primary text-xl font-semibold leading-tight">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-surface-raised border border-line rounded-2xl p-6">
    <h2 className="text-ink-secondary text-xs font-semibold uppercase tracking-widest mb-5">
      {title}
    </h2>
    {children}
  </div>
);

export default DashboardPage;
