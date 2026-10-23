import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table, TableSection, TableStatus } from '../../types/pos';
import {
  Users,
  Clock,
  Receipt,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const TableManagementView: React.FC = () => {
  const {
    tables,
    orders,
    setActiveTableId,
    setActiveView,
    assignTable,
    resetTable,
    openPaymentModal,
    activeCaptain,
    setActiveCaptain,
  } = usePOS();

  const [selectedSection, setSelectedSection] = useState<TableSection | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'All'>('All');
  const [seatingModalTable, setSeatingModalTable] = useState<Table | null>(null);
  const [guestCountInput, setGuestCountInput] = useState<number>(2);

  // Statistics
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status !== 'available').length;
  const occupancyRate = Math.round((occupiedTables / totalTables) * 100);
  const inKitchenCount = tables.filter((t) => t.status === 'in_kitchen').length;

  const currentDiningRevenue = orders
    .filter((o) => o.type === 'in_dine' && o.status !== 'completed' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    const matchesSection = selectedSection === 'All' || t.section === selectedSection;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSection && matchesStatus;
  });

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400';
      case 'seated':
      case 'ordering':
        return 'border-sky-500/30 bg-sky-950/20 text-sky-400';
      case 'in_kitchen':
        return 'border-amber-500/40 bg-amber-950/30 text-amber-400';
      case 'served':
        return 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400';
      case 'billed':
        return 'border-rose-500/40 bg-rose-950/30 text-rose-400';
      case 'paid':
        return 'border-teal-500/30 bg-teal-950/20 text-teal-400';
      default:
        return 'border-neutral-800 bg-neutral-900 text-neutral-400';
    }
  };

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'seated':
        return 'Guests Seated';
      case 'ordering':
        return 'Taking Order';
      case 'in_kitchen':
        return 'Food in Kitchen';
      case 'served':
        return 'Food Served';
      case 'billed':
        return 'Bill Printed';
      case 'paid':
        return 'Paid & Vacating';
    }
  };

  const handleSeatGuestsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatingModalTable) return;
    assignTable(seatingModalTable.id, guestCountInput, activeCaptain);
    setActiveTableId(seatingModalTable.id);
    setSeatingModalTable(null);
    // Switch to captain tablet view for fast order punching
    setActiveView('captain_tablet');
  };

  const handleOpenCaptainPad = (table: Table) => {
    setActiveTableId(table.id);
    setActiveView('captain_tablet');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Floor Occupancy</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums">
              {occupiedTables}/{totalTables}
            </span>
            <span className="text-xs text-neutral-400">({occupancyRate}%)</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Kitchen KOT Active</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-orange-400 tabular-nums">
              {inKitchenCount}
            </span>
            <span className="text-xs text-neutral-400">tables prepping</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Live In-Dine Bills</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-400 tabular-nums">
              ₹{currentDiningRevenue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-neutral-400">Active Associate / Captain</span>
          <div className="mt-1">
            <select
              value={activeCaptain}
              onChange={(e) => setActiveCaptain(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="Rahul Sharma">Rahul Sharma (Head Captain)</option>
              <option value="Vikram Joshi">Vikram Joshi (Senior Steward)</option>
              <option value="Amit Deshmukh">Amit Deshmukh (Table Associate)</option>
              <option value="Pooja Rao">Pooja Rao (Order Associate)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter and Section Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
        {/* Section Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {(['All', 'Indoor AC', 'Barbeque Patio', 'Family Lounge', 'Quick Counter'] as const).map(
            (sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedSection === sec
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                {sec}
              </button>
            )
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 w-full sm:w-auto justify-end">
          <span>Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TableStatus | 'All')}
            className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="ordering">Taking Order</option>
            <option value="in_kitchen">In Kitchen</option>
            <option value="served">Food Served</option>
            <option value="billed">Billed</option>
          </select>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const activeOrder = orders.find(
            (o) => o.id === table.currentOrderId && o.status !== 'completed' && o.status !== 'cancelled'
          );

          return (
            <div
              key={table.id}
              className={`rounded-xl border transition-all duration-200 flex flex-col justify-between p-4 ${
                table.status === 'available'
                  ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  : 'bg-neutral-900 border-neutral-750 shadow-sm'
              }`}
            >
              <div>
                {/* Table Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">{table.number}</h3>
                      <span className="text-[11px] text-neutral-500 font-normal">
                        ({table.section})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Cap: {table.capacity}</span>
                      </span>
                      {table.guestCount && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-400 font-medium">
                            {table.guestCount} Guests
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${getStatusColor(
                      table.status
                    )}`}
                  >
                    {getStatusLabel(table.status)}
                  </span>
                </div>

                {/* Table Order Summary */}
                {activeOrder && (
                  <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Order {activeOrder.orderNumber}</span>
                      <span className="font-semibold text-emerald-400 tabular-nums">
                        ₹{activeOrder.total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 line-clamp-1">
                      {activeOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {table.assignedCaptain && (
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <span>Captain:</span>
                        <span className="text-neutral-300 font-medium">{table.assignedCaptain}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Table Actions */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center gap-2">
                {table.status === 'available' ? (
                  <button
                    onClick={() => {
                      setSeatingModalTable(table);
                      setGuestCountInput(Math.min(2, table.capacity));
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Seat & Take Order</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenCaptainPad(table)}
                      className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                      title="Open Waiter Tablet Ordering Pad"
                    >
                      <span>Take Order / KOT</span>
                    </button>

                    {activeOrder && (
                      <button
                        onClick={() => openPaymentModal(activeOrder.id)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors"
                        title="Collect Digital Payment / Settle Bill"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Bill</span>
                      </button>
                    )}

                    <button
                      onClick={() => resetTable(table.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Reset / Clean Table"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seat Guests Modal */}
      {seatingModalTable && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                Seat Table {seatingModalTable.number}
              </h3>
              <span className="text-xs text-neutral-400">
                Max {seatingModalTable.capacity} Pax
              </span>
            </div>

            <form onSubmit={handleSeatGuestsSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Guest Count
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={seatingModalTable.capacity + 2}
                    value={guestCountInput}
                    onChange={(e) => setGuestCountInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 tabular-nums"
                    required
                  />
                  <div className="flex gap-1">
                    {[2, 4, 6].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setGuestCountInput(num)}
                        className={`px-2.5 py-1.5 text-xs rounded-md border ${
                          guestCountInput === num
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-semibold'
                            : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Assigned Associate / Captain
                </label>
                <select
                  value={activeCaptain}
                  onChange={(e) => setActiveCaptain(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Rahul Sharma">Rahul Sharma</option>
                  <option value="Vikram Joshi">Vikram Joshi</option>
                  <option value="Amit Deshmukh">Amit Deshmukh</option>
                  <option value="Pooja Rao">Pooja Rao</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSeatingModalTable(null)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <span>Proceed to Digital Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
