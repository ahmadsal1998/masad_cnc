import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  colorBg: string;
}

export default function StatCard({ title, value, subtitle, icon, colorBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 flex items-start gap-2 sm:gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${colorBg}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wide leading-tight">{title}</p>
        <p className="text-base sm:text-xl font-bold text-gray-800 leading-tight break-all">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}
