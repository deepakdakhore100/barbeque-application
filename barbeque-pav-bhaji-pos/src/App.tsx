/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navbar } from './components/layout/Navbar';
import { TableManagementView } from './components/tables/TableManagementView';
import { CaptainTabletView } from './components/waiter/CaptainTabletView';
import { KitchenDisplayView } from './components/kitchen/KitchenDisplayView';
import { OnlineOrderHub } from './components/online/OnlineOrderHub';
import { BulkCateringView } from './components/bulk/BulkCateringView';
import { InventoryTrackingView } from './components/inventory/InventoryTrackingView';
import { SalesAnalyticsView } from './components/analytics/SalesAnalyticsView';
import { DatabaseExplorerView } from './components/database/DatabaseExplorerView';
import { PaymentModal } from './components/billing/PaymentModal';

import { AlertTriangle, X } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeView, setActiveView, pgSyncError, clearPgSyncError } = usePOS();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {pgSyncError && activeView !== 'database_sql' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/60 border border-amber-600/50 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-amber-300 block">
                PostgreSQL Sync Notice (Neon Database)
              </span>
              <span className="text-amber-200/90">
                Orders are safely held in local POS memory, but could not be written to Neon PostgreSQL: {pgSyncError}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('database_sql')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-colors whitespace-nowrap"
            >
              Open DB Reconnect Console
            </button>
            <button
              onClick={clearPgSyncError}
              className="p-1.5 hover:bg-amber-900/40 rounded-lg text-amber-400 transition-colors"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeView === 'cashier_pos' && <TableManagementView />}
      {activeView === 'captain_tablet' && <CaptainTabletView />}
      {activeView === 'kitchen_kds' && <KitchenDisplayView />}
      {activeView === 'online_zomato' && <OnlineOrderHub />}
      {activeView === 'bulk_catering' && <BulkCateringView />}
      {activeView === 'inventory' && <InventoryTrackingView />}
      {activeView === 'analytics' && <SalesAnalyticsView />}
      {activeView === 'database_sql' && <DatabaseExplorerView />}
      <PaymentModal />
    </main>
  );
};

export default function App() {
  return (
    <POSProvider>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 antialiased">
        <Navbar />
        <div className="flex-1">
          <MainContent />
        </div>
        <footer className="border-t border-neutral-900 bg-neutral-950 py-4 text-center text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Barbeque Pav Bhaji POS · GSTIN: 27AABCB1234F1Z8 · FSSAI Lic: 11521019000124
            </span>
            <div className="flex items-center gap-3">
              <span>Station: Main Counter & Tawa Kitchen</span>
              <span>·</span>
              <span className="text-amber-500 font-medium">Digital KOT & KDS Active</span>
            </div>
          </div>
        </footer>
      </div>
    </POSProvider>
  );
}
