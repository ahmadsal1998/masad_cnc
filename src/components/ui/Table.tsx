import { Pencil, Trash2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  emptyMessage?: string;
  /** First column used as the card title on mobile */
  mobileTitle?: keyof T;
}

function MobileCard<T extends { id: string }>({
  row, columns, onEdit, onDelete
}: {
  row: T;
  columns: Column<T>[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}) {
  const [titleCol, ...restCols] = columns;
  const titleVal = titleCol.render ? titleCol.render(row) : String((row as Record<string, unknown>)[titleCol.key] ?? '');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Card title row */}
      <p className="font-semibold text-gray-800 text-sm mb-3">{titleVal}</p>

      {/* Rest of columns */}
      <div className="space-y-2">
        {restCols.map(col => {
          const val = col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');
          return (
            <div key={col.key} className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400 shrink-0">{col.label}</span>
              <span className="text-sm text-gray-700 text-left">{val}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onEdit(row)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 active:bg-blue-100 transition-colors touch-manipulation"
        >
          <Pencil size={14} />
          تعديل
        </button>
        <button
          onClick={() => onDelete(row)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 active:bg-red-100 transition-colors touch-manipulation"
        >
          <Trash2 size={14} />
          حذف
        </button>
      </div>
    </div>
  );
}

export default function Table<T extends { id: string }>({
  columns, data, onEdit, onDelete, emptyMessage = 'لا توجد بيانات'
}: TableProps<T>) {
  const empty = (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center text-gray-400 text-sm">
      {emptyMessage}
    </div>
  );

  return (
    <>
      {/* ── Mobile: card list (< md) ── */}
      <div className="md:hidden space-y-3" dir="rtl">
        {data.length === 0 ? empty : data.map(row => (
          <MobileCard key={row.id} row={row} columns={columns} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* ── Desktop: table (≥ md) ── */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-right font-medium text-gray-500 whitespace-nowrap ${col.className ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-gray-500 w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    {columns.map(col => (
                      <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="تعديل"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
