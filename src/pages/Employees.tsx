import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Employee } from '../types';
import { generateId } from '../utils/hash';
import { toStr, toDateInput } from '../utils/form';
import PageHeader from '../components/ui/PageHeader';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { FormField, Input, TextArea } from '../components/ui/FormField';

const EMPTY_FORM = {
  name: '',
  position: '',
  phone: '',
  salary: '',
  joinDate: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

export default function Employees() {
  const { employees, addEmployee, updateEmployee, removeEmployee } = useData();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.phone.includes(q),
    );
  }, [employees, search]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: toStr(emp.name),
      position: toStr(emp.position),
      phone: toStr(emp.phone),
      salary: toStr(emp.salary || 0),
      joinDate: toDateInput(emp.joinDate),
      notes: toStr(emp.notes),
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
    const emp: Employee = {
      id: editingId ?? generateId(),
      name: form.name.trim(),
      position: form.position.trim(),
      phone: form.phone.trim(),
      salary: parseFloat(form.salary) || 0,
      joinDate: form.joinDate,
      notes: form.notes.trim(),
    };
    closeModal();
    if (editingId) updateEmployee(emp);
    else addEmployee(emp);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    removeEmployee(target.id);
  }

  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'position', label: 'المنصب' },
    { key: 'phone', label: 'الهاتف' },
    {
      key: 'salary',
      label: 'الراتب',
      render: (row: Employee) =>
        row.salary.toLocaleString('en-US', { minimumFractionDigits: 0 }) + ' ₪',
    },
    { key: 'joinDate', label: 'تاريخ الالتحاق' },
  ];

  return (
    <div className="p-6" dir="rtl">
      <PageHeader
        title="الموظفون"
        count={employees.length}
        onAdd={openAdd}
        addLabel="إضافة موظف"
        search={search}
        onSearch={setSearch}
      />

      <Table
        columns={columns}
        data={filtered}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        emptyMessage="لا يوجد موظفون مسجلون"
      />

      {modalOpen && (
        <Modal
          title={editingId ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          onClose={closeModal}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="الاسم" required error={errors.name}>
              <Input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="اسم الموظف"
                error={!!errors.name}
                autoFocus
              />
            </FormField>

            <FormField label="المنصب" error={errors.position}>
              <Input
                value={form.position}
                onChange={e => handleChange('position', e.target.value)}
                placeholder="المسمى الوظيفي"
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

            <FormField label="الراتب" error={errors.salary}>
              <Input
                value={form.salary}
                onChange={e => handleChange('salary', e.target.value)}
                placeholder="0"
                type="text"
                inputMode="decimal"
              />
            </FormField>

            <FormField label="تاريخ الالتحاق" error={errors.joinDate}>
              <Input
                value={form.joinDate}
                onChange={e => handleChange('joinDate', e.target.value)}
                type="date"
              />
            </FormField>

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
          message={`هل أنت متأكد من حذف الموظف "${deleteTarget.name}"؟ لا يمكن التراجع عن هذه العملية.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
