import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import type { Sale, SaleItem } from '../types';
import { generateId } from '../utils/hash';
import { formatDate } from '../utils/formatDate';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea, Select } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import FilterBar, { type FilterField } from '../components/ui/FilterBar';

const EMPTY_ITEM: SaleItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

const EMPTY_FORM = {
  customerId:    '',
  customerName:  '',
  date:          new Date().toISOString().split('T')[0],
  paymentType:   'credit' as 'cash' | 'credit',
  discountType:  'fixed'  as 'fixed' | 'percent',
  discountValue: 0,
  paidAmount:    0,
  notes:         '',
};

const EMPTY_FILTERS: Record<string, string> = {
  search:      '',
  dateFrom:    '',
  dateTo:      '',
  paymentType: '',
  customerId:  '',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Sales() {
  const { sales, customers, addSale, updateSale, removeSale } = useData();
  const toast = useToast();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<string, string>>(EMPTY_FILTERS);

  const filterConfig: FilterField[] = useMemo(() => [
    { key: 'search',      type: 'search',    placeholder: 'بحث بالعميل...' },
    { key: 'dateFrom',    type: 'date-from' },
    { key: 'dateTo',      type: 'date-to' },
    { key: 'paymentType', type: 'segmented', options: [
      { value: '',       label: 'الكل' },
      { value: 'cash',   label: 'نقد' },
      { value: 'credit', label: 'آجل' },
    ]},
    { key: 'customerId', type: 'select', allLabel: 'كل العملاء',
      options: customers.map(c => ({ value: c.id, label: c.name })) },
  ], [customers]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return sales.filter(s => {
      if (q && !s.customerName.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false;
      if (filters.dateFrom    && s.date < filters.dateFrom) return false;
      if (filters.dateTo      && s.date > filters.dateTo)   return false;
      if (filters.paymentType && s.paymentType !== filters.paymentType) return false;
      if (filters.customerId  && s.customerId  !== filters.customerId)  return false;
      return true;
    });
  }, [sales, filters]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<SaleItem[]>([{ ...EMPTY_ITEM }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setItems([{ ...EMPTY_ITEM }]);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (s: Sale) => {
    setForm({
      customerId:    s.customerId,
      customerName:  s.customerName,
      date:          s.date,
      paymentType:   s.paymentType ?? 'credit',
      discountType:  s.discountType ?? 'fixed',
      discountValue: s.discountValue ?? 0,
      paidAmount:    s.paidAmount ?? 0,
      notes:         s.notes,
    });
    setItems(Array.isArray(s.items) ? s.items.map(i => ({ ...i })) : [{ ...EMPTY_ITEM }]);
    setEditingId(s.id);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        item.total = Number(item.quantity) * Number(item.unitPrice);
      }
      next[index] = item;
      return next;
    });
  };

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const subtotal       = items.reduce((s, i) => s + (i.total || 0), 0);
  const discountAmount = form.discountType === 'percent'
    ? (subtotal * Math.min(Math.max(form.discountValue, 0), 100)) / 100
    : Math.min(Math.max(form.discountValue, 0), subtotal);
  const totalAmount     = subtotal - discountAmount;
  const remainingAmount = form.paymentType === 'credit'
    ? Math.max(0, totalAmount - form.paidAmount)
    : 0;

  const handleCustomerChange = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setForm(f => ({ ...f, customerId: id, customerName: cust?.name ?? '' }));
  };

  const handleSubmit = () => {
    if (!form.customerId) { toast.error('يرجى اختيار العميل'); return; }
    if (items.length === 0 || items.every(i => !i.description)) { toast.error('يرجى إضافة صنف واحد على الأقل'); return; }
    if (form.discountType === 'percent' && form.discountValue > 100) { toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%'); return; }
    if (form.discountType === 'fixed'   && form.discountValue > subtotal) { toast.error('الخصم لا يمكن أن يتجاوز إجمالي الفاتورة'); return; }
    if (form.paymentType === 'credit'   && form.paidAmount > totalAmount) { toast.error('المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة'); return; }
    const sale: Sale = {
      id:            editingId ?? generateId(),
      customerId:    form.customerId,
      customerName:  form.customerName,
      date:          form.date,
      items:         items.filter(i => i.description),
      discountType:  form.discountType,
      discountValue: form.discountValue,
      discountAmount,
      totalAmount,
      paymentType:   form.paymentType,
      paidAmount:    form.paymentType === 'credit' ? form.paidAmount : undefined,
      notes:         form.notes,
    };
    closeModal();
    if (editingId) updateSale(sale);
    else           addSale(sale);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeSale(target.id);
  };

  const columns = [
    { key: 'customerName', label: 'العميل' },
    { key: 'date', label: 'التاريخ', render: (s: Sale) => <span>{formatDate(s.date)}</span> },
    {
      key: 'totalAmount',
      label: 'الإجمالي',
      render: (s: Sale) => <span className="font-medium">{fmt(s.totalAmount)} ₪</span>,
    },
    {
      key: 'paymentType',
      label: 'طريقة الدفع',
      render: (s: Sale) => {
        const type = s.paymentType ?? 'credit';
        return (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {type === 'cash' ? 'نقد' : 'آجل'}
          </span>
        );
      },
    },
  ];

  return (
    <div dir="rtl">
      <PageHeader
        title="المبيعات"
        count={filtered.length}
        onAdd={openAdd}
        addLabel="إضافة فاتورة بيع"
      />

      <FilterBar
        config={filterConfig}
        values={filters}
        onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={filtered.length}
        totalCount={sales.length}
      />

      <Table
        columns={columns}
        data={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        emptyMessage="لا توجد مبيعات مسجلة"
      />

      {showModal && (
        <Modal title={editingId ? 'تعديل فاتورة البيع' : 'إضافة فاتورة بيع جديدة'} onClose={closeModal} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="العميل" required>
                <Select value={form.customerId} onChange={e => handleCustomerChange(e.target.value)}>
                  <option value="">-- اختر العميل --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="التاريخ" required>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </FormField>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">الأصناف</span>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 touch-manipulation"
                >
                  <Plus size={14} /> إضافة صنف
                </button>
              </div>

              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="اسم الصنف"
                        className="flex-1"
                      />
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-red-400 p-1.5 shrink-0">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">الكمية</p>
                        <Input type="text" inputMode="decimal" value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">سعر الوحدة</p>
                        <Input type="text" inputMode="decimal" value={item.unitPrice}
                          onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">الإجمالي</p>
                        <p className="text-sm font-bold text-gray-800 pt-2">{fmt(item.total)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center px-1 pt-1">
                  <span className="text-sm text-gray-500">المجموع قبل الخصم</span>
                  <span className="text-sm text-gray-700">{fmt(subtotal)} ₪</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm text-green-700">الخصم</span>
                    <span className="text-sm font-medium text-green-700">- {fmt(discountAmount)} ₪</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-1 pt-1 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">الإجمالي الكلي</span>
                  <span className="font-bold text-gray-800">{fmt(totalAmount)} ₪</span>
                </div>
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الوصف</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">الكمية</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">سعر الوحدة</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">الإجمالي</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">
                          <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="اسم الصنف" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="text" inputMode="decimal" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="text" inputMode="decimal" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-3 py-1.5 font-medium text-gray-700">{fmt(item.total)}</td>
                        <td className="px-1 py-1.5">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 text-sm">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-gray-500">المجموع قبل الخصم</td>
                      <td className="px-3 py-2 text-gray-700">{fmt(subtotal)} ₪</td>
                      <td></td>
                    </tr>
                    {discountAmount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-medium text-green-700">الخصم</td>
                        <td className="px-3 py-2 font-medium text-green-700">- {fmt(discountAmount)} ₪</td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">الإجمالي</td>
                      <td className="px-3 py-2 font-bold text-gray-800">{fmt(totalAmount)} ₪</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Discount */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-700 shrink-0">الخصم</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discountType: 'fixed' }))}
                  className={`px-3 py-1.5 transition-colors ${form.discountType === 'fixed' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  ثابت ₪
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discountType: 'percent' }))}
                  className={`px-3 py-1.5 transition-colors ${form.discountType === 'percent' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  نسبة %
                </button>
              </div>
              <Input
                type="text"
                inputMode="decimal"
                value={form.discountValue || ''}
                onChange={e => setForm(f => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))}
                placeholder={form.discountType === 'percent' ? '0%' : '0.00'}
                className="w-32"
              />
              {discountAmount > 0 && (
                <span className="text-sm font-medium text-green-700 mr-auto">
                  وفر {fmt(discountAmount)} ₪
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="طريقة الدفع" required>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-white h-10">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'cash', paidAmount: 0 }))}
                    className={`flex-1 px-3 py-2 transition-colors font-medium ${
                      form.paymentType === 'cash' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    نقد
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'credit' }))}
                    className={`flex-1 px-3 py-2 transition-colors font-medium ${
                      form.paymentType === 'credit' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    آجل
                  </button>
                </div>
                {form.paymentType === 'cash' && (
                  <p className="text-xs text-green-600 mt-1">سيتم تسجيل دفعة تحصيل تلقائية بالمبلغ الكامل</p>
                )}
                {form.paymentType === 'credit' && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">المبلغ المدفوع مقدماً (اختياري)</p>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.paidAmount || ''}
                      onChange={e => setForm(f => ({ ...f, paidAmount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                    {form.paidAmount > 0 && form.paidAmount <= totalAmount && (
                      <p className="text-xs text-orange-600 font-medium">
                        المتبقي: {fmt(remainingAmount)} ₪ ← يُضاف لرصيد العميل
                      </p>
                    )}
                    {form.paidAmount > totalAmount && (
                      <p className="text-xs text-red-500">المبلغ المدفوع يتجاوز إجمالي الفاتورة</p>
                    )}
                    {form.paidAmount === 0 && (
                      <p className="text-xs text-gray-400">المبلغ الكامل {fmt(totalAmount)} ₪ يُضاف لرصيد العميل</p>
                    )}
                  </div>
                )}
              </FormField>
              <FormField label="ملاحظات">
                <TextArea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </FormField>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {editingId ? 'حفظ التعديلات' : 'إضافة الفاتورة'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`هل أنت متأكد من حذف فاتورة البيع للعميل "${deleteTarget.customerName}"؟`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
