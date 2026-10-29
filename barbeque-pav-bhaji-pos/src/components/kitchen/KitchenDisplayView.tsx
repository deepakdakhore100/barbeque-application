import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, OnlineOrder, BulkCateringOrder, OrderType, OrderStatus, MenuItemCustomization } from '../../types/pos';
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Utensils,
  Truck,
  ShoppingBag,
  Layers,
  Search,
  X,
  Play,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface PendingItemSummary {
  name: string;
  menuItemId: string;
  category: string;
  station: string;
  totalQuantity: number;
  waitingQuantity: number;
  preparingQuantity: number;
  orderCount: number;
  orderRefs: Array<{
    ticketId: string;
    orderNumber: string;
    orderType: OrderType;
    label: string;
    quantity: number;
    status: OrderStatus;
    customization: MenuItemCustomization;
  }>;
  spices: Record<string, number>;
  butterPreferences: Record<string, number>;
  pavTypes: Record<string, number>;
  exclusions: Record<string, number>;
  specialNotes: string[];
}

export const KitchenDisplayView: React.FC = () => {
  const {
    orders,
    onlineOrders,
    bulkOrders,
    menuItems,
    acknowledgeKitchenOrder,
    markKitchenOrderReady,
  } = usePOS();

  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [prepStatusFilter, setPrepStatusFilter] = useState<'all' | 'waiting' | 'preparing'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedItemName, setHighlightedItemName] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every 10 seconds for live elapsed calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Collect all orders relevant to kitchen
  // 1. In-Dine orders sent to kitchen, preparing, or ready
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

  const allTickets: KitchenTicket[] = useMemo(() => {
    return [
      ...activeInDineOrders.map((o) => ({ ...o, displayCategory: 'In-Dine' as const })),
      ...activeOnlineOrders.map((o) => ({ ...o, displayCategory: 'Zomato' as const })),
      ...activeBulkOrders.map((o) => ({ ...o, displayCategory: 'Bulk Catering' as const })),
    ].sort((a, b) => {
      const aTime = new Date(a.kotFiredAt || a.createdAt).getTime();
      const bTime = new Date(b.kotFiredAt || b.createdAt).getTime();
      return aTime - bTime;
    });
  }, [activeInDineOrders, activeOnlineOrders, activeBulkOrders]);

  // Aggregate pending items across active tickets awaiting preparation
  const { pendingSummaries, totalPendingItems, waitingTicketCount, preparingTicketCount, pavEstimates } = useMemo(() => {
    const map = new Map<string, PendingItemSummary>();
    let totalItems = 0;
    let waitingTickets = 0;
    let preparingTickets = 0;

    // Pav totals for grill station
    const pavTally = {
      totalPavPieces: 0,
      standardButter: 0,
      kadakCrispy: 0,
      wheatBrown: 0,
      masalaPav: 0,
    };

    // Only orders in 'sent_to_kitchen' or 'kitchen_preparing' need actual cooking
    const cookingTickets = allTickets.filter(
      (t) => t.status === 'sent_to_kitchen' || t.status === 'kitchen_preparing'
    );

    for (const ticket of cookingTickets) {
      if (ticket.status === 'sent_to_kitchen') waitingTickets++;
      if (ticket.status === 'kitchen_preparing') preparingTickets++;

      let orderLabel = '';
      if (ticket.type === 'in_dine') {
        orderLabel = `Table ${ticket.tableNumber}`;
      } else if (ticket.type === 'online_zomato') {
        orderLabel = `Zomato ${ticket.orderNumber}`;
      } else if (ticket.type === 'bulk_catering') {
        orderLabel = `Bulk: ${(ticket as BulkCateringOrder).eventName}`;
      }

      for (const item of ticket.items) {
        totalItems += item.quantity;

        const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name === item.name);
        const station = menuItem?.station || 'Tawa Griddle';
        const category = menuItem?.category || 'Barbeque Specials';

        // Tally pavs for tawa/grill estimates
        const isBhajiDish =
          category === 'Barbeque Specials' ||
          category === 'Cheese & Gourmet' ||
          item.name.toLowerCase().includes('bhaji');

        const isPavSpecific = item.name.toLowerCase().includes('pav');

        if (isBhajiDish) {
          // Standard bhaji serving includes 2 pav pieces
          const pavCount = item.quantity * 2;
          pavTally.totalPavPieces += pavCount;

          const pType = item.customization.pavType || 'Standard Butter Pav';
          if (pType === 'Kadak Crispy Pav') pavTally.kadakCrispy += pavCount;
          else if (pType === 'Wheat / Brown Pav') pavTally.wheatBrown += pavCount;
          else if (pType === 'Masala Pav') pavTally.masalaPav += pavCount;
          else pavTally.standardButter += pavCount;
        } else if (isPavSpecific && !isBhajiDish) {
          // Extra Pav orders
          const pavCount = item.quantity * 2;
          pavTally.totalPavPieces += pavCount;
          pavTally.standardButter += pavCount;
        }

        const key = item.name;
        if (!map.has(key)) {
          map.set(key, {
            name: item.name,
            menuItemId: item.menuItemId,
            category,
            station,
            totalQuantity: 0,
            waitingQuantity: 0,
            preparingQuantity: 0,
            orderCount: 0,
            orderRefs: [],
            spices: {},
            butterPreferences: {},
            pavTypes: {},
            exclusions: {},
            specialNotes: [],
          });
        }

        const summary = map.get(key)!;
        summary.totalQuantity += item.quantity;
        if (ticket.status === 'sent_to_kitchen') {
          summary.waitingQuantity += item.quantity;
        } else if (ticket.status === 'kitchen_preparing') {
          summary.preparingQuantity += item.quantity;
        }

        summary.orderRefs.push({
          ticketId: ticket.id,
          orderNumber: ticket.orderNumber,
          orderType: ticket.type,
          label: orderLabel,
          quantity: item.quantity,
          status: ticket.status,
          customization: item.customization,
        });

        // Spice tally
        const spice = item.customization.spiceLevel || 'Medium';
        summary.spices[spice] = (summary.spices[spice] || 0) + item.quantity;

        // Butter tally
        const butter = item.customization.butterPreference || 'Normal Butter';
        summary.butterPreferences[butter] = (summary.butterPreferences[butter] || 0) + item.quantity;

        // Pav type tally
        const pav = item.customization.pavType || 'Standard Butter Pav';
        summary.pavTypes[pav] = (summary.pavTypes[pav] || 0) + item.quantity;

        // Exclusions
        if (item.customization.exclusions && item.customization.exclusions.length > 0) {
          for (const excl of item.customization.exclusions) {
            summary.exclusions[excl] = (summary.exclusions[excl] || 0) + item.quantity;
          }
        }

        // Special notes
        if (item.customization.specialNotes && !summary.specialNotes.includes(item.customization.specialNotes)) {
          summary.specialNotes.push(item.customization.specialNotes);
        }
      }
    }

    // Update distinct order count
    for (const summary of map.values()) {
      const distinctTicketIds = new Set(summary.orderRefs.map((r) => r.ticketId));
      summary.orderCount = distinctTicketIds.size;
    }

    const summaries = Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

    return {
      pendingSummaries: summaries,
      totalPendingItems: totalItems,
      waitingTicketCount: waitingTickets,
      preparingTicketCount: preparingTickets,
      pavEstimates: pavTally,
    };
  }, [allTickets, menuItems]);

  // Filtered summaries based on station, status, search
  const filteredSummaries = useMemo(() => {
    return pendingSummaries.filter((item) => {
      // Station filter
      if (stationFilter !== 'all' && item.station !== stationFilter) {
        return false;
      }
      // Status filter
      if (prepStatusFilter === 'waiting' && item.waitingQuantity === 0) {
        return false;
      }
      if (prepStatusFilter === 'preparing' && item.preparingQuantity === 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        const matchesExclusion = Object.keys(item.exclusions).some((ex) =>
          ex.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesCategory && !matchesExclusion) return false;
      }
      return true;
    });
  }, [pendingSummaries, stationFilter, prepStatusFilter, searchQuery]);

  // Filter tickets by source type
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;
      return true;
    });
  }, [allTickets, typeFilter]);

  // Batch action: Acknowledge all waiting tickets for an item
  const handleAcknowledgeItem = (summary: PendingItemSummary) => {
    const waitingTicketIds = Array.from(
      new Set(
        summary.orderRefs
          .filter((ref) => ref.status === 'sent_to_kitchen')
          .map((ref) => ref.ticketId)
      )
    );
    waitingTicketIds.forEach((id) => acknowledgeKitchenOrder(id));
  };

  // Batch action: Acknowledge all waiting tickets across the entire kitchen
  const handleAcknowledgeAllWaiting = () => {
    const waitingTicketIds = Array.from(
      new Set(
        allTickets
          .filter((t) => t.status === 'sent_to_kitchen')
          .map((t) => t.id)
      )
    );
    waitingTicketIds.forEach((id) => acknowledgeKitchenOrder(id));
  };

  // Calculate elapsed minutes since KOT was fired
  const getElapsedMinutes = (ticket: KitchenTicket) => {
    const start = new Date(ticket.kotFiredAt || ticket.createdAt).getTime();
    const now = currentTime.getTime();
    return Math.max(0, Math.floor((now - start) / (1000 * 60)));
  };

  // Check if a ticket matches the currently highlighted summary item
  const ticketMatchesHighlight = (ticket: KitchenTicket) => {
    if (!highlightedItemName) return false;
    return ticket.items.some((item) => item.name === highlightedItemName);
  };

  return (
    <div className="space-y-6">
      {/* KDS Header & Live Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Live Kitchen Display (KDS)
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Master Tawa & Grill Console
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live orders from In-Dine Waiters, Approved Zomato Orders, and Bulk Catering with real-time bulk prep batching.
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

      {/* Bulk Preparation Summary Console */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        {/* Bulk Summary Top Bar */}
        <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-850 border-b border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Bulk Preparation Summary
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold tabular-nums">
                  {totalPendingItems} Pending Items
                </span>
                {waitingTicketCount > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium tabular-nums">
                    {waitingTicketCount} Tickets Waiting
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Aggregated item counts across all active tickets. Glance here to batch cook on the big tawa or grill pavs in advance.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {waitingTicketCount > 0 && (
              <button
                onClick={handleAcknowledgeAllWaiting}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                title="Acknowledge all waiting tickets and start preparation"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start All Waiting ({waitingTicketCount})</span>
              </button>
            )}

            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>{isSummaryExpanded ? 'Collapse Summary' : 'Expand Summary'}</span>
              {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tawa & Pav Quick Estimator Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-neutral-800 bg-neutral-950/60 border-b border-neutral-800">
          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Total Pending Portions</div>
              <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight">
                {totalPendingItems}
              </div>
            </div>
          </div>

          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Pavs to Toast (Tawa Grill)</div>
              <div className="text-lg font-bold text-amber-400 font-mono tabular-nums leading-tight">
                {pavEstimates.totalPavPieces} <span className="text-xs text-neutral-400 font-normal">({Math.ceil(pavEstimates.totalPavPieces / 2)} pairs)</span>
              </div>
            </div>
          </div>

          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Awaiting Start (KOT)</div>
              <div className="text-lg font-bold text-blue-400 font-mono tabular-nums leading-tight">
                {waitingTicketCount} <span className="text-xs text-neutral-400 font-normal">tickets</span>
              </div>
            </div>
          </div>

          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Actively Cooking</div>
              <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums leading-tight">
                {preparingTicketCount} <span className="text-xs text-neutral-400 font-normal">tickets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Body */}
        {isSummaryExpanded && (
          <div className="p-4 space-y-4">
            {/* Filter Toolbar inside Summary */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Station Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
                <span className="text-neutral-400 text-xs font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Station:
                </span>
                <button
                  onClick={() => setStationFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    stationFilter === 'all'
                      ? 'bg-neutral-200 text-neutral-900 font-bold shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({pendingSummaries.reduce((acc, i) => acc + i.totalQuantity, 0)})
                </button>
                <button
                  onClick={() => setStationFilter('Tawa Griddle')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    stationFilter === 'Tawa Griddle'
                      ? 'bg-neutral-200 text-neutral-900 font-bold shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  🔥 Tawa Griddle
                </button>
                <button
                  onClick={() => setStationFilter('Pav Grill')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    stationFilter === 'Pav Grill'
                      ? 'bg-neutral-200 text-neutral-900 font-bold shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  🍞 Pav Grill
                </button>
                <button
                  onClick={() => setStationFilter('Fryer & Sides')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    stationFilter === 'Fryer & Sides'
                      ? 'bg-neutral-200 text-neutral-900 font-bold shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  🍟 Fryer & Sides
                </button>
                <button
                  onClick={() => setStationFilter('Beverages')}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    stationFilter === 'Beverages'
                      ? 'bg-neutral-200 text-neutral-900 font-bold shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  🥤 Beverages
                </button>
              </div>

              {/* Status Filter & Search */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
                  <button
                    onClick={() => setPrepStatusFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      prepStatusFilter === 'all'
                        ? 'bg-neutral-800 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    All States
                  </button>
                  <button
                    onClick={() => setPrepStatusFilter('waiting')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      prepStatusFilter === 'waiting'
                        ? 'bg-blue-900/60 text-blue-300 font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Waiting Only
                  </button>
                  <button
                    onClick={() => setPrepStatusFilter('preparing')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      prepStatusFilter === 'preparing'
                        ? 'bg-emerald-900/60 text-emerald-300 font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    In-Prep Only
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dish or note..."
                    className="pl-8 pr-6 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Items Grid */}
            {filteredSummaries.length === 0 ? (
              <div className="py-8 text-center bg-neutral-950/40 rounded-lg border border-neutral-800">
                <p className="text-xs text-neutral-400">
                  {pendingSummaries.length === 0
                    ? 'All kitchen items are prepped or completed! No pending items in queue.'
                    : 'No pending items match the selected station or search filter.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredSummaries.map((summary) => {
                  const isHighlighted = highlightedItemName === summary.name;
                  const hasWaiting = summary.waitingQuantity > 0;
                  const hasExclusions = Object.keys(summary.exclusions).length > 0;

                  return (
                    <div
                      key={summary.name}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isHighlighted
                          ? 'bg-neutral-850 border-amber-400 ring-1 ring-amber-400 shadow-md'
                          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-white tracking-tight">
                                {summary.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {summary.station}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400 mt-0.5">
                              Across {summary.orderCount} active ticket{summary.orderCount > 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Big Total Quantity Badge */}
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums leading-none">
                              {summary.totalQuantity}x
                            </span>
                            <span className="text-[10px] text-neutral-400 uppercase font-semibold mt-0.5">
                              Total Portions
                            </span>
                          </div>
                        </div>

                        {/* Status Breakdown Bar */}
                        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-neutral-850 text-xs font-mono">
                          {summary.waitingQuantity > 0 && (
                            <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-900/40 tabular-nums">
                              {summary.waitingQuantity} Waiting
                            </span>
                          )}
                          {summary.preparingQuantity > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-900/40 tabular-nums">
                              {summary.preparingQuantity} In Prep
                            </span>
                          )}
                        </div>

                        {/* Modifiers & Customizations Breakdown */}
                        <div className="mt-2.5 space-y-1.5 text-xs">
                          {/* Spice distribution */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className="text-neutral-400 font-medium">Spice:</span>
                            {Object.entries(summary.spices).map(([spice, count]) => (
                              <span
                                key={spice}
                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                  spice === 'Kolhapuri Fiery'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                                    : spice === 'Spicy'
                                    ? 'bg-orange-950/80 text-orange-300'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                {count}x {spice}
                              </span>
                            ))}
                          </div>

                          {/* Pav Type Distribution (if applicable) */}
                          {Object.keys(summary.pavTypes).some((p) => p !== 'Standard Butter Pav') && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span className="text-neutral-400 font-medium">Pav:</span>
                              {Object.entries(summary.pavTypes).map(([pavType, count]) => (
                                <span
                                  key={pavType}
                                  className="px-1.5 py-0.5 rounded bg-neutral-850 text-yellow-300 border border-neutral-750"
                                >
                                  {count}x {pavType}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Exclusions Warning Alert - High Visibility for Kitchen */}
                          {hasExclusions && (
                            <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-300 text-[11px] font-semibold flex items-start gap-1.5 mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">EXCLUSIONS:</span>{' '}
                                {Object.entries(summary.exclusions)
                                  .map(([excl, count]) => `${count}x ${excl}`)
                                  .join(' · ')}
                              </div>
                            </div>
                          )}

                          {/* Special Notes */}
                          {summary.specialNotes.length > 0 && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-900/40 p-1.5 rounded font-medium">
                              Notes: {summary.specialNotes.join(' | ')}
                            </div>
                          )}
                        </div>

                        {/* Associated Orders / Tables Quick Ticker */}
                        <div className="mt-2.5 pt-2 border-t border-neutral-850 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-400 uppercase font-bold">
                            Tickets:
                          </span>
                          {summary.orderRefs.map((ref, idx) => (
                            <span
                              key={`${ref.ticketId}-${idx}`}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium"
                            >
                              {ref.label} ({ref.quantity}x)
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Summary Item Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-850 flex items-center justify-between gap-2">
                        <button
                          onClick={() =>
                            setHighlightedItemName(isHighlighted ? null : summary.name)
                          }
                          className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                            isHighlighted
                              ? 'bg-amber-500 text-neutral-950'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          <span>{isHighlighted ? 'Focused in Tickets' : 'Focus in Tickets'}</span>
                        </button>

                        {hasWaiting && (
                          <button
                            onClick={() => handleAcknowledgeItem(summary)}
                            className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                            title="Acknowledge waiting tickets for this dish"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start ({summary.waitingQuantity}x)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Focus Notification Banner (when an item is highlighted) */}
      {highlightedItemName && (
        <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium">
              Focusing on tickets containing:{' '}
              <strong className="text-amber-300">{highlightedItemName}</strong>
            </span>
          </div>
          <button
            onClick={() => setHighlightedItemName(null)}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-neutral-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Focus</span>
          </button>
        </div>
      )}

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

            const isMatchingHighlight = ticketMatchesHighlight(ticket);
            const isDimmed = highlightedItemName && !isMatchingHighlight;

            return (
              <div
                key={ticket.id}
                className={`rounded-xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isMatchingHighlight
                    ? 'ring-2 ring-amber-400 border-amber-400 bg-neutral-900 shadow-amber-500/10'
                    : isDimmed
                    ? 'opacity-35 hover:opacity-100 bg-neutral-900 border-neutral-800'
                    : isReady
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
                    isMatchingHighlight
                      ? 'bg-amber-950/50 border-amber-700/60'
                      : isReady
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
                  {ticket.items.map((item) => {
                    const isItemHighlighted = highlightedItemName === item.name;

                    return (
                      <div
                        key={item.id}
                        className={`pt-2.5 first:pt-0 space-y-1 ${
                          isItemHighlighted ? 'bg-amber-500/10 -mx-2 px-2 py-1.5 rounded' : ''
                        }`}
                      >
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
                    );
                  })}

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
