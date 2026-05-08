import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Expense } from '../types';
import { generateId } from '../utils/hash';
import { formatDate } from '../utils/formatDate';
import { fmt } from '../utils/numbers';
import { Receipt, Calendar, CalendarRange, Banknote, Clock, Tag } from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea, Select } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import FilterBar, { type FilterField } from '../components/ui/FilterBar';
import StatCard from '../components/ui/StatCard';

const EXPENSE_CATEGORIES = [
  'رواتب', 'إيجار', 'كهرباء', 'مياه', 'هاتف/إنترنت',
  'وقود', 'صيانة', 'مصروفات مكتبية', 'تسويق', 'أخرى',
];

const PAYMENT_METHODS = [
  { value: 'cash',   label: 'نقد',  activeClass: 'bg-emerald-600 text-white', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { value: 'bank',   label: 'بنك',  activeClass: 'bg-blue-600 text-white',    badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'credit', label: 'آجل',  activeClass: 'bg-orange-500 text-white',  badgeClass: 'bg-orange-100 text-orange-700' },
] as const;

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  title:         '',
  amount:        0,
  date:          today,
  category:      'أخرى',
  paymentMethod: 'cash' as 'cash' | 'bank' | 'credit',
  supplierId:    '',
  supplierName:  '',
  notes:         '',
};

const EMPTY_FILTERS: Record<string, string> = {
  search:        '',
  dateFrom:      '',
  dateTo:        '',
  category:      '',
  paymentMethod: '',
  supplierId:    '',
};

function pmBadge(pm: string) {
  return PAYMENT_METHODS.find(p => p.value === pm) ?? PAYMENT_METHODS[0];
}


