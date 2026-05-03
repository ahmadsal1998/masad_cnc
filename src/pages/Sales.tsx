import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Sale, SaleItem } from '../types';
import { generateId } from '../utils/hash';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea, Select } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';

const EMPTY_ITEM: SaleItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

const EMPTY_FORM = {
  customerId: '',
  customerName: '',
  date: new Date().toISOString().split('T')[0],
  paidAmount: 0,
  notes: '',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function Sales() {
  const { sales, customers, addSale, updateSale, removeSale } = useData();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<SaleItem[]>([{ ...EMPTY_ITEM }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() =>
    sales.filter(s =>
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.date.includes(search)
    ), [sales, search]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setItems([{ ...EMPTY_ITEM }]);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (s: Sale) => {
    setForm({
      customerId: s.customerId,
      customerName: s.customerName,
      date: s.date,
      paidAmount: s.paidAmount,
      notes: s.notes,
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

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((s, i) => s + (i.total || 0), 0);

  const handleCustomerChange = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setForm(f => ({ ...f, customerId: id, customerName: cust?.name ?? '' }));
  };

  const handleSubmit = async () => {
    if (!form.customerId) return alert('يرجى اختيار العميل');
    if (items.length === 0 || items.every(i => !i.description)) return alert('يرجى إضافة صنف واحد على الأقل');
    const sale: Sale = {
      id: editingId ?? generateId(),
      customerId: form.customerId,
      customerName: form.customerName,
      date: form.date,
      items: items.filter(i => i.description),
      totalAmount,
      paidAmount: parseFloat(String(form.paidAmount)) || 0,
      notes: form.notes,
    };
    setLoading(true);
    try {
      if (editingId) await updateSale(sale);
      else await addSale(sale);
      closeModal();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await removeSale(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'customerName', label: 'العميل' },
    { key: 'date', label: 'التاريخ' },
    {
      key: 'totalAmount',
      label: 'الإجمالي',
      render: (s: Sale) => <span className="font-medium">{fmt(s.totalAmount)} ₪</span>,
    },
    {
      key: 'paidAmount',
      label: 'المحصّل',
      render: (s: Sale) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          s.paidAmount >= s.totalAmount ? 'bg-green-100 text-green-700' :
          s.paidAmount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
        }`}>
          {fmt(s.paidAmount)} ₪
        </span>
      ),
    },
    {
      key: 'remaining',
      label: 'المتبقي',
      render: (s: Sale) => {
        const rem = s.totalAmount - s.paidAmount;
        return <span className={rem > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>{fmt(rem)} ₪</span>;
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
        search={search}
        onSearch={setSearch}
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
                        <Input type="number" min="1" inputMode="decimal" value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">سعر الوحدة</p>
                        <Input type="number" min="0" step="0.01" inputMode="decimal" value={item.unitPrice}
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
                          <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
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
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">الإجمالي</td>
                      <td className="px-3 py-2 font-bold text-gray-800">{fmt(totalAmount)} ₪</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="المبلغ المحصّل">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paidAmount}
                  onChange={e => setForm(f => ({ ...f, paidAmount: parseFloat(e.target.value) || 0 }))}
                />
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
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الفاتورة'}
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
