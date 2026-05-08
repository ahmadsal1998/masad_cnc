import { useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Printer, Plus, X, TrendingUp, CreditCard,
  Wallet, FileText, AlertCircle, Pencil, Trash2, Lock,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { computeCustomerOpeningBalance } from '../utils/balance';
import { formatDate } from '../utils/formatDate';
import { fmt } from '../utils/numbers';
import { generateId } from '../utils/hash';
import type { CustomerPayment } from '../types';
import VoucherModal from '../components/ui/VoucherModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerTransaction {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  voucherType: 'receipt' | 'payment' | 'sale';
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
  isLinked?: boolean; // true = auto-generated from a sale, not directly editable
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerStatement() {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    customers, sales, customerPayments,
    addCustomerPayment, updateCustomerPayment, removeCustomerPayment,
  } = useData();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [filterType,   setFilterType]   = useState<'all' | 'sale' | 'payment'>('all');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editingPayment,  setEditingPayment]  = useState<CustomerPayment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // ── Customer lookup ────────────────────────────────────────────────────────
  const customer = useMemo(
    () => customers.find(c => c.id === customerId),
    [customers, customerId],
  );

  // ── Build unified transactions + running balance ──────────────────────────
  const { allTransactions, openingBalance } = useMemo(() => {
    if (!customerId) return { allTransactions: [] as CustomerTransaction[], openingBalance: 0 };

    const rows: Omit<CustomerTransaction, 'runningBalance'>[] = [
      ...sales
        .filter(s => s.customerId === customerId)
        .map(s => ({
          id:          s.id,
          date:        s.date,
          type:        'sale' as const,
          voucherType: 'sale' as const,
          reference:   `فاتورة #${s.id.slice(-6).toUpperCase()}`,
          debit:       s.totalAmount,
          credit:      0,
          isLinked:    false,
        })),
      ...customerPayments
        .filter(p => p.customerId === customerId)
        .map(p => {
          const vt       = p.voucherType || 'receipt';
          const isDebit  = vt === 'payment';
          const refLabel = isDebit ? 'إضافة دين على العميل' : 'إضافة دفعة للعميل';
          return {
            id:          p.id,
            date:        p.date,
            type:        'payment' as const,
            voucherType: vt,
            reference:   p.relatedSaleId
              ? `${refLabel} / فاتورة #${p.relatedSaleId.slice(-6).toUpperCase()}`
              : refLabel,
            debit:       isDebit ? p.amount : 0,
            credit:      isDebit ? 0 : p.amount,
            isLinked:    !!p.relatedSaleId,
          };
        }),
    ];

    rows.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      if (a.type === b.type) return 0;
      return a.type === 'sale' ? -1 : 1;
    });

    const openingBalance = computeCustomerOpeningBalance(
      customer?.balance ?? 0,
      sales.filter(s => s.customerId === customerId),
      customerPayments.filter(p => p.customerId === customerId),
    );

    let balance = openingBalance;
    const allTransactions = rows.map(row => {
      balance += row.debit - row.credit;
      return { ...row, runningBalance: balance };
    });

    return { allTransactions, openingBalance };
  }, [customerId, sales, customerPayments, customer]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalSales    = allTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.debit, 0);
    const totalReceipts = allTransactions.filter(t => t.type === 'payment' && t.credit > 0).reduce((s, t) => s + t.credit, 0);
    const balance       = allTransactions.length > 0
      ? allTransactions[allTransactions.length - 1].runningBalance
      : openingBalance;
    return { totalSales, totalPayments: totalReceipts, balance };
  }, [allTransactions, openingBalance]);

  // ── Apply filters ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterFrom && t.date < filterFrom) return false;
      if (filterTo   && t.date > filterTo)   return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!t.reference.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allTransactions, filterType, filterFrom, filterTo, filterSearch]);

  // ── Payment handlers ───────────────────────────────────────────────────────
  function handleAddPayment(data: { amount: number; type: 'cash' | 'bank' | 'transfer'; date: string; notes: string; voucherType: 'receipt' | 'payment' }) {
    if (!customerId) return;
    const payment: CustomerPayment = {
      id:          generateId(),
      customerId,
      amount:      data.amount,
      type:        data.type,
      date:        data.date,
      notes:       data.notes,
      voucherType: data.voucherType,
    };
    setShowAddModal(false);
    addCustomerPayment(payment);
  }

  function handleEditRequest(paymentId: string) {
    const pay = customerPayments.find(p => p.id === paymentId);
    if (pay) setEditingPayment(pay);
  }

  function handleUpdatePayment(data: { amount: number; type: 'cash' | 'bank' | 'transfer'; date: string; notes: string; voucherType: 'receipt' | 'payment' }) {
    if (!editingPayment) return;
    const updated: CustomerPayment = { ...editingPayment, ...data };
    setEditingPayment(null);
    updateCustomerPayment(updated);
  }

  function handleDeleteConfirm(id: string) {
    setConfirmDeleteId(null);
    removeCustomerPayment(id);
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() { window.print(); }

  // ── 404 guard ─────────────────────────────────────────────────────────────
  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-gray-500 text-sm">العميل غير موجود</p>
        <button
          onClick={() => navigate('/customers')}
          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
        >
          <ArrowRight size={14} />
          العودة لقائمة العملاء
        </button>
      </div>
    );
  }

  const balanceColor =
    summary.balance > 0  ? 'text-red-600'   :
    summary.balance < 0  ? 'text-emerald-600' :
                           'text-gray-500';

  const balanceLabel =
    summary.balance > 0  ? 'مديون' :
    summary.balance < 0  ? 'دائن'  :
                           'مسوّى';

  const txCallbacks: TxCallbacks = {
    confirmDeleteId,
    onEdit:          handleEditRequest,
    onDeleteRequest: id => setConfirmDeleteId(id),
    onDeleteConfirm: handleDeleteConfirm,
    onCancelDelete:  () => setConfirmDeleteId(null),
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #customer-statement-print,
          #customer-statement-print * { visibility: visible; }
          #customer-statement-print { position: absolute; inset: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div dir="rtl" className="space-y-5 pb-24 lg:pb-6">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between no-print">
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowRight size={16} />
            العملاء
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              إضافة سند
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer size={14} />
              طباعة
            </button>
          </div>
        </div>

        {/* ── Printable wrapper ────────────────────────────────────────────── */}
        <div id="customer-statement-print" ref={printRef}>

          <div className="hidden print:block mb-6">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <p className="text-xl font-bold">كشف حساب عميل</p>
                <p className="text-sm text-gray-500 mt-1">
                  {filterFrom || filterTo
                    ? `من ${filterFrom || '—'} إلى ${filterTo || '—'}`
                    : 'جميع المعاملات'}
                </p>
              </div>
              <p className="text-sm text-gray-400">{today()}</p>
            </div>
          </div>

          {/* ── Header card ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">كشف حساب</p>
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">{customer.name}</h1>
                {customer.phone && (
                  <p className="text-sm text-gray-400 mt-1">{customer.phone}</p>
                )}
              </div>
              <div className="sm:text-left">
                <p className="text-xs text-gray-400 font-medium mb-1">الرصيد الحالي</p>
                <p className={`text-3xl font-extrabold leading-none ${balanceColor}`}>
                  {fmt(Math.abs(summary.balance))} ₪
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                  summary.balance > 0  ? 'bg-red-50 text-red-600'      :
                  summary.balance < 0  ? 'bg-emerald-50 text-emerald-600' :
                                         'bg-gray-100 text-gray-500'
                }`}>
                  {balanceLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl shrink-0">
                  <TrendingUp size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">إجمالي المبيعات</p>
                  <p className="text-sm font-bold text-gray-800">{fmt(summary.totalSales)} ₪</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl shrink-0">
                  <CreditCard size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">إجمالي المدفوعات المستلمة</p>
                  <p className="text-sm font-bold text-gray-800">{fmt(summary.totalPayments)} ₪</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${summary.balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <Wallet size={16} className={summary.balance > 0 ? 'text-red-500' : 'text-emerald-600'} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">الرصيد المتبقي</p>
                  <p className={`text-sm font-bold ${balanceColor}`}>{fmt(summary.balance)} ₪</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filters bar ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 no-print">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                <label className="text-xs text-gray-400 shrink-0">من</label>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={e => setFilterFrom(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                <label className="text-xs text-gray-400 shrink-0">إلى</label>
                <input
                  type="date"
                  value={filterTo}
                  onChange={e => setFilterTo(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs bg-white shrink-0">
                {(['all', 'sale', 'payment'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      filterType === t
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'all' ? 'الكل' : t === 'sale' ? 'فواتير' : 'سندات قبض'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[160px]">
                <input
                  type="text"
                  placeholder="بحث برقم الفاتورة..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {filterSearch && (
                  <button
                    onClick={() => setFilterSearch('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {(filterFrom || filterTo || filterType !== 'all' || filterSearch) && (
                <button
                  onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterType('all'); setFilterSearch(''); }}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* ── Transactions — Desktop table ──────────────────────────────────── */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap w-32">التاريخ</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap w-24">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">المرجع</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">مدين ↑</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">دائن ↓</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">الرصيد</th>
                    <th className="px-4 py-3 no-print w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <OpeningBalanceRow balance={openingBalance} />
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    filtered.map(tx => (
                      <TransactionRow key={tx.id} tx={tx} cbs={txCallbacks} />
                    ))
                  )}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">
                        الإجمالي ({filtered.length} معاملة)
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700">
                        {fmt(filtered.reduce((s, t) => s + t.debit, 0))} ₪
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                        {fmt(filtered.reduce((s, t) => s + t.credit, 0))} ₪
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">
                        {filtered.length > 0
                          ? `${fmt(filtered[filtered.length - 1].runningBalance)} ₪`
                          : '—'}
                      </td>
                      <td className="no-print" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* ── Transactions — Mobile cards ───────────────────────────────────── */}
          <div className="md:hidden space-y-3 no-print">
            <OpeningBalanceMobileCard balance={openingBalance} />
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8">
                <EmptyState />
              </div>
            ) : (
              filtered.map(tx => (
                <TransactionCard key={tx.id} tx={tx} cbs={txCallbacks} />
              ))
            )}
          </div>

          {/* ── Print footer ─────────────────────────────────────────────────── */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <div className="space-y-1">
                <p>الرصيد الافتتاحي: <strong>{fmt(openingBalance)} ₪</strong></p>
                <p>إجمالي المبيعات: <strong>{fmt(summary.totalSales)} ₪</strong></p>
                <p>إجمالي المدفوعات المستلمة: <strong>{fmt(summary.totalPayments)} ₪</strong></p>
              </div>
              <div className="text-left">
                <p className={`text-lg font-bold ${balanceColor}`}>
                  الرصيد: {fmt(summary.balance)} ₪
                </p>
                <p className="text-xs text-gray-400 mt-1">تاريخ الطباعة: {today()}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Add Voucher Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <VoucherModal
          mode="customer"
          entityName={customer.name}
          currentBalance={summary.balance}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPayment}
        />
      )}

      {/* ── Edit Voucher Modal ───────────────────────────────────────────────── */}
      {editingPayment && (
        <VoucherModal
          mode="customer"
          entityName={customer.name}
          currentBalance={summary.balance}
          isEdit
          initialValues={{
            amount:      editingPayment.amount,
            type:        editingPayment.type,
            date:        editingPayment.date,
            notes:       editingPayment.notes ?? '',
            voucherType: editingPayment.voucherType ?? 'receipt',
          }}
          onClose={() => setEditingPayment(null)}
          onSubmit={handleUpdatePayment}
        />
      )}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TxCallbacks {
  confirmDeleteId: string | null;
  onEdit:          (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onCancelDelete:  () => void;
}

function TypeBadge({ tx }: { tx: Pick<CustomerTransaction, 'type' | 'voucherType'> }) {
  if (tx.type === 'sale') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
        <FileText size={10} />
        فاتورة
      </span>
    );
  }
  if (tx.voucherType === 'payment') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium whitespace-nowrap">
        <CreditCard size={10} />
        إضافة دين على العميل
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium whitespace-nowrap">
      <CreditCard size={10} />
      إضافة دفعة للعميل
    </span>
  );
}

