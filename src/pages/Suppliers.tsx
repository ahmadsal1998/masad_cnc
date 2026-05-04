import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Supplier } from '../types';
import { generateId } from '../utils/hash';
import { toStr } from '../utils/form';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea } from '../components/ui/FormField';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  balance: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, removeSupplier } = useData();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      s =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        (s.address ?? '').toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: toStr(supplier.name),
      phone: toStr(supplier.phone),
      email: toStr(supplier.email),
      address: toStr(supplier.address),
      balance: toStr(supplier.balance ?? 0),
      notes: toStr(supplier.notes),
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const newErrors: Partial<FormState> = {};
    if (!form.name.trim()) newErrors.name = 'اسم المورد مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const supplier: Supplier = {
      id: editingId ?? generateId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      balance: parseFloat(form.balance) || 0,
      notes: form.notes.trim(),
    };
    closeModal();
    if (editingId) updateSupplier(supplier);
    else addSupplier(supplier);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeSupplier(target.id);
  }

  const columns = [
    { key: 'name', label: 'اسم المورد' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'address', label: 'العنوان' },
    {
      key: 'balance',
      label: 'الرصيد',
      render: (row: Supplier) => (
        <span
          className={
            row.balance === 0
              ? 'text-green-600 font-medium'
              : 'text-orange-500 font-medium'
          }
        >
          {row.balance.toLocaleString('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="الموردون"
        count={suppliers.length}
        onAdd={openAdd}
        addLabel="إضافة مورد"
        search={search}
        onSearch={setSearch}
      />

      <Table
        columns={columns}
        data={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        emptyMessage="لا يوجد موردون مسجلون"
      />

      {modalOpen && (
        <Modal
          title={editingId ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
          onClose={closeModal}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="اسم المورد" required error={errors.name}>
              <Input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="اسم المورد"
                error={!!errors.name}
                autoFocus
              />
            </FormField>

            <FormField label="الهاتف" error={errors.phone}>
              <Input
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="رقم الهاتف"
                type="tel"
              />
            </FormField>

            <FormField label="البريد الإلكتروني" error={errors.email}>
              <Input
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="example@email.com"
                type="email"
              />
            </FormField>

            <FormField label="الرصيد" error={errors.balance}>
              <Input
                value={form.balance}
                onChange={e => handleChange('balance', e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="العنوان" error={errors.address}>
                <Input
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="عنوان المورد"
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="ملاحظات">
                <TextArea
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="ملاحظات إضافية..."
                />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={closeModal}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              {editingId ? 'حفظ التعديلات' : 'إضافة'}
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`هل أنت متأكد من حذف المورد "${deleteTarget.name}"؟ لا يمكن التراجع عن هذه العملية.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