export default function Expenses() {
  const { expenses, suppliers, addExpense, updateExpense, removeExpense } = useData();
  const toast = useToast();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<string, string>>(EMPTY_FILTERS);

  const filterConfig: FilterField[] = useMemo(() => [
    { key: 'search',        type: 'search',    placeholder: 'بحث بالمصروف...' },
    { key: 'dateFrom',      type: 'date-from' },
    { key: 'dateTo',        type: 'date-to' },
    { key: 'category',      type: 'select',    allLabel: 'كل الفئات',
      options: EXPENSE_CATEGORIES.map(c => ({ value: c, label: c })) },
    { key: 'paymentMethod', type: 'segmented', options: [
      { value: '',       label: 'الكل' },
      { value: 'cash',   label: 'نقد' },
      { value: 'bank',   label: 'بنك' },
      { value: 'credit', label: 'آجل' },
    ]},
    { key: 'supplierId', type: 'select', allLabel: 'كل الموردين',
      options: suppliers.map(s => ({ value: s.id, label: s.name })) },
  ], [suppliers]);

  const filtered = useMemo(() =>
    expenses.filter(e => {
      const q = filters.search.toLowerCase();
      if (q && !e.title.toLowerCase().includes(q)) return false;
      if (filters.category      && e.category      !== filters.category)      return false;
      if (filters.paymentMethod && e.paymentMethod !== filters.paymentMethod) return false;
      if (filters.dateFrom      && e.date < filters.dateFrom) return false;
      if (filters.dateTo        && e.date > filters.dateTo)   return false;
      if (filters.supplierId    && e.supplierId    !== filters.supplierId)    return false;
      return true;
    }),
    [expenses, filters],
  );

  // ── Summary stats (always from full dataset, not filtered) ────────────────
  const monthPrefix = today.slice(0, 7);

  const expenseStats = useMemo(() => {
    const totalAll    = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalPaid   = expenses.filter(e => e.paymentMethod !== 'credit').reduce((s, e) => s + (e.amount ?? 0), 0);
    const totalCredit = expenses.filter(e => e.paymentMethod === 'credit').reduce((s, e) => s + (e.amount ?? 0), 0);
    const todayTotal  = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount ?? 0), 0);
    const monthTotal  = expenses.filter(e => e.date.startsWith(monthPrefix)).reduce((s, e) => s + (e.amount ?? 0), 0);

    // Top category by sum
    const catMap = new Map<string, number>();
    for (const e of expenses) {
      const cat = e.category || 'أخرى';
      catMap.set(cat, (catMap.get(cat) ?? 0) + (e.amount ?? 0));
    }
    let topCat = '—';
    let topCatAmt = 0;
    for (const [cat, amt] of catMap) {
      if (amt > topCatAmt) { topCatAmt = amt; topCat = cat; }
    }

    return { totalAll, totalPaid, totalCredit, todayTotal, monthTotal, topCat, topCatAmt };
  }, [expenses, today, monthPrefix]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setForm({
      title:         e.title,
      amount:        e.amount,
      date:          e.date,
      category:      e.category || 'أخرى',
      paymentMethod: e.paymentMethod,
      supplierId:    e.supplierId ?? '',
      supplierName:  e.supplierName ?? '',
      notes:         e.notes,
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const handleSupplierChange = (id: string) => {
    const sup = suppliers.find(s => s.id === id);
    setForm(f => ({ ...f, supplierId: id, supplierName: sup?.name ?? '' }));
  };

  const handleSubmit = () => {
    if (!form.title.trim())               { toast.error('يرجى إدخال اسم المصروف'); return; }
    if (!form.amount || form.amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر'); return; }
    const expense: Expense = {
      id:            editingId ?? generateId(),
      title:         form.title.trim(),
      amount:        parseFloat(String(form.amount)) || 0,
      date:          form.date,
      category:      form.category,
      paymentMethod: form.paymentMethod,
      supplierId:    form.supplierId,
      supplierName:  form.supplierName,
      notes:         form.notes,
    };
    closeModal();
    if (editingId) updateExpense(expense);
    else           addExpense(expense);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeExpense(target.id);
  };

  const columns = [
    { key: 'title', label: 'المصروف' },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (e: Expense) => <span className="font-semibold text-gray-800">{fmt(e.amount)} ₪</span>,
    },
    { key: 'date', label: 'التاريخ', render: (e: Expense) => <span>{formatDate(e.date)}</span> },
    { key: 'category', label: 'الفئة' },
    {
      key: 'paymentMethod',
      label: 'طريقة الدفع',
      render: (e: Expense) => {
        const pm = pmBadge(e.paymentMethod);
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.badgeClass}`}>
            {pm.label}
          </span>
        );
      },
    },
    {
      key: 'supplierName',
      label: 'المورد',
      render: (e: Expense) => (
        <span className="text-gray-500 text-sm">{e.supplierName || '—'}</span>
      ),
    },
  ];

  return (
    <div dir="rtl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard
          title="إجمالي المصروفات"
          value={`${fmt(expenseStats.totalAll)} ₪`}
          icon={<Receipt size={20} className="text-red-500" />}
          colorBg="bg-red-50"
        />
        <StatCard
          title="مصروفات اليوم"
          value={`${fmt(expenseStats.todayTotal)} ₪`}
          icon={<Calendar size={20} className="text-blue-600" />}
          colorBg="bg-blue-50"
        />
        <StatCard
          title="مصروفات هذا الشهر"
          value={`${fmt(expenseStats.monthTotal)} ₪`}
          icon={<CalendarRange size={20} className="text-purple-600" />}
          colorBg="bg-purple-50"
        />
        <StatCard
          title="مدفوع (نقد/بنك)"
          value={`${fmt(expenseStats.totalPaid)} ₪`}
          icon={<Banknote size={20} className="text-emerald-600" />}
          colorBg="bg-emerald-50"
        />
        <StatCard
          title="آجل غير مدفوع"
          value={`${fmt(expenseStats.totalCredit)} ₪`}
          icon={<Clock size={20} className="text-orange-500" />}
          colorBg="bg-orange-50"
        />
        <StatCard
          title="أعلى فئة مصروفات"
          value={expenseStats.topCat}
          subtitle={`${fmt(expenseStats.topCatAmt)} ₪`}
          icon={<Tag size={20} className="text-sky-600" />}
          colorBg="bg-sky-50"
        />
      </div>

      <PageHeader
        title="المصروفات"
        count={filtered.length}
        onAdd={openAdd}
        addLabel="إضافة مصروف"
      />

      <FilterBar
        config={filterConfig}
        values={filters}
        onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={filtered.length}
        totalCount={expenses.length}
      />

      <Table
        columns={columns}
        data={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        emptyMessage="لا توجد مصروفات مسجلة"
      />

      {showModal && (
        <Modal title={editingId ? 'تعديل المصروف' : 'إضافة مصروف جديد'} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="اسم المصروف" required>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: إيجار شهر مايو"
                />
              </FormField>
              <FormField label="المبلغ" required>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="التاريخ" required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </FormField>
              <FormField label="الفئة">
                <Select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
            </div>

            {/* Payment method toggle */}
            <FormField label="طريقة الدفع" required>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white w-fit">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentMethod: pm.value }))}
                    className={`px-4 py-2 transition-colors ${
                      form.paymentMethod === pm.value ? pm.activeClass : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
              {form.paymentMethod === 'credit' && (
                <p className="text-xs text-orange-600 mt-1">
                  آجل: سيتم إضافة المبلغ لرصيد المورد المحدد إذا تم اختياره
                </p>
              )}
            </FormField>

            {/* Supplier (optional) */}
            <FormField label="المورد (اختياري)">
              <Select value={form.supplierId} onChange={e => handleSupplierChange(e.target.value)}>
                <option value="">-- لا يوجد مورد --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>

            <FormField label="ملاحظات">
              <TextArea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
              />
            </FormField>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {editingId ? 'حفظ التعديلات' : 'إضافة المصروف'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`هل أنت متأكد من حذف المصروف "${deleteTarget.title}"؟`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