function PaymentActions({ tx, cbs }: { tx: CustomerTransaction; cbs: TxCallbacks }) {
  if (tx.type !== 'payment') return null;

  if (tx.isLinked) {
    return (
      <span title="مرتبط بفاتورة — يُحذف تلقائياً عند حذف الفاتورة">
        <Lock size={12} className="text-gray-300" />
      </span>
    );
  }

  if (cbs.confirmDeleteId === tx.id) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => cbs.onDeleteConfirm(tx.id)}
          className="text-[11px] px-2 py-0.5 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors"
        >
          حذف
        </button>
        <button
          onClick={cbs.onCancelDelete}
          className="text-[11px] px-2 py-0.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => cbs.onEdit(tx.id)}
        title="تعديل السند"
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={() => cbs.onDeleteRequest(tx.id)}
        title="حذف السند"
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function TransactionRow({ tx, cbs }: { tx: CustomerTransaction; cbs: TxCallbacks }) {
  const balColor =
    tx.runningBalance > 0 ? 'text-red-600 font-semibold' :
    tx.runningBalance < 0 ? 'text-emerald-600 font-semibold' :
                            'text-gray-500';

  const rowBg =
    tx.type === 'sale'             ? 'bg-blue-50/20'    :
    tx.voucherType === 'payment'   ? 'bg-orange-50/20'  :
                                     'bg-emerald-50/20';

  return (
    <tr className={`hover:bg-gray-50/60 transition-colors ${rowBg}`}>
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(tx.date)}</td>
      <td className="px-4 py-3"><TypeBadge tx={tx} /></td>
      <td className="px-4 py-3 text-gray-700 text-xs font-mono">{tx.reference}</td>
      <td className="px-4 py-3 text-blue-700 font-medium whitespace-nowrap">
        {tx.debit > 0 ? `${fmt(tx.debit)} ₪` : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-emerald-700 font-medium whitespace-nowrap">
        {tx.credit > 0 ? `${fmt(tx.credit)} ₪` : <span className="text-gray-300">—</span>}
      </td>
      <td className={`px-4 py-3 whitespace-nowrap ${balColor}`}>{fmt(tx.runningBalance)} ₪</td>
      <td className="px-2 py-3 no-print">
        <PaymentActions tx={tx} cbs={cbs} />
      </td>
    </tr>
  );
}

