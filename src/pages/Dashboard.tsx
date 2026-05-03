import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  TrendingUp, ShoppingCart, Users, Truck,
  DollarSign, AlertCircle, Loader2, Activity
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorBg: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, subtitle, icon, colorBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl shrink-0 ${colorBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-800 leading-tight truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Dashboard() {
  const { employees, customers, suppliers, purchases, sales, syncStatus } = useData();

  const stats = useMemo(() => {
    const totalSales     = sales.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const paidSales      = sales.reduce((s, x) => s + (x.paidAmount  ?? 0), 0);
    const totalPurchases = purchases.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const paidPurchases  = purchases.reduce((s, x) => s + (x.paidAmount  ?? 0), 0);
    const customerDebts  = customers.reduce((s, x) => s + (x.balance ?? 0), 0);
    const supplierDebts  = suppliers.reduce((s, x) => s + (x.balance ?? 0), 0);
    const netProfit      = totalSales - totalPurchases;
    return { totalSales, paidSales, totalPurchases, paidPurchases, customerDebts, supplierDebts, netProfit };
  }, [sales, purchases, customers, suppliers]);

  const recentSales     = useMemo(() => [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [sales]);
  const recentPurchases = useMemo(() => [...purchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [purchases]);

  return (
    <div dir="rtl" className="space-y-5">
      {/* Status banners */}
      {syncStatus.loading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl w-fit">
          <Loader2 size={14} className="animate-spin" />
          جاري تحميل البيانات...
        </div>
      )}
      {syncStatus.error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle size={14} className="shrink-0" />
          {syncStatus.error}
        </div>
      )}

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={`${fmt(stats.totalSales)}`}
          subtitle={`محصّل: ${fmt(stats.paidSales)}`}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          colorBg="bg-emerald-50"
        />
        <StatCard
          title="إجمالي المشتريات"
          value={`${fmt(stats.totalPurchases)}`}
          subtitle={`مدفوع: ${fmt(stats.paidPurchases)}`}
          icon={<ShoppingCart size={20} className="text-blue-600" />}
          colorBg="bg-blue-50"
        />
        <StatCard
          title="ديون العملاء"
          value={`${fmt(stats.customerDebts)}`}
          subtitle={`${customers.length} عميل`}
          icon={<Users size={20} className="text-orange-500" />}
          colorBg="bg-orange-50"
        />
        <StatCard
          title="مستحقات الموردين"
          value={`${fmt(stats.supplierDebts)}`}
          subtitle={`${suppliers.length} مورد`}
          icon={<Truck size={20} className="text-purple-600" />}
          colorBg="bg-purple-50"
        />
      </div>

      {/* Secondary stats — 2 cols on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title="صافي الربح"
          value={fmt(stats.netProfit)}
          icon={<DollarSign size={20} className={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />}
          colorBg={stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard
          title="الموظفون"
          value={String(employees.length)}
          subtitle="موظف نشط"
          icon={<Users size={20} className="text-indigo-600" />}
          colorBg="bg-indigo-50"
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            title="النشاط"
            value={String(sales.length + purchases.length)}
            subtitle={`${sales.length} مبيعات · ${purchases.length} مشتريات`}
            icon={<Activity size={20} className="text-teal-600" />}
            colorBg="bg-teal-50"
          />
        </div>
      </div>

      {/* Recent tables — stacked on mobile, side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTable title="آخر المبيعات" rows={recentSales} type="sale" />
        <RecentTable title="آخر المشتريات" rows={recentPurchases} type="purchase" />
      </div>
    </div>
  );
}

interface RecentRow {
  id: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  customerName?: string;
  supplierName?: string;
}

function RecentTable({ title, rows, type }: { title: string; rows: RecentRow[]; type: 'sale' | 'purchase' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">لا توجد سجلات</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                  {type === 'sale' ? 'العميل' : 'المورد'}
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">التاريخ</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">المدفوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const isPaid = row.paidAmount >= row.totalAmount;
                const isPartial = row.paidAmount > 0 && !isPaid;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-32">
                      {type === 'sale' ? row.customerName : row.supplierName}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      {new Intl.NumberFormat('ar-SA').format(row.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        isPaid    ? 'bg-emerald-100 text-emerald-700' :
                        isPartial ? 'bg-yellow-100 text-yellow-700'  :
                                    'bg-red-100 text-red-600'
                      }`}>
                        {new Intl.NumberFormat('ar-SA').format(row.paidAmount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
