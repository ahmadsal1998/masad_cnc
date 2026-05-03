import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Truck,
  ShoppingCart, TrendingUp, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
  { to: '/employees',  icon: Users,           label: 'الموظفون',    end: false },
  { to: '/customers',  icon: UserCheck,       label: 'العملاء',     end: false },
  { to: '/suppliers',  icon: Truck,           label: 'الموردون',    end: false },
  { to: '/purchases',  icon: ShoppingCart,    label: 'المشتريات',   end: false },
  { to: '/sales',      icon: TrendingUp,      label: 'المبيعات',    end: false },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0" dir="rtl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700/60">
        <img src="/logo.jpeg" alt="MSAD CNC" className="w-9 h-9 object-contain shrink-0" />
        <div>
          <p className="font-bold text-base leading-tight text-white">MSAD CNC</p>
          <p className="text-xs text-gray-400 leading-tight">نظام الإدارة</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-700/60 p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
