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
import { PaymentModal } from './components/billing/PaymentModal';

const MainContent: React.FC = () => {
  const { activeView } = usePOS();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {activeView === 'cashier_pos' && <TableManagementView />}
      {activeView === 'captain_tablet' && <CaptainTabletView />}
      {activeView === 'kitchen_kds' && <KitchenDisplayView />}
      {activeView === 'online_zomato' && <OnlineOrderHub />}
      {activeView === 'bulk_catering' && <BulkCateringView />}
      {activeView === 'inventory' && <InventoryTrackingView />}
      {activeView === 'analytics' && <SalesAnalyticsView />}
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
