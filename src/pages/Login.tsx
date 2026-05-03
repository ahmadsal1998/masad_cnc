import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { APPS_SCRIPT_URL } from '../services/config';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    if (!APPS_SCRIPT_URL) {
      setError('لم يتم إعداد رابط Google Apps Script. راجع ملف .env');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-linear-to-br from-gray-900 via-gray-800 to-blue-950 flex items-center justify-center p-5"
      dir="rtl"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-2xl">
            <Building2 size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MSAD CNC</h1>
          <p className="text-gray-400 text-sm mt-1">نظام إدارة الأعمال</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-semibold text-gray-700 text-center pb-1">تسجيل الدخول</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              inputMode="email"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 touch-manipulation mt-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> جاري التحقق...</>
            ) : 'دخول'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          MSAD CNC © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
