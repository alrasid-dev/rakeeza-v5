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

const monthly = [
  { name: 'محرم', count: 12 },
  { name: 'صفر', count: 18 },
  { name: 'ربيع ١', count: 9 },
  { name: 'ربيع ٢', count: 15 },
  { name: 'جمادى ١', count: 22 },
  { name: 'جمادى ٢', count: 11 },
];

const byStatus = [
  { name: 'مسودة', value: 8 },
  { name: 'صادرة', value: 24 },
  { name: 'مؤرشفة', value: 5 },
];

const COLORS = ['#C5A059', '#006C35', '#4a9b6e'];

export default function ChartsPlaceholder() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border p-4 h-72">
        <h3 className="text-sm font-semibold text-moj-green mb-2">المكاتبات الشهرية (تجريبي)</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#006C35" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border p-4 h-72">
        <h3 className="text-sm font-semibold text-moj-green mb-2">حسب الحالة (تجريبي)</h3>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
              {byStatus.map((_, i) => (
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
