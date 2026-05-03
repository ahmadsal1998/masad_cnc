import Modal from './Modal';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title="تأكيد الحذف" onClose={onCancel} size="md">
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors"
        >
          حذف
        </button>
      </div>
    </Modal>
  );
}
