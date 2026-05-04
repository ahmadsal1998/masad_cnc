import { useEffect, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { arabicToEnglish } from '../../utils/numbers';

// ── Config types ───────────────────────────────────────────────────────────────

export type FilterField =
  | { key: string; type: 'search'; placeholder?: string }
  | { key: string; type: 'date-from'; label?: string }
  | { key: string; type: 'date-to';   label?: string }
  | { key: string; type: 'select';    allLabel?: string; options: { value: string; label: string }[] }
  | { key: string; type: 'segmented'; options: { value: string; label: string }[] };

export interface FilterBarProps {
  config:      FilterField[];
  values:      Record<string, string>;
  onChange:    (key: string, value: string) => void;
  onReset:     () => void;
  resultCount: number;
  totalCount:  number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FilterBar({
  config, values, onChange, onReset, resultCount, totalCount,
}: FilterBarProps) {
  // ── Search debounce (local state so the input stays snappy) ──────────────
  const searchField = config.find(f => f.type === 'search');
  const [searchLocal, setSearchLocal] = useState(searchField ? (values[searchField.key] ?? '') : '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep local search in sync when parent resets
  useEffect(() => {
    if (!searchField) return;
    const committed = values[searchField.key] ?? '';
    setSearchLocal(prev => (prev !== committed && committed === '') ? '' : prev);
  }, [values, searchField]);

  function handleSearchInput(key: string, val: string) {
    const converted = arabicToEnglish(val);
    setSearchLocal(converted);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(key, converted), 280);
  }

  function handleReset() {
    setSearchLocal('');
    clearTimeout(debounceRef.current);
    onReset();
  }

  // ── Active filter count (empty string = inactive; first segmented option = inactive) ──
  const hasAnyFilter = config.some(f => {
    const v = f.type === 'search' ? searchLocal : (values[f.key] ?? '');
    return v !== '';
  });

  const activeCount = config.filter(f => {
    const v = f.type === 'search' ? searchLocal : (values[f.key] ?? '');
    return v !== '';
  }).length;

  // ── Shared input class ────────────────────────────────────────────────────
  const inputCls = (active?: boolean) =>
    `text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors ${
      active
        ? 'border-blue-400 bg-blue-50 text-blue-700'
        : 'border-gray-200 bg-white text-gray-700'
    }`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
      <div className="flex flex-wrap gap-2 items-center">

        {/* ── Filter icon + active badge ───────────────────────────────── */}
        <div className="flex items-center gap-1.5 shrink-0">
          <SlidersHorizontal
            size={15}
            className={hasAnyFilter ? 'text-blue-500' : 'text-gray-400'}
          />
          {activeCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
        </div>

        {/* ── Fields ──────────────────────────────────────────────────── */}
        {config.map(field => {
          // ── Search ──────────────────────────────────────────────────
          if (field.type === 'search') {
            return (
              <div key={field.key} className="relative flex-1 min-w-[180px]">
                <Search
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={field.placeholder ?? 'بحث...'}
                  value={searchLocal}
                  onChange={e => handleSearchInput(field.key, e.target.value)}
                  className="w-full pr-8 pl-7 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                />
                {searchLocal && (
                  <button
                    onClick={() => { setSearchLocal(''); onChange(field.key, ''); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          }

          // ── Date from ────────────────────────────────────────────────
          if (field.type === 'date-from') {
            return (
              <div key={field.key} className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gray-400">{field.label ?? 'من'}</span>
                <input
                  type="date"
                  value={values[field.key] ?? ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  className={inputCls(!!values[field.key])}
                />
              </div>
            );
          }

          // ── Date to ──────────────────────────────────────────────────
          if (field.type === 'date-to') {
            return (
              <div key={field.key} className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gray-400">{field.label ?? 'إلى'}</span>
                <input
                  type="date"
                  value={values[field.key] ?? ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  className={inputCls(!!values[field.key])}
                />
              </div>
            );
          }

          // ── Select ───────────────────────────────────────────────────
          if (field.type === 'select') {
            const active = !!values[field.key];
            return (
              <select
                key={field.key}
                value={values[field.key] ?? ''}
                onChange={e => onChange(field.key, e.target.value)}
                className={`${inputCls(active)} cursor-pointer`}
              >
                <option value="">{field.allLabel ?? 'الكل'}</option>
                {field.options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            );
          }

          // ── Segmented ────────────────────────────────────────────────
          if (field.type === 'segmented') {
            const current = values[field.key] ?? '';
            return (
              <div key={field.key} className="flex rounded-lg border border-gray-200 overflow-hidden text-xs bg-white shrink-0">
                {field.options.map(o => (
                  <button
                    key={o.value}
                    onClick={() => onChange(field.key, o.value)}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      current === o.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            );
          }

          return null;
        })}

        {/* ── Spacer ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0" />

        {/* ── Result count ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium tabular-nums ${
            hasAnyFilter ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {resultCount}
            {hasAnyFilter && totalCount !== resultCount && (
              <span className="text-gray-400 font-normal"> / {totalCount}</span>
            )}
          </span>

          {hasAnyFilter && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X size={12} />
              مسح
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
