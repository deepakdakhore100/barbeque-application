import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, OnlineOrder, BulkCateringOrder, OrderType } from '../../types/pos';
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Volume2,
  Utensils,
  Truck,
  ShoppingBag,
} from 'lucide-react';

export const KitchenDisplayView: React.FC = () => {
  const {
    orders,
    onlineOrders,
    bulkOrders,
    acknowledgeKitchenOrder,
    markKitchenOrderReady,
  } = usePOS();

  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every 10 seconds for live elapsed calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Collect all orders relevant to kitchen
  // 1. In-Dine orders sent to kitchen or preparing
  const activeInDineOrders = orders.filter(
    (o) =>
      o.status === 'sent_to_kitchen' ||
      o.status === 'kitchen_preparing' ||
      o.status === 'food_ready'
  );

  // 2. Online Zomato orders that are approved and in kitchen
  const activeOnlineOrders = onlineOrders.filter(
    (o) =>
      o.approvalStatus === 'approved' &&
      (o.status === 'sent_to_kitchen' ||
        o.status === 'kitchen_preparing' ||
        o.status === 'ready_to_dispatch')
  );

  // 3. Bulk catering orders that are active in kitchen
  const activeBulkOrders = bulkOrders.filter(
    (o) =>
      o.status === 'sent_to_kitchen' ||
      o.status === 'kitchen_preparing' ||
      o.status === 'ready_to_dispatch'
  );

  type KitchenTicket = (Order | OnlineOrder | BulkCateringOrder) & {
    displayCategory: 'In-Dine' | 'Zomato' | 'Bulk Catering';
  };

  const allTickets: KitchenTicket[] = [
    ...activeInDineOrders.map((o) => ({ ...o, displayCategory: 'In-Dine' as const })),
    ...activeOnlineOrders.map((o) => ({ ...o, displayCategory: 'Zomato' as const })),
    ...activeBulkOrders.map((o) => ({ ...o, displayCategory: 'Bulk Catering' as const })),
  ].sort((a, b) => {
    // Priority: preparing/sent first, then oldest first
    const aTime = new Date(a.kotFiredAt || a.createdAt).getTime();
    const bTime = new Date(b.kotFiredAt || b.createdAt).getTime();
    return aTime - bTime;
  });

  const filteredTickets = allTickets.filter((ticket) => {
    if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;
    return true;
  });

  // Calculate elapsed minutes since KOT was fired
  const getElapsedMinutes = (ticket: KitchenTicket) => {
    const start = new Date(ticket.kotFiredAt || ticket.createdAt).getTime();
    const now = currentTime.getTime();
    return Math.max(0, Math.floor((now - start) / (1000 * 60)));
  };

  return (
    <div className="space-y-6">
      {/* KDS Header & Live Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Live Kitchen Display (KDS)
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Station: Master Tawa & Grill
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live orders from In-Dine Waiters, Approved Zomato Orders, and Bulk Catering.
            </p>
          </div>
        </div>

        {/* Source Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'all'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            All Tickets ({allTickets.length})
          </button>
          <button
            onClick={() => setTypeFilter('in_dine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              typeFilter === 'in_dine'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>In-Dine ({activeInDineOrders.length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('online_zomato')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              typeFilter === 'online_zomato'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Zomato ({activeOnlineOrders.length})</span>
          </button>
          <button
            onClick={() => setTypeFilter('bulk_catering')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              typeFilter === 'bulk_catering'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Bulk ({activeBulkOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="p-16 text-center bg-neutral-900 border border-neutral-800 rounded-xl">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">All Kitchen Tickets Cleared!</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            No active orders waiting in the prep queue. New orders from captain tablets or approved Zomato orders will alert here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket);
            const isUrgent = elapsed >= 15;
            const isWarning = elapsed >= 8 && elapsed < 15;

            const isOnline = ticket.type === 'online_zomato';
            const isBulk = ticket.type === 'bulk_catering';
            const isInDine = ticket.type === 'in_dine';

            const isReady =
              ticket.status === 'food_ready' || ticket.status === 'ready_to_dispatch';

            return (
              <div
                key={ticket.id}
                className={`rounded-xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isReady
                    ? 'bg-neutral-900/90 border-emerald-500/40 opacity-80'
                    : isUrgent
                    ? 'bg-neutral-900 border-rose-500/60 ring-1 ring-rose-500/30'
                    : isWarning
                    ? 'bg-neutral-900 border-amber-500/50'
                    : 'bg-neutral-900 border-neutral-750'
                }`}
              >
                {/* Ticket Top Header */}
                <div
                  className={`p-3 border-b flex items-start justify-between ${
                    isReady
                      ? 'bg-emerald-950/30 border-emerald-800/40'
                      : isUrgent
                      ? 'bg-rose-950/40 border-rose-800/40'
                      : isWarning
                      ? 'bg-amber-950/30 border-amber-800/40'
                      : 'bg-neutral-800/80 border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">
                        {ticket.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isOnline
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isBulk
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {ticket.displayCategory}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-300 mt-1 font-semibold flex items-center gap-1.5">
                      {isInDine && (
                        <span>
                          Table {ticket.tableNumber} · Capt. {ticket.captainName}
                        </span>
                      )}
                      {isOnline && (
                        <span>
                          Rider: {(ticket as OnlineOrder).deliveryPartnerName || 'Assigned'}
                        </span>
                      )}
                      {isBulk && (
                        <span>
                          {(ticket as BulkCateringOrder).eventName} · {(ticket as BulkCateringOrder).guestPaxCount} Pax
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Elapsed Timer */}
                  <div
                    className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-md tabular-nums ${
                      isReady
                        ? 'bg-emerald-900/40 text-emerald-300'
                        : isUrgent
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isWarning
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-3.5 flex-1 space-y-3 divide-y divide-neutral-800/70">
                  {ticket.items.map((item) => (
                    <div key={item.id} className="pt-2.5 first:pt-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-white leading-tight">
                          <span className="text-amber-400 font-extrabold mr-1.5 tabular-nums">
                            {item.quantity}x
                          </span>
                          {item.name}
                        </span>
                      </div>

                      {/* Explicit Modifiers & Kitchen Alerts */}
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-orange-400">
                            🌶️ {item.customization.spiceLevel}
                          </span>
                          <span className="text-neutral-500">·</span>
                          <span className="text-neutral-300">
                            {item.customization.butterPreference}
                          </span>
                          {item.customization.pavType !== 'Standard Butter Pav' && (
                            <>
                              <span className="text-neutral-500">·</span>
                              <span className="text-yellow-400 font-medium">
                                {item.customization.pavType}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Exclusions highlighted in high-visibility Red/Amber for Chef */}
                        {item.customization.exclusions.length > 0 && (
                          <div className="p-1 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold text-[11px] flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                            <span>EXCLUDE: {item.customization.exclusions.join(', ')}</span>
                          </div>
                        )}

                        {item.customization.specialNotes && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-900/50 p-1 rounded font-medium">
                            Note: {item.customization.specialNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {ticket.specialInstructions && (
                    <div className="pt-2 text-xs text-neutral-300 font-medium italic">
                      Special: {ticket.specialInstructions}
                    </div>
                  )}
                </div>

                {/* Ticket Action Footers */}
                <div className="p-3 bg-neutral-950/60 border-t border-neutral-800">
                  {ticket.status === 'sent_to_kitchen' && (
                    <button
                      onClick={() => acknowledgeKitchenOrder(ticket.id)}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>ACKNOWLEDGE & START PREP</span>
                    </button>
                  )}

                  {ticket.status === 'kitchen_preparing' && (
                    <button
                      onClick={() => markKitchenOrderReady(ticket.id)}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {isOnline
                          ? 'MARK READY FOR DISPATCH / PICKUP'
                          : isBulk
                          ? 'READY FOR PACKAGING & DISPATCH'
                          : 'MARK READY / SERVED'}
                      </span>
                    </button>
                  )}

                  {isReady && (
                    <div className="py-1.5 px-3 bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {isOnline ? 'Ready for Rider Pickup' : 'Ready & Served'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
