import { Plus, Search } from 'lucide-react';

interface PageHeaderProps {
  title:     string;
  count?:    number;
  onAdd:     () => void;
  addLabel?: string;
  search?:    string;
  onSearch?:  (v: string) => void;
}

export default function PageHeader({
  title, count, onAdd, addLabel = 'إضافة جديد', search, onSearch,
}: PageHeaderProps) {
  return (
    <div className="mb-4" dir="rtl">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {count !== undefined && (
            <p className="text-xs text-gray-400 mt-0.5">{count} سجل</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:bg-blue-700 transition-colors touch-manipulation shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{addLabel}</span>
          <span className="sm:hidden">إضافة</span>
        </button>
      </div>

      {/* Search row — only rendered when wired up */}
      {onSearch !== undefined && (
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search ?? ''}
            onChange={e => onSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full pr-9 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      )}
    </div>
  );
}
