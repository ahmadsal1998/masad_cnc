import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Customer } from '../types';
import { generateId } from '../utils/hash';
import { computeCustomerCurrentBalance } from '../utils/balance';
import { toStr } from '../utils/form';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea } from '../components/ui/FormField';
import FilterBar, { type FilterField } from '../components/ui/FilterBar';

const EMPTY_FORM = {
  name:    '',
  phone:   '',
  email:   '',
  address: '',
  balance: '',
  notes:   '',
};

type FormState = typeof EMPTY_FORM;

const EMPTY_FILTERS: Record<string, string> = {
  search:        '',
  balanceStatus: '',
};

const FILTER_CONFIG: FilterField[] = [
  { key: 'search',        type: 'search',    placeholder: 'بحث بالاسم أو الهاتف...' },
  { key: 'balanceStatus', type: 'segmented', options: [
    { value: '',          label: 'الكل' },
    { value: 'indebted',  label: 'مدين' },
    { value: 'settled',   label: 'مسوّى' },
  ]},
];

export default function Customers() {
  const { customers, sales, customerPayments, addCustomer, updateCustomer, removeCustomer } = useData();

  const [filters, setFilters]       = useState<Record<string, string>>(EMPTY_FILTERS);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Partial<FormState>>({});
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of customers) {
      map.set(
        c.id,
        computeCustomerCurrentBalance(
          c.balance,
          sales.filter(s => s.customerId === c.id),
          customerPayments.filter(p => p.customerId === c.id),
        ),
      );
    }
    return map;
  }, [customers, sales, customerPayments]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return customers.filter(c => {
      if (q && !(c.name ?? '').toLowerCase().includes(q)
            && !(c.phone ?? '').includes(q)
            && !(c.email ?? '').toLowerCase().includes(q)) return false;
      const bal = balanceMap.get(c.id) ?? 0;
      if (filters.balanceStatus === 'indebted' && bal <= 0) return false;
      if (filters.balanceStatus === 'settled'  && bal !== 0) return false;
      return true;
    });
  }, [customers, filters, balanceMap]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name:    toStr(customer.name),
      phone:   toStr(customer.phone),
      email:   toStr(customer.email),
      address: toStr(customer.address),
      balance: toStr(customer.balance ?? 0),
      notes:   toStr(customer.notes),
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
    if (!form.name.trim()) newErrors.name = 'الاسم مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const customer: Customer = {
      id:      editingId ?? generateId(),
      name:    form.name.trim(),
      phone:   form.phone.trim(),
      email:   form.email.trim(),
      address: form.address.trim(),
      balance: parseFloat(form.balance) || 0,
      notes:   form.notes.trim(),
    };
    closeModal();
    if (editingId) updateCustomer(customer);
    else           addCustomer(customer);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeCustomer(target.id);
  }

  const columns = [
    { key: 'name',  label: 'الاسم' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'address', label: 'العنوان' },
    {
      key: 'balance',
      label: 'الرصيد',
      render: (row: Customer) => {
        const bal = balanceMap.get(row.id) ?? 0;
        return (
          <span className={bal === 0 ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
            {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪
          </span>
        );
      },
    },
    {
      key: 'statement',
      label: 'كشف الحساب',
      render: (row: Customer) => (
        <Link
          to={`/customers/${row.id}/statement`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <FileText size={12} />
          عرض
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="العملاء"
        count={filtered.length}
        onAdd={openAdd}
        addLabel="إضافة عميل"
      />

      <FilterBar
        config={FILTER_CONFIG}
        values={filters}
        onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
        resultCount={filtered.length}
        totalCount={customers.length}
      />

      <Table
        columns={columns}
        data={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        emptyMessage="لا يوجد عملاء مسجلون"
      />

      {modalOpen && (
        <Modal
          title={editingId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          onClose={closeModal}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="الاسم" required error={errors.name}>
              <Input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="اسم العميل"
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
                type="text"
                inputMode="decimal"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="العنوان" error={errors.address}>
                <Input
                  value={form.address}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="عنوان العميل"
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
          message={`هل أنت متأكد من حذف العميل "${deleteTarget.name}"؟ لا يمكن التراجع عن هذه العملية.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
