import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useData } from '../../context/DataContext';

const TITLES: Record<string, string> = {
  '/':           'لوحة التحكم',
  '/employees':  'الموظفون',
  '/customers':  'العملاء',
  '/suppliers':  'الموردون',
  '/purchases':  'المشتريات',
  '/sales':      'المبيعات',
};

export default function Layout() {
  const location = useLocation();
  const { loadAll } = useData();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const title = TITLES[location.pathname] ?? 'MSAD CNC';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop only (lg+) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main
          className="flex-1 overflow-auto p-4 lg:p-6"
          style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="lg:pb-0" style={{ paddingBottom: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile/tablet only (< lg) */}
      <BottomNav />
    </div>
  );
}
