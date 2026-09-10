'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#C5A059', '#006C35', '#4a9b6e', '#8B7355'];

export default function ChartsPlaceholder({
  byStatus,
  byType,
}: {
  byStatus?: { name: string; value: number }[];
  byType?: { name: string; count: number }[];
}) {
  const statusData =
    byStatus && byStatus.length
      ? byStatus
      : [
          { name: 'مسودة', value: 0 },
          { name: 'صادرة', value: 0 },
          { name: 'مؤرشفة', value: 0 },
        ];
  const typeData =
    byType && byType.length
      ? byType
      : [{ name: '—', count: 0 }];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-[var(--surface)] rounded-xl border border-moj-green/15 dark:border-white/10 p-3 sm:p-4 h-64 sm:h-72 min-w-0 overflow-hidden">
        <h3 className="text-sm font-semibold text-moj-green mb-2">المكاتبات حسب النوع</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={typeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#006C35" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white dark:bg-[var(--surface)] rounded-xl border border-moj-green/15 dark:border-white/10 p-3 sm:p-4 h-64 sm:h-72 min-w-0 overflow-hidden">
        <h3 className="text-sm font-semibold text-moj-green mb-2">حسب الحالة</h3>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
              {statusData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
