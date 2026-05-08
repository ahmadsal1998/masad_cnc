import { useMemo, useState } from 'react';
import { formatDate } from '../utils/formatDate';
import { fmt } from '../utils/numbers';
import { useData } from '../context/DataContext';
import {
  DollarSign, AlertCircle, Loader2, Receipt, CalendarRange, X, ChevronDown,
  Calendar, TrendingDown, Users,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';

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
    customers, purchases, sales, expenses,
    customerPayments,
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

  const today       = new Date().toISOString().split('T')[0];
  const monthPrefix = today.slice(0, 7);

  const stats = useMemo(() => {
    const totalSales     = filteredSales.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const totalPurchases = filteredPurchases.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const totalExpenses  = filteredExpenses.reduce((s, x) => s + (x.amount ?? 0), 0);
    const netProfit      = totalSales - totalPurchases - totalExpenses;

    const todaySalesAmt  = sales.filter(x => x.date === today).reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const todaySalesCount = sales.filter(x => x.date === today).length;
    const monthSalesAmt  = sales.filter(x => x.date.startsWith(monthPrefix)).reduce((s, x) => s + (x.totalAmount ?? 0), 0);
    const monthSalesCount = sales.filter(x => x.date.startsWith(monthPrefix)).length;
    const monthExpenses  = expenses.filter(x => x.date.startsWith(monthPrefix)).reduce((s, x) => s + (x.amount ?? 0), 0);
    const monthProfit    = monthSalesAmt - expenses.filter(x => x.date.startsWith(monthPrefix)).reduce((s, x) => s + (x.amount ?? 0), 0)
                          - purchases.filter(x => x.date.startsWith(monthPrefix)).reduce((s, x) => s + (x.totalAmount ?? 0), 0);

    return {
      totalExpenses, netProfit,
      todaySalesAmt, todaySalesCount, monthSalesAmt, monthSalesCount,
      monthExpenses, monthProfit,
    };
  }, [
    filteredSales, filteredPurchases, filteredExpenses,
    sales, purchases, expenses,
    today, monthPrefix,
  ]);

  const customerAccounts = useMemo(() => {
    return customers
      .map(c => {
        const custSales    = sales.filter(s => s.customerId === c.id);
        const custPayments = customerPayments.filter(p => p.customerId === c.id);
        const totalSales   = custSales.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);
        const totalPayments = custPayments.reduce(
          (sum, p) => sum + (p.voucherType === 'payment' ? -(p.amount ?? 0) : (p.amount ?? 0)),
          0,
        );
        return { id: c.id, name: c.name, totalSales, totalPayments, remaining: totalSales - totalPayments };
      })
      .sort((a, b) => b.remaining - a.remaining);
  }, [customers, sales, customerPayments]);

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

      {/* Stats — 2 cols on mobile, 4 on desktop */}
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
          subtitle={`${filteredSales.length + filteredPurchases.length} معاملة`}
          icon={<Receipt size={20} className="text-red-500" />}
          colorBg="bg-red-50"
        />
        <StatCard
          title="مبيعات اليوم"
          value={fmt(stats.todaySalesAmt)}
          subtitle={`${stats.todaySalesCount} فاتورة`}
          icon={<Calendar size={20} className="text-teal-600" />}
          colorBg="bg-teal-50"
        />
        <StatCard
          title="ربح هذا الشهر"
          value={fmt(stats.monthProfit)}
          subtitle={`${stats.monthSalesCount} فاتورة · ${fmt(stats.monthSalesAmt)} مبيعات`}
          icon={<TrendingDown size={20} className={stats.monthProfit >= 0 ? 'text-violet-600' : 'text-red-500'} />}
          colorBg={stats.monthProfit >= 0 ? 'bg-violet-50' : 'bg-red-50'}
        />
      </div>

      {/* Customer accounts */}
      <CustomerAccountsTable rows={customerAccounts} loading={syncStatus.loading} />

      {/* Recent purchases */}
      <RecentTable title="آخر المشتريات" rows={recentPurchases} type="purchase" />
    </div>
  );
}

// ── Customer Accounts ────────────────────────────────────────────────────────

interface CustomerAccountRow {
  id: string;
  name: string;
  totalSales: number;
  totalPayments: number;
  remaining: number;
}

function CustomerAccountsTable({ rows, loading }: { rows: CustomerAccountRow[]; loading: boolean }) {
  const balanceColor = (r: number) =>
    r <= 0 ? 'text-emerald-600' : r < 1000 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <Users size={16} className="text-blue-500 shrink-0" />
        <h3 className="font-semibold text-gray-700 text-sm">حسابات العملاء</h3>
        {rows.length > 0 && (
          <span className="mr-auto text-xs text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded-lg font-medium">
            {rows.length} عميل
          </span>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-10 flex justify-center">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">لا يوجد عملاء</div>
      ) : (
        <>
          {/* Desktop/tablet table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">اسم العميل</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">إجمالي المبيعات</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">إجمالي المدفوعات</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">الرصيد المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(row.totalSales)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(row.totalPayments)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-semibold ${balanceColor(row.remaining)}`}>
                        {fmt(row.remaining)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {rows.map(row => (
              <div key={row.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-gray-800 text-sm truncate max-w-[55%]">{row.name}</span>
                  <span className={`text-sm font-bold ${balanceColor(row.remaining)}`}>
                    {fmt(row.remaining)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>مبيعات: <span className="text-gray-700 font-medium">{fmt(row.totalSales)}</span></span>
                  <span>مدفوعات: <span className="text-gray-700 font-medium">{fmt(row.totalPayments)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Recent table (purchases) ──────────────────────────────────────────────────

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
                      {fmt(row.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {type === 'sale' ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                          isPaid    ? 'bg-emerald-100 text-emerald-700' :
                          isPartial ? 'bg-yellow-100 text-yellow-700'  :
                                      'bg-red-100 text-red-600'
                        }`}>
                          {fmt(row.paidAmount ?? 0)}
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
