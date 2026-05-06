import { useState } from 'react';
import { Receipt, ArrowLeftRight } from 'lucide-react';
import Modal from './Modal';
import { FormField, Input, Select, TextArea } from './FormField';

type PaymentMethod = 'cash' | 'bank' | 'transfer';
type VoucherKind   = 'receipt' | 'payment';

interface VoucherModalProps {
  mode: 'customer' | 'supplier';
  entityName: string;
  currentBalance: number;
  onClose: () => void;
  isEdit?: boolean;
  initialValues?: {
    amount:      number;
    type:        PaymentMethod;
    date:        string;
    notes:       string;
    voucherType: VoucherKind;
  };
  onSubmit: (data: {
    amount:      number;
    type:        PaymentMethod;
    date:        string;
    notes:       string;
    voucherType: VoucherKind;
  }) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().split('T')[0];

const methodLabel: Record<PaymentMethod, string> = {
  cash:     'الصندوق (نقد)',
  bank:     'البنك',
  transfer: 'تحويل بنكي',
};

function getJournalEntry(
  mode: 'customer' | 'supplier',
  voucherType: VoucherKind,
  method: PaymentMethod,
  entityName: string,
): { debitAccount: string; creditAccount: string; description: string } {
  const cashAccount   = methodLabel[method];
  const entityAccount = mode === 'customer'
    ? `حساب عميل / ${entityName}`
    : `حساب مورد / ${entityName}`;

  if (voucherType === 'receipt') {
    return {
      debitAccount:  cashAccount,
      creditAccount: entityAccount,
      description:   mode === 'customer'
        ? 'إضافة دفعة للعميل — استلام مبلغ من العميل، يُقيَّد دائناً لحسابه'
        : 'إعطاء دفعة للمورد — استلام مبلغ من المورد (رد دين / تعديل)، يُقيَّد دائناً لحسابه',
    };
  }
  return {
    debitAccount:  entityAccount,
    creditAccount: cashAccount,
    description:   mode === 'customer'
      ? 'إضافة دين على العميل — صرف مبلغ للعميل، يُقيَّد مديناً لحسابه'
      : 'مبلغ غير مدفوع للمورد — سداد مبلغ للمورد، يُقيَّد مديناً لحسابه',
  };
}

function balanceEffect(_mode: 'customer' | 'supplier', voucherType: VoucherKind): number {
  return voucherType === 'payment' ? +1 : -1;
}

export default function VoucherModal({
  mode,
  entityName,
  currentBalance,
  onClose,
  isEdit = false,
  initialValues,
  onSubmit,
}: VoucherModalProps) {
  const defaultVoucher: VoucherKind =
    initialValues?.voucherType ?? (mode === 'customer' ? 'receipt' : 'payment');

  const [voucherType, setVoucherType] = useState<VoucherKind>(defaultVoucher);
  const [form, setForm] = useState({
    amount: initialValues ? String(initialValues.amount) : '',
    type:   (initialValues?.type ?? 'cash') as PaymentMethod,
    date:   initialValues?.date ?? today(),
    notes:  initialValues?.notes ?? '',
  });
  const [error, setError] = useState('');

  const amount   = parseFloat(form.amount) || 0;
  const effect   = balanceEffect(mode, voucherType);

  // When editing, exclude the old payment's effect from the baseline so the preview is accurate
  const oldEffect = (isEdit && initialValues)
    ? (initialValues.voucherType === 'payment' ? initialValues.amount : -initialValues.amount)
    : 0;
  const baseBalance = currentBalance - oldEffect;
  const afterBal    = baseBalance + effect * amount;

  const journal = getJournalEntry(mode, voucherType, form.type, entityName);

  const voucherLabel = mode === 'customer'
    ? (voucherType === 'receipt' ? 'إضافة دفعة للعميل' : 'إضافة دين على العميل')
    : (voucherType === 'receipt' ? 'إعطاء دفعة للمورد' : 'مبلغ غير مدفوع للمورد');

  const headerBg  = voucherType === 'receipt' ? 'bg-blue-600'   : 'bg-orange-500';
  const btnClass  = voucherType === 'receipt' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600';
  const badgeCls  = voucherType === 'receipt' ? 'bg-blue-100 text-blue-700'     : 'bg-orange-100 text-orange-700';
  const activeCls = 'font-semibold ring-2 ring-inset ring-white/60';

  function handleSubmit() {
    const parsed = parseFloat(form.amount);
    if (!parsed || parsed <= 0) { setError('يرجى إدخال مبلغ صحيح'); return; }
    onSubmit({ amount: parsed, type: form.type, date: form.date, notes: form.notes, voucherType });
  }

  return (
    <Modal title={isEdit ? 'تعديل سند محاسبي' : 'إضافة سند محاسبي'} onClose={onClose} size="lg">
      <div className="space-y-5">

        {/* ── Voucher type toggle ──────────────────────────────────────────── */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
          <button
            onClick={() => setVoucherType('receipt')}
            className={`flex-1 py-2.5 text-center transition-colors ${
              voucherType === 'receipt'
                ? 'bg-blue-600 text-white ' + activeCls
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {mode === 'customer' ? 'إضافة دفعة للعميل' : 'إعطاء دفعة للمورد'}
          </button>
          <button
            onClick={() => setVoucherType('payment')}
            className={`flex-1 py-2.5 text-center transition-colors border-r border-gray-200 ${
              voucherType === 'payment'
                ? 'bg-orange-500 text-white ' + activeCls
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {mode === 'customer' ? 'إضافة دين على العميل' : 'مبلغ غير مدفوع للمورد'}
          </button>
        </div>

        {/* ── Voucher banner ───────────────────────────────────────────────── */}
        <div className={`${headerBg} text-white rounded-xl px-4 py-3 flex items-center gap-3`}>
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Receipt size={18} />
          </div>
          <div>
            <p className="text-xs font-medium opacity-80">نوع السند</p>
            <p className="text-sm font-bold">{voucherLabel}</p>
          </div>
          <div className="mr-auto text-left">
            <p className="text-xs opacity-80">الجهة</p>
            <p className="text-sm font-bold">{entityName}</p>
          </div>
        </div>

        {/* ── Double-entry preview ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
            <ArrowLeftRight size={14} className="text-gray-500" />
            <p className="text-xs font-semibold text-gray-600">قيد محاسبي مزدوج</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">الحساب</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-blue-600">مدين ↑</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-emerald-600">دائن ↓</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2.5 text-gray-700 text-xs">{journal.debitAccount}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {amount > 0 ? `${fmt(amount)} ₪` : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-gray-300 text-xs">—</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-700 text-xs">{journal.creditAccount}</td>
                <td className="px-4 py-2.5 text-center text-gray-300 text-xs">—</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {amount > 0 ? `${fmt(amount)} ₪` : '—'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400 leading-snug max-w-xs">{journal.description}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${badgeCls}`}>
              {voucherLabel}
            </span>
          </div>
        </div>

        {/* ── Form fields ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="المبلغ" required>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setError(''); }}
              error={!!error}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </FormField>

          <FormField label="التاريخ" required>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="وسيلة الدفع" required>
          <Select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as PaymentMethod }))}
          >
            <option value="cash">نقد</option>
            <option value="bank">بنك</option>
            <option value="transfer">تحويل بنكي</option>
          </Select>
        </FormField>

        <FormField label="ملاحظات">
          <TextArea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="ملاحظات اختيارية..."
          />
        </FormField>

        {/* ── Balance preview ──────────────────────────────────────────────── */}
        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">الرصيد الحالي</p>
            <p className={`font-bold ${
              currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-emerald-600' : 'text-gray-500'
            }`}>
              {fmt(currentBalance)} ₪
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{isEdit ? 'الرصيد بعد التعديل' : 'الرصيد بعد السند'}</p>
            <p className={`font-bold ${
              afterBal > 0 ? 'text-red-600' : afterBal < 0 ? 'text-emerald-600' : 'text-gray-500'
            }`}>
              {fmt(afterBal)} ₪
            </p>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            className={`px-5 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 ${btnClass}`}
          >
            <Receipt size={15} />
            {isEdit ? 'حفظ التعديلات' : `تسجيل ${voucherLabel}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
