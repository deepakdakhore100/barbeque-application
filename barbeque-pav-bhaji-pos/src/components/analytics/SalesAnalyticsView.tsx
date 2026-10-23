import React from 'react';
import { usePOS } from '../../context/POSContext';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Flame,
  ShoppingBag,
  Truck,
  IndianRupee,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SalesAnalyticsView: React.FC = () => {
  const { orders, onlineOrders, bulkOrders, menuItems } = usePOS();

  // Combine completed / active sales
  const inDineTotal = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const onlineTotal = onlineOrders
    .filter((o) => o.status !== 'cancelled' && o.approvalStatus === 'approved')
    .reduce((sum, o) => sum + o.total, 0);

  const bulkTotal = bulkOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const grandRevenue = inDineTotal + onlineTotal + bulkTotal;
  const totalOrdersCount = orders.length + onlineOrders.length + bulkOrders.length;

  // Item popularity counting
  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  [...orders, ...onlineOrders, ...bulkOrders].forEach((ord) => {
    ord.items.forEach((item) => {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { name: item.name, count: 0, revenue: 0 };
      }
      itemCounts[item.name].count += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });

  const sortedItems = Object.values(itemCounts).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Total Gross Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums font-mono">
            ₹{grandRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">All Channels Combined</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">In-Dine Table Sales</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums font-mono">
            ₹{inDineTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">{orders.length} Table Bills</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Zomato Online Delivery</span>
            <ShoppingBag className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1 tabular-nums font-mono">
            ₹{onlineTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">{onlineOrders.length} App Orders</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium">Bulk & Event Catering</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1 tabular-nums font-mono">
            ₹{bulkTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">{bulkOrders.length} Caterings Booked</div>
        </div>
      </div>

      {/* 2-Column Split: Revenue Channel Share & Top Selling Varieties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Channel Share */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Channel Contribution
            </h3>
            <span className="text-xs text-neutral-400">Revenue Distribution</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* In-Dine Bar */}
            <div>
              <div className="flex justify-between mb-1 text-neutral-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>In-Dine Dining & Table Service</span>
                </span>
                <span className="font-mono tabular-nums text-white">
                  ₹{inDineTotal.toLocaleString('en-IN')} (
                  {grandRevenue > 0 ? Math.round((inDineTotal / grandRevenue) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{
                    width: `${grandRevenue > 0 ? (inDineTotal / grandRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Zomato Online Bar */}
            <div>
              <div className="flex justify-between mb-1 text-neutral-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Zomato Online Delivery Hub</span>
                </span>
                <span className="font-mono tabular-nums text-white">
                  ₹{onlineTotal.toLocaleString('en-IN')} (
                  {grandRevenue > 0 ? Math.round((onlineTotal / grandRevenue) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${grandRevenue > 0 ? (onlineTotal / grandRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Bulk Catering Bar */}
            <div>
              <div className="flex justify-between mb-1 text-neutral-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Bulk Event Catering & Live Stations</span>
                </span>
                <span className="font-mono tabular-nums text-white">
                  ₹{bulkTotal.toLocaleString('en-IN')} (
                  {grandRevenue > 0 ? Math.round((bulkTotal / grandRevenue) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${grandRevenue > 0 ? (bulkTotal / grandRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Pav Bhaji Dishes */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Top Selling Dishes & Varieties
            </h3>
            <span className="text-xs text-neutral-400">By Plates Sold</span>
          </div>

          <div className="space-y-3">
            {sortedItems.slice(0, 5).map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-800/60 border border-neutral-750 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-neutral-700 text-amber-400 font-bold flex items-center justify-center text-xs tabular-nums">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-[11px] text-neutral-400 block tabular-nums">
                      {item.count} plates served
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-emerald-400 tabular-nums">
                  ₹{item.revenue.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
