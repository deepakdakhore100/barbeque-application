import React from 'react';
import { usePOS } from '../../context/POSContext';
import { ActiveAppView } from '../../types/pos';
import {
  Volume2,
  VolumeX,
  ChefHat,
  Smartphone,
  LayoutGrid,
  ShoppingBag,
  Truck,
  Boxes,
  BarChart3,
  Flame,
  Download,
} from 'lucide-react';
import { downloadProjectZip } from '../../utils/zipExporter';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    orders,
    onlineOrders,
    soundEnabled,
    setSoundEnabled,
    activeCaptain,
  } = usePOS();

  // Pending Zomato approvals count
  const pendingOnlineCount = onlineOrders.filter(
    (o) => o.approvalStatus === 'pending'
  ).length;

  // Active kitchen tickets count
  const activeKitchenCount =
    orders.filter((o) => o.status === 'sent_to_kitchen' || o.status === 'kitchen_preparing').length +
    onlineOrders.filter(
      (o) => o.approvalStatus === 'approved' && (o.status === 'sent_to_kitchen' || o.status === 'kitchen_preparing')
    ).length;

  const navItems: { view: ActiveAppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      view: 'cashier_pos',
      label: 'Tables & POS',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      view: 'captain_tablet',
      label: 'Captain Tablet',
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      view: 'kitchen_kds',
      label: 'Kitchen KDS',
      icon: <ChefHat className="w-4 h-4" />,
      badge: activeKitchenCount,
    },
    {
      view: 'online_zomato',
      label: 'Zomato Hub',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingOnlineCount,
    },
    {
      view: 'bulk_catering',
      label: 'Bulk Catering',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      view: 'inventory',
      label: 'Inventory',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      view: 'analytics',
      label: 'Sales Report',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-neutral-900 border-b border-neutral-800 text-neutral-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <div
          onClick={() => setActiveView('cashier_pos')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Barbeque Pav Bhaji
          </span>
        </div>

        {/* Zone 2: Navigation views with clean single-line text and subtle active indicator */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`relative flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-neutral-800 text-amber-400 font-semibold shadow-inner'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                    item.view === 'online_zomato'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-amber-500 text-neutral-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: primary actions & sound alert toggler */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={downloadProjectZip}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download full project codebase as ZIP file"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Download ZIP</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Kitchen alerts sound enabled' : 'Kitchen alerts sound muted'}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'border-neutral-700 bg-neutral-800/80 text-emerald-400 hover:bg-neutral-800'
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px] font-medium">
              {soundEnabled ? 'Chime ON' : 'Muted'}
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 pl-2 border-l border-neutral-800">
            <span className="text-[11px]">Staff:</span>
            <span className="text-neutral-200 font-medium">{activeCaptain}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
