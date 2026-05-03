import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, ShoppingCart, UserCheck,
  MoreHorizontal, Users, Truck, LogOut, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MAIN_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/sales',      icon: TrendingUp,      label: 'المبيعات',   end: false },
  { to: '/purchases',  icon: ShoppingCart,    label: 'المشتريات',  end: false },
  { to: '/customers',  icon: UserCheck,       label: 'العملاء',    end: false },
];

const MORE_NAV = [
  { to: '/employees', icon: Users, label: 'الموظفون' },
  { to: '/suppliers', icon: Truck, label: 'الموردون' },
];

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isMoreActive = MORE_NAV.some(n => location.pathname.startsWith(n.to));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-around h-16">
          {MAIN_NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 active:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                  </span>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
              isMoreActive ? 'text-blue-600' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <span className={`p-1 rounded-xl transition-colors ${isMoreActive ? 'bg-blue-50' : ''}`}>
              <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.2 : 1.75} />
            </span>
            <span className="text-[10px] font-medium leading-none">المزيد</span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setShowMore(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 py-3" dir="rtl">
              {/* User card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowMore(false)}
                className="absolute top-4 left-4 p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">روابط إضافية</p>

              <div className="space-y-1">
                {MORE_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setShowMore(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 active:bg-gray-100'
                      }`
                    }
                  >
                    <Icon size={20} className="shrink-0" />
                    {label}
                  </NavLink>
                ))}

                <button
                  onClick={() => { logout(); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 active:bg-red-50 transition-colors"
                >
                  <LogOut size={20} className="shrink-0" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
