import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Expense } from '../types';
import { generateId } from '../utils/hash';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea, Select } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';

const EXPENSE_CATEGORIES = [
  'رواتب', 'إيجار', 'كهرباء', 'مياه', 'هاتف/إنترنت',
  'وقود', 'صيانة', 'مصروفات مكتبية', 'تسويق', 'أخرى',
];

const PAYMENT_METHODS = [
  { value: 'cash',   label: 'نقد',  activeClass: 'bg-emerald-600 text-white', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { value: 'bank',   label: 'بنك',  activeClass: 'bg-blue-600 text-white',    badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'credit', label: 'آجل', activeClass: 'bg-orange-500 text-white',  badgeClass: 'bg-orange-100 text-orange-700' },
] as const;

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  title: '',
  amount: 0,
  date: today,
  category: 'أخرى',
  paymentMethod: 'cash' as 'cash' | 'bank' | 'credit',
  supplierId: '',
  supplierName: '',
  notes: '',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function pmBadge(pm: string) {
  return PAYMENT_METHODS.find(p => p.value === pm) ?? PAYMENT_METHODS[0];
}

interface SummaryCardProps { title: string; value: string; colorBg: string; colorText: string; }
function SummaryCard({ title, value, colorBg, colorText }: SummaryCardProps) {
  return (
    <div className={`${colorBg} rounded-2xl p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className={`text-xl font-bold ${colorText}`}>{value} ₪</p>
    </div>
  );
}

export default function Expenses() {
  const { expenses, suppliers, addExpense, updateExpense, removeExpense } = useData();
  const toast = useToast();

  const [search, setSearch]               = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<Expense | null>(null);

  const filtered = useMemo(() =>
    expenses.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterPayment  && e.paymentMethod !== filterPayment) return false;
      if (filterDateFrom && e.date < filterDateFrom) return false;
      if (filterDateTo   && e.date > filterDateTo)   return false;
      return true;
    }),
    [expenses, search, filterCategory, filterPayment, filterDateFrom, filterDateTo]
  );

  const totalAll    = useMemo(() => expenses.reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);
  const totalPaid   = useMemo(() => expenses.filter(e => e.paymentMethod !== 'credit').reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);
  const totalCredit = useMemo(() => expenses.filter(e => e.paymentMethod === 'credit').reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);
  const todayTotal  = useMemo(() => expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount ?? 0), 0), [expenses]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setForm({
      title: e.title,
      amount: e.amount,
      date: e.date,
      category: e.category || 'أخرى',
      paymentMethod: e.paymentMethod,
      supplierId: e.supplierId ?? '',
      supplierName: e.supplierName ?? '',
      notes: e.notes,
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
    if (!form.title.trim())              { toast.error('يرجى إدخال اسم المصروف'); return; }
    if (!form.amount || form.amount <= 0) { toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر'); return; }
    const expense: Expense = {
      id: editingId ?? generateId(),
      title: form.title.trim(),
      amount: parseFloat(String(form.amount)) || 0,
      date: form.date,
      category: form.category,
      paymentMethod: form.paymentMethod,
      supplierId: form.supplierId,
      supplierName: form.supplierName,
      notes: form.notes,
    };
    closeModal();
    if (editingId) updateExpense(expense);
    else addExpense(expense);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeExpense(target.id);
  };

  const hasFilters = filterCategory || filterPayment || filterDateFrom || filterDateTo;

  const columns = [
    { key: 'title', label: 'المصروف' },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (e: Expense) => <span className="font-semibold text-gray-800">{fmt(e.amount)} ₪</span>,
    },
    { key: 'date', label: 'التاريخ' },
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="إجمالي المصروفات" value={fmt(totalAll)}    colorBg="bg-red-50"     colorText="text-red-600" />
        <SummaryCard title="مدفوع (نقد/بنك)"  value={fmt(totalPaid)}   colorBg="bg-emerald-50" colorText="text-emerald-600" />
        <SummaryCard title="آجل غير مدفوع"    value={fmt(totalCredit)} colorBg="bg-orange-50"  colorText="text-orange-600" />
        <SummaryCard title="مصروفات اليوم"     value={fmt(todayTotal)}  colorBg="bg-blue-50"    colorText="text-blue-600" />
      </div>

      <PageHeader
        title="المصروفات"
        count={filtered.length}
        onAdd={openAdd}
        addLabel="إضافة مصروف"
        search={search}
        onSearch={setSearch}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="date"
          value={filterDateFrom}
          onChange={e => setFilterDateFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <span className="text-xs text-gray-400">إلى</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={e => setFilterDateTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">كل الفئات</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">كل طرق الدفع</option>
          {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterCategory(''); setFilterPayment(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="text-sm text-red-500 hover:underline"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

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
                  type="number"
                  min="0"
                  step="0.01"
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
