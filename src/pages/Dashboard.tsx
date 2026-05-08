import { useMemo, useState } from 'react';
import { formatDate } from '../utils/formatDate';
import { fmt } from '../utils/numbers';
import { useData } from '../context/DataContext';
import { computeCustomerCurrentBalance, computeSupplierCurrentBalance } from '../utils/balance';
import {
  TrendingUp, ShoppingCart, Users, Truck,
  DollarSign, AlertCircle, Loader2, Activity, Receipt, CalendarRange, X, ChevronDown,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorBg: string;
}

function StatCard({ title, value, subtitle, icon, colorBg }: StatCardProps) {
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

const dateInputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

function DateFilterBar({
  from, to,
  onChange, onClear,
}: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasFilter = !!(from || to);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Mobile header (tap to expand) ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 sm:hidden"
      >
        <CalendarRange size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-gray-600 flex-1 text-right">تصفية بالتاريخ</span>
        {hasFilter && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg font-medium">
            مفعّل
          </span>
        )}
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Mobile expandable body ── */}
      {open && (
        <div className="sm:hidden px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">من</label>
            <input
              type="date"
              value={from}
              onChange={e => onChange(e.target.value, to)}
              className={dateInputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">إلى</label>
            <input
              type="date"
              value={to}
              onChange={e => onChange(from, e.target.value)}
              className={dateInputCls}
            />
          </div>
          {hasFilter && (
            <button
              onClick={onClear}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-red-500 bg-red-50 hover:bg-red-100 py-2 rounded-xl transition-colors"
            >
              <X size={14} />
              مسح التصفية
            </button>
          )}
        </div>
      )}

      {/* ── Desktop: always-visible single row ── */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3">
        <CalendarRange size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-gray-600 shrink-0">تصفية بالتاريخ</span>
        <input
          type="date"
          value={from}
          onChange={e => onChange(e.target.value, to)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 w-36"
        />
        <span className="text-gray-400 text-sm">—</span>
        <input
          type="date"
          value={to}
          onChange={e => onChange(from, e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 w-36"
        />
        {hasFilter && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <X size={12} />
            مسح
          </button>
        )}
        {hasFilter && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg font-medium">
            نتائج مفلترة
          </span>
        )}
      </div>

    </div>
  );
}

export default function Dashboard() {
  const {
    employees, customers, suppliers,
    purchases, sales, expenses,
    supplierPayments, customerPayments,
    syncStatus,
  } = useData();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const isFiltered = dateFrom || dateTo;

  const filteredSales = useMemo(() => {
    if (!isFiltered) return sales;
    return sales.filter(x => {
      if (dateFrom && x.date < dateFrom) return false;
      if (dateTo   && x.date > dateTo)   return false;
      return true;
    });
  }, [sales, dateFrom, dateTo, isFiltered]);

  const filteredPurchases = useMemo(() => {
    if (!isFiltered) return purchases;
    return purchases.filter(x => {
      if (dateFrom && x.date < dateFrom) return false;
      if (dateTo   && x.date > dateTo)   return false;
      return true;
    });
  }, [purchases, dateFrom, dateTo, isFiltered]);

  const filteredExpenses = useMemo(() => {
    if (!isFiltered) return expenses;
    return expenses.filter(x => {
      if (dateFrom && x.date < dateFrom) return false;
      if (dateTo   && x.date > dateTo)   return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo, isFiltered]);

  const filteredCustomerPayments = useMemo(() => {
    if (!isFiltered) return customerPayments;
    return customerPayments.filter(x => {
      if (dateFrom && x.date < dateFrom) return false;
      if (dateTo   && x.date > dateTo)   return false;
      return true;
    });
  }, [customerPayments, dateFrom, dateTo, isFiltered]);

  const filteredSupplierPayments = useMemo(() => {
    if (!isFiltered) return supplierPayments;
    return supplierPayments.filter(x => {
      if (dateFrom && x.date < dateFrom) return false;
      if (dateTo   && x.date > dateTo)   return false;
      return true;
    });
  }, [supplierPayments, dateFrom, dateTo, isFiltered]);

  const stats = useMemo(() => {
    const totalSales     = filteredSales.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const collectedSales = filteredCustomerPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const totalPurchases = filteredPurchases.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const paidPurchases  = filteredSupplierPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
    // Debts are running balances — not sliceable by date without full ledger replay.
    // Stored `balance` over-counts cash transactions (see utils/balance.ts) — must
    // be reconciled via compute*CurrentBalance to subtract sale-/purchase-linked
    // auto-payments, otherwise cash sales appear as customer debt on the dashboard.
    const customerDebts  = customers.reduce(
      (s, c) => s + computeCustomerCurrentBalance(
        c.balance,
        sales.filter(x => x.customerId === c.id),
        customerPayments.filter(p => p.customerId === c.id),
      ),
      0,
    );
    const supplierDebts  = suppliers.reduce(
      (s, sup) => s + computeSupplierCurrentBalance(
        sup.balance,
        purchases.filter(x => x.supplierId === sup.id),
        supplierPayments.filter(p => p.supplierId === sup.id),
        expenses.filter(e => e.supplierId === sup.id),
      ),
      0,
    );
    const totalExpenses  = filteredExpenses.reduce((s, x) => s + (x.amount ?? 0), 0);
    const netProfit      = totalSales - totalPurchases - totalExpenses;
    return {
      totalSales, collectedSales, totalPurchases, paidPurchases,
      customerDebts, supplierDebts, totalExpenses, netProfit,
    };
  }, [
    filteredSales, filteredPurchases, filteredExpenses,
    filteredCustomerPayments, filteredSupplierPayments,
    customers, suppliers,
    sales, purchases, customerPayments, supplierPayments, expenses,
  ]);

  const recentSales     = useMemo(() => [...filteredSales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [filteredSales]);
  const recentPurchases = useMemo(() => [...filteredPurchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [filteredPurchases]);

  return (
    <div dir="rtl" className="space-y-5">
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

      <DateFilterBar
        from={dateFrom}
        to={dateTo}
        onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onClear={() => { setDateFrom(''); setDateTo(''); }}
      />

      {/* Primary stats — 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard
          title="إجمالي المبيعات"
          value={fmt(stats.totalSales)}
          subtitle={`محصّل: ${fmt(stats.collectedSales)}`}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          colorBg="bg-emerald-50"
        />
        <StatCard
          title="إجمالي المشتريات"
          value={fmt(stats.totalPurchases)}
          subtitle={`${filteredPurchases.length} فاتورة`}
          icon={<ShoppingCart size={20} className="text-blue-600" />}
          colorBg="bg-blue-50"
        />
        <StatCard
          title="ديون العملاء"
          value={fmt(stats.customerDebts)}
          subtitle={`${customers.length} عميل`}
          icon={<Users size={20} className="text-orange-500" />}
          colorBg="bg-orange-50"
        />
        <StatCard
          title="ذمم الموردين"
          value={fmt(stats.supplierDebts)}
          subtitle={`${suppliers.length} مورد`}
          icon={<Truck size={20} className="text-purple-600" />}
          colorBg="bg-purple-50"
        />
        <StatCard
          title="مدفوعات الموردين"
          value={fmt(stats.paidPurchases)}
          subtitle={`${filteredSupplierPayments.length} سند`}
          icon={<DollarSign size={20} className="text-sky-600" />}
          colorBg="bg-sky-50"
        />
      </div>

      {/* Secondary stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="صافي الربح"
          value={fmt(stats.netProfit)}
          subtitle="مبيعات − مشتريات − مصروفات"
          icon={<DollarSign size={20} className={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} />}
          colorBg={stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
        />
        <StatCard
          title="إجمالي المصروفات"
          value={fmt(stats.totalExpenses)}
          icon={<Receipt size={20} className="text-red-500" />}
          colorBg="bg-red-50"
        />
        <StatCard
          title="الموظفون"
          value={String(employees.length)}
          subtitle="موظف نشط"
          icon={<Users size={20} className="text-indigo-600" />}
          colorBg="bg-indigo-50"
        />
        <StatCard
          title="النشاط"
          value={String(filteredSales.length + filteredPurchases.length)}
          subtitle={`${filteredSales.length} مبيعات · ${filteredPurchases.length} مشتريات`}
          icon={<Activity size={20} className="text-teal-600" />}
          colorBg="bg-teal-50"
        />
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
  paidAmount?: number;
  paymentType?: 'cash' | 'credit';
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
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                  {type === 'sale' ? 'المدفوع' : 'طريقة الدفع'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const isPaid    = (row.paidAmount ?? 0) >= row.totalAmount;
                const isPartial = (row.paidAmount ?? 0) > 0 && !isPaid;
                return (
                  <tr key={row.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-32">
                      {type === 'sale' ? row.customerName : row.supplierName}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      {new Intl.NumberFormat('en-US').format(row.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {type === 'sale' ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          isPaid    ? 'bg-emerald-100 text-emerald-700' :
                          isPartial ? 'bg-yellow-100 text-yellow-700'  :
                                      'bg-red-100 text-red-600'
                        }`}>
                          {new Intl.NumberFormat('en-US').format(row.paidAmount ?? 0)}
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          (row.paymentType ?? 'credit') === 'cash'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {(row.paymentType ?? 'credit') === 'cash' ? 'نقد' : 'آجل'}
                        </span>
                      )}
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
