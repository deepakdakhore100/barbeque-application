import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { InventoryItem } from '../../types/pos';
import {
  Boxes,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  TrendingDown,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

export const InventoryTrackingView: React.FC = () => {
  const { inventory, restockInventory, addInventoryItem } = usePOS();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restockModalItem, setRestockModalItem] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);

  // New Item State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Produce' as InventoryItem['category'],
    currentStock: 20,
    unit: 'kg' as InventoryItem['unit'],
    minThreshold: 10,
    costPerUnit: 50,
    supplier: 'APMC Market',
  });

  const lowStockItems = inventory.filter((i) => i.currentStock <= i.minThreshold);
  const totalValuation = inventory.reduce(
    (sum, item) => sum + item.currentStock * item.costPerUnit,
    0
  );

  const filteredInventory = inventory.filter((item) => {
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    restockInventory(restockModalItem.id, restockAmount);
    setRestockModalItem(null);
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    addInventoryItem({
      ...newItem,
      lastRestocked: timestamp,
    });
    setIsAddItemOpen(false);
    setNewItem({
      name: '',
      category: 'Produce',
      currentStock: 20,
      unit: 'kg',
      minThreshold: 10,
      costPerUnit: 50,
      supplier: 'APMC Market',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Tracked Raw Items</span>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {inventory.length} SKUs
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1 tabular-nums">
            {lowStockItems.length} items
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Estimated Inventory Value</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{totalValuation.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 font-medium">Auto Deduction</span>
            <div className="text-xs text-neutral-300 font-semibold mt-1">
              Active on KOT Dispatch
            </div>
          </div>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Raw SKU</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-neutral-900 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['All', 'Produce', 'Bakery', 'Dairy', 'Spices', 'Charcoal & Fuel'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 text-white text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-amber-500 placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-800/80 text-neutral-400 uppercase text-[11px] font-semibold border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Raw Ingredient / Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Min Threshold</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Primary Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {filteredInventory.map((item) => {
                const isCritical = item.currentStock <= item.minThreshold * 0.5;
                const isLow = item.currentStock <= item.minThreshold;

                return (
                  <tr key={item.id} className="hover:bg-neutral-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-neutral-400 tabular-nums">
                      {item.minThreshold} {item.unit}
                    </td>
                    <td className="py-3.5 px-4">
                      {isCritical ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Critical Low
                        </span>
                      ) : isLow ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Low Stock Warning
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          Normal Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400">
                      {item.supplier}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setRestockModalItem(item);
                          setRestockAmount(item.unit === 'pcs' ? 50 : 15);
                        }}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium rounded-lg text-xs border border-neutral-700 transition-colors inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Restock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Restock {restockModalItem.name}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Current stock: {restockModalItem.currentStock} {restockModalItem.unit}
            </p>

            <form onSubmit={handleRestockSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Quantity to Add ({restockModalItem.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 tabular-nums"
                  required
                />
              </div>

              <div className="flex gap-2">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setRestockAmount(amt)}
                    className="flex-1 py-1 text-xs rounded border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:border-amber-500"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New SKU Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add New Raw Inventory SKU</h3>

            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmiri Red Chili Powder"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value as InventoryItem['category'] })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Spices">Spices</option>
                    <option value="Charcoal & Fuel">Charcoal & Fuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value as InventoryItem['unit'] })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="kg">kg</option>
                    <option value="packets">packets</option>
                    <option value="blocks">blocks</option>
                    <option value="pcs">pcs</option>
                    <option value="liters">liters</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.currentStock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, currentStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.minThreshold}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minThreshold: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APMC Mandi or In-House"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
