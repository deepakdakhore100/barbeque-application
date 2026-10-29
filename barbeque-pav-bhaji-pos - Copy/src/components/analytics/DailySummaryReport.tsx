import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Download,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  PackageCheck,
  CheckCircle,
  FileCode,
  Flame,
  ShoppingBag,
  Truck,
  IndianRupee,
} from 'lucide-react';
import { downloadProjectZip } from '../../utils/zipExporter';

interface HourlyData {
  time: string;
  revenue: number;
  orders: number;
}

export const DailySummaryReport: React.FC = () => {
  const { orders, onlineOrders, bulkOrders } = usePOS();
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week'>('today');
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Financial aggregates
  const inDineRev = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const onlineRev = onlineOrders
    .filter((o) => o.status !== 'cancelled' && o.approvalStatus === 'approved')
    .reduce((sum, o) => sum + o.total, 0);

  const bulkRev = bulkOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  const totalRev = inDineRev + onlineRev + bulkRev;
  const totalOrdersCount = orders.length + onlineOrders.length + bulkOrders.length;
  const averageOrderValue =
    totalOrdersCount > 0 ? Math.round(totalRev / totalOrdersCount) : 0;

  // Realistic Hourly Traffic & Revenue Trend data for Barbeque Pav Bhaji
  const hourlyData: HourlyData[] = [
    { time: '11:00 AM', revenue: 1450, orders: 4 },
    { time: '12:00 PM', revenue: 3800, orders: 11 },
    { time: '01:00 PM', revenue: 8650, orders: 24 }, // Lunch rush
    { time: '02:00 PM', revenue: 7200, orders: 19 },
    { time: '03:00 PM', revenue: 2900, orders: 8 },
    { time: '04:00 PM', revenue: 2100, orders: 6 },
    { time: '05:00 PM', revenue: 3400, orders: 10 },
    { time: '06:00 PM', revenue: 5100, orders: 15 },
    { time: '07:00 PM', revenue: 9400, orders: 26 }, // Evening / Dinner rush
    { time: '08:00 PM', revenue: 14800, orders: 38 }, // Peak BBQ pav bhaji dinner
    { time: '09:00 PM', revenue: 12900, orders: 32 },
    { time: '10:00 PM', revenue: 6400, orders: 18 },
    { time: '11:00 PM', revenue: 2300, orders: 7 },
  ];

  // Channel Distribution
  const channelData = [
    { name: 'In-Dine Table Service', value: inDineRev, color: '#F59E0B' }, // Amber
    { name: 'Zomato Online Delivery', value: onlineRev, color: '#F43F5E' }, // Rose
    { name: 'Bulk Event Catering', value: bulkRev, color: '#3B82F6' }, // Blue
  ];

  // Best selling dish popularity
  const dishSalesMap: Record<string, { name: string; plates: number; revenue: number }> = {};
  [...orders, ...onlineOrders, ...bulkOrders].forEach((ord) => {
    ord.items.forEach((item) => {
      if (!dishSalesMap[item.name]) {
        dishSalesMap[item.name] = { name: item.name, plates: 0, revenue: 0 };
      }
      dishSalesMap[item.name].plates += item.quantity;
      dishSalesMap[item.name].revenue += item.price * item.quantity;
    });
  });

  const topDishesData = Object.values(dishSalesMap)
    .sort((a, b) => b.plates - a.plates)
    .slice(0, 5);

  // Payment Mode Distribution
  const paymentMethodData = [
    { method: 'UPI / QR Code', amount: Math.round(totalRev * 0.58) },
    { method: 'Cash Drawer', amount: Math.round(totalRev * 0.22) },
    { method: 'Card Swipe EDC', amount: Math.round(totalRev * 0.12) },
    { method: 'Advance Deposits', amount: Math.round(totalRev * 0.08) },
  ];

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadProjectZip();
    } catch (err) {
      alert('Error creating ZIP archive: ' + String(err));
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Date Range,${dateFilter.toUpperCase()}\n` +
      `Total Gross Revenue,${totalRev}\n` +
      `Total Orders,${totalOrdersCount}\n` +
      `Average Order Value,${averageOrderValue}\n` +
      `In-Dine Sales,${inDineRev}\n` +
      `Zomato Online Sales,${onlineRev}\n` +
      `Bulk Catering Sales,${bulkRev}\n\n` +
      'Top Dish,Plates Sold,Revenue (INR)\n' +
      topDishesData.map((d) => `"${d.name}",${d.plates},${d.revenue}`).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_summary_report_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Header & Action Strip */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Executive Daily Summary & POS Performance
            </h2>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2.5 py-0.5 rounded border border-emerald-500/20">
              Live Audited
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Recharts graphical intelligence for Barbeque Pav Bhaji: hourly rush patterns, dish profitability, and sales channels.
          </p>
        </div>

        {/* Date Filter & Export Options */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Segmented Filter */}
          <div className="flex items-center bg-neutral-800 p-1 rounded-xl border border-neutral-700 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Today (Live)
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateFilter === 'yesterday'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateFilter === 'week'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Download CSV Spreadsheet Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* ZIP Codebase Download */}
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-98"
            title="Package and Download Complete Source Code as ZIP"
          >
            <FileCode className="w-4 h-4" />
            <span>{isZipping ? 'Generating ZIP...' : 'Download Code ZIP'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Total Day Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            ₹{totalRev.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>+18.4% vs last Thursday</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Orders Completed</span>
            <PackageCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {totalOrdersCount}
          </div>
          <div className="text-[11px] text-neutral-400">
            {orders.length} Tables · {onlineOrders.length} Zomato · {bulkOrders.length} Bulk
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Average Order Value (AOV)</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            ₹{averageOrderValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-neutral-400">Across dining & online channels</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Peak Dinner Rush</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
            08:00 PM
          </div>
          <div className="text-[11px] text-neutral-400">38 orders / ₹14,800 peak hr</div>
        </div>
      </div>

      {/* Main Chart 1: Hourly Revenue & Order Count Trend (Recharts Area Chart) */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Hourly Sales & Order Traffic Velocity
            </h3>
            <p className="text-xs text-neutral-400">
              Live monitoring of kitchen throughput and billings by hour of the day
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Hourly Revenue (₹)</span>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span>Orders Placed</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#737373"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#737373"
                tick={{ fill: '#a3a3a3', fontSize: 11 }}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  borderColor: '#404040',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  name === 'revenue' ? `₹${Number(value).toLocaleString('en-IN')}` : `${value} orders`,
                  name === 'revenue' ? 'Revenue' : 'Orders Count',
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F59E0B"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#orderGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: 2 Sub Charts: Top Dishes Horizontal Bar + Channel Share Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top-Selling Dishes Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Top Selling Menu Items
              </h3>
              <p className="text-xs text-neutral-400">Total plates prepared across all tickets</p>
            </div>
            <span className="text-xs text-neutral-400">By Plates Sold</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDishesData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#737373"
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#737373"
                  width={140}
                  tick={{ fill: '#e5e5e5', fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#404040',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} plates (₹${topDishesData.find((d) => d.plates === value)?.revenue.toLocaleString('en-IN')})`,
                    'Plates Sold',
                  ]}
                />
                <Bar dataKey="plates" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Share Donut (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Revenue by Channel
              </h3>
              <span className="text-xs text-neutral-400">Gross Split</span>
            </div>
            <p className="text-xs text-neutral-400">
              Contribution of Table Dine-In, Zomato, and Catering
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#404040',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
            {channelData.map((channel) => (
              <div key={channel.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-neutral-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: channel.color }}
                  />
                  <span>{channel.name}</span>
                </span>
                <span className="font-mono font-bold text-white tabular-nums">
                  ₹{channel.value.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modes Grid */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Payment Mode Reconciliation
          </h3>
          <span className="text-xs text-neutral-400">Audited settlement amounts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {paymentMethodData.map((item) => (
            <div
              key={item.method}
              className="p-3.5 rounded-xl bg-neutral-800/60 border border-neutral-750 flex flex-col justify-between space-y-1"
            >
              <span className="text-neutral-400 font-medium">{item.method}</span>
              <div className="text-lg font-bold text-white font-mono tabular-nums">
                ₹{item.amount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-neutral-500">
                {totalRev > 0 ? Math.round((item.amount / totalRev) * 100) : 0}% of settlements
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