function TransactionCard({ tx, cbs }: { tx: CustomerTransaction; cbs: TxCallbacks }) {
  const balColor =
    tx.runningBalance > 0 ? 'text-red-600' :
    tx.runningBalance < 0 ? 'text-emerald-600' :
                            'text-gray-500';

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${
      tx.type === 'sale'           ? 'border-blue-100'   :
      tx.voucherType === 'payment' ? 'border-orange-100' :
                                     'border-emerald-100'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <TypeBadge tx={tx} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatDate(tx.date)}</span>
          <PaymentActions tx={tx} cbs={cbs} />
        </div>
      </div>
      <p className="text-xs text-gray-500 font-mono mb-3">{tx.reference}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">مدين</p>
          <p className={`text-sm font-bold ${tx.debit > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
            {tx.debit > 0 ? `${fmt(tx.debit)} ₪` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">دائن</p>
          <p className={`text-sm font-bold ${tx.credit > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
            {tx.credit > 0 ? `${fmt(tx.credit)} ₪` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">الرصيد</p>
          <p className={`text-sm font-bold ${balColor}`}>{fmt(tx.runningBalance)} ₪</p>
        </div>
      </div>
    </div>
  );
}

function OpeningBalanceRow({ balance }: { balance: number }) {
  const color = balance > 0 ? 'text-red-600 font-semibold' : balance < 0 ? 'text-emerald-600 font-semibold' : 'text-gray-500';
  return (
    <tr className="bg-amber-50/40">
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">—</td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap">
          رصيد افتتاحي
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">الرصيد الافتتاحي</td>
      <td className="px-4 py-3 text-gray-300 text-sm">—</td>
      <td className="px-4 py-3 text-gray-300 text-sm">—</td>
      <td className={`px-4 py-3 whitespace-nowrap ${color}`}>{fmt(balance)} ₪</td>
      <td className="no-print" />
    </tr>
  );
}

function OpeningBalanceMobileCard({ balance }: { balance: number }) {
  const color = balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-gray-500';
  return (
    <div className="bg-amber-50/60 rounded-xl border border-amber-100 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
          رصيد افتتاحي
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">الرصيد الافتتاحي</p>
        <p className={`text-sm font-bold ${color}`}>{fmt(balance)} ₪</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-400">
      <FileText size={32} strokeWidth={1.25} />
      <p className="text-sm">لا توجد معاملات</p>
      <p className="text-xs">لم يتم تسجيل أي مبيعات أو دفعات لهذا العميل بعد</p>
    </div>
  );
}
