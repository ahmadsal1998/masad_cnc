import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { syncStatus, loadAll } = useData();

  return (
    <header
      className="bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between z-30 sticky top-0"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: '0.75rem',
      }}
      dir="rtl"
    >
      {/* Left side: logo (mobile) + title */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Logo pill — mobile only */}
        <div className="lg:hidden flex items-center gap-1.5 shrink-0">
          <img src="/logo.jpeg" alt="MSAD CNC" className="w-7 h-7 object-contain" />
        </div>
        <h1 className="text-base lg:text-xl font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      {/* Right side: sync status + refresh */}
      <div className="flex items-center gap-2 shrink-0">
        {syncStatus.loading && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            <Loader2 size={12} className="animate-spin" />
            <span className="hidden md:inline">مزامنة...</span>
          </span>
        )}
        {syncStatus.error && !syncStatus.loading && (
          <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
            <AlertCircle size={12} />
            <span className="hidden sm:inline">خطأ</span>
          </span>
        )}
        {syncStatus.lastSync && !syncStatus.loading && !syncStatus.error && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} />
          </span>
        )}

        <button
          onClick={loadAll}
          disabled={syncStatus.loading}
          title="تحديث البيانات"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors touch-manipulation"
        >
          <RefreshCw size={16} className={syncStatus.loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </header>
  );
}
