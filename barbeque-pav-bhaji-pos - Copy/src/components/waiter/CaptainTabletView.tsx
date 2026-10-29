import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  MenuItem,
  OrderItem,
  SpiceLevel,
  MenuItemCustomization,
  Table,
} from '../../types/pos';
import {
  Flame,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Receipt,
  Users,
  Check,
  Sparkles,
  Info,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export const CaptainTabletView: React.FC = () => {
  const {
    tables,
    menuItems,
    orders,
    activeTableId,
    setActiveTableId,
    activeCaptain,
    saveInDineOrderAndFireKOT,
    openPaymentModal,
    setActiveView,
    calculateOrderTotals,
  } = usePOS();

  // If activeTableId is not set or table is available, default to first active or first table
  const selectedTable: Table =
    tables.find((t) => t.id === activeTableId) || tables[0];

  // Active in-progress order items for this handheld session
  const existingOrder = orders.find(
    (o) => o.id === selectedTable.currentOrderId && o.status !== 'completed' && o.status !== 'cancelled'
  );

  const [cartItems, setCartItems] = useState<OrderItem[]>(() => {
    return existingOrder ? [...existingOrder.items] : [];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    existingOrder?.specialInstructions || ''
  );

  // Customization modal state
  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [customSpiceLevel, setCustomSpiceLevel] = useState<SpiceLevel>('Medium');
  const [customButter, setCustomButter] = useState<MenuItemCustomization['butterPreference']>('Normal Butter');
  const [customPav, setCustomPav] = useState<MenuItemCustomization['pavType']>('Standard Butter Pav');
  const [customExclusions, setCustomExclusions] = useState<string[]>([]);
  const [customSpecialNotes, setCustomSpecialNotes] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    'All',
    'Barbeque Specials',
    'Cheese & Gourmet',
    'Tava Pulao & Rice',
    'Pav & Accompaniments',
    'Starters & Sides',
    'Beverages & Desserts',
  ];

  const handleOpenCustomization = (item: MenuItem) => {
    setActiveCustomizingItem(item);
    setCustomSpiceLevel('Medium');
    setCustomButter('Normal Butter');
    setCustomPav('Standard Butter Pav');
    setCustomExclusions([]);
    setCustomSpecialNotes('');
    setCustomQuantity(1);
  };

  const toggleExclusion = (exclusion: string) => {
    if (customExclusions.includes(exclusion)) {
      setCustomExclusions(customExclusions.filter((e) => e !== exclusion));
    } else {
      setCustomExclusions([...customExclusions, exclusion]);
    }
  };

  const handleAddToCart = () => {
    if (!activeCustomizingItem) return;

    let finalPrice = activeCustomizingItem.price;
    if (customButter === 'Extra Amul Butter') finalPrice += 20;
    if (customPav === 'Masala Pav') finalPrice += 25;

    const newItem: OrderItem = {
      id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: activeCustomizingItem.id,
      name: activeCustomizingItem.name,
      price: finalPrice,
      quantity: customQuantity,
      customization: {
        spiceLevel: customSpiceLevel,
        exclusions: customExclusions,
        butterPreference: customButter,
        pavType: customPav,
        specialNotes: customSpecialNotes.trim() ? customSpecialNotes.trim() : undefined,
      },
      itemStatus: 'pending',
    };

    setCartItems((prev) => [...prev, newItem]);
    setActiveCustomizingItem(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const { subtotal, tax, total } = calculateOrderTotals(cartItems);

  const handleFireKOT = () => {
    if (cartItems.length === 0) return;
    const orderId = saveInDineOrderAndFireKOT(selectedTable.id, cartItems, specialInstructions);
    if (orderId) {
      alert(`KOT Ticket sent successfully to Kitchen Screen for Table ${selectedTable.number}!`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Cols: Tablet Order Punch Screen */}
      <div className="lg:col-span-8 space-y-4">
        {/* Device Header Strip */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('cashier_pos')}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Back to Floor View"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                  Associate Tablet Terminal
                </span>
                <span className="text-neutral-500 text-xs">·</span>
                <span className="text-xs text-neutral-400">Capt. {activeCaptain}</span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Table:
                <select
                  value={selectedTable.id}
                  onChange={(e) => {
                    setActiveTableId(e.target.value);
                    const matchingOrder = orders.find(
                      (o) => o.tableId === e.target.value && o.status !== 'completed' && o.status !== 'cancelled'
                    );
                    setCartItems(matchingOrder ? [...matchingOrder.items] : []);
                    setSpecialInstructions(matchingOrder?.specialInstructions || '');
                  }}
                  className="bg-neutral-800 border border-neutral-700 text-amber-400 font-bold px-2 py-0.5 rounded-md focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.section}) - {t.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </h2>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Pav Bhaji, Pulao..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 text-white text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500 placeholder-neutral-500"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenCustomization(item)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-amber-500/50 cursor-pointer transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md"
            >
              {/* Food Thumbnail */}
              <div className="relative h-32 w-full overflow-hidden bg-neutral-800">
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded border border-emerald-500 bg-neutral-900/90 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {item.isJainAvailable && (
                    <span className="text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded">
                      Jain Avail.
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{item.preparationTimeMinutes}m</span>
                </div>
              </div>

              {/* Item Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-snug">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white tabular-nums">
                    ₹{item.price}
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-1 bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-neutral-950 text-xs font-semibold rounded-md border border-amber-500/30 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Customize</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 4 Cols: Live Table Cart & KOT Action */}
      <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sticky top-20 shadow-xl space-y-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Table {selectedTable.number}
              </h3>
              <span className="text-xs text-neutral-400">({selectedTable.section})</span>
            </div>
            <div className="text-[11px] text-neutral-500">
              {cartItems.length} items in order basket
            </div>
          </div>
          {existingOrder && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono">
              {existingOrder.orderNumber}
            </span>
          )}
        </div>

        {/* Cart Items List */}
        <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              <Info className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
              <span>No items added yet.</span>
              <p className="text-[11px] mt-1 text-neutral-600">
                Tap any menu item to configure spice level & exclusions.
              </p>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-neutral-800/80 border border-neutral-750 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-200">{item.name}</h4>
                    <span className="text-neutral-400 tabular-nums">
                      ₹{item.price} each
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateCartQty(index, -1)}
                      className="w-5 h-5 rounded bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateCartQty(index, 1)}
                      className="w-5 h-5 rounded bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveFromCart(index)}
                      className="ml-1 text-neutral-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Customization Badges */}
                <div className="text-[11px] text-amber-400/90 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="font-medium text-orange-400">
                    🌶️ {item.customization.spiceLevel}
                  </span>
                  <span>·</span>
                  <span>{item.customization.butterPreference}</span>
                  {item.customization.pavType !== 'Standard Butter Pav' && (
                    <>
                      <span>·</span>
                      <span className="text-yellow-400">{item.customization.pavType}</span>
                    </>
                  )}
                  {item.customization.exclusions.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-400">
                        {item.customization.exclusions.join(', ')}
                      </span>
                    </>
                  )}
                </div>

                {item.customization.specialNotes && (
                  <div className="text-[10px] text-neutral-400 italic">
                    Note: &ldquo;{item.customization.specialNotes}&rdquo;
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Special Instructions Input */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 mb-1">
            General Kitchen Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Serve Bhaji first, Pulao afterwards"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 text-xs rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Financial Breakdown */}
        <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Item Subtotal:</span>
            <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>GST (5% SGST + CGST):</span>
            <span className="tabular-nums">₹{tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-neutral-800">
            <span>Net Payable:</span>
            <span className="text-emerald-400 tabular-nums">
              ₹{total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Handheld Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleFireKOT}
            disabled={cartItems.length === 0}
            className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
              cartItems.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md active:scale-98'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>SEND TO KITCHEN (FIRE KOT)</span>
          </button>

          {existingOrder && (
            <button
              onClick={() => openPaymentModal(existingOrder.id)}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Collect Digital Payment (POS Bill)</span>
            </button>
          )}
        </div>
      </div>

      {/* Item Customization Modal */}
      {activeCustomizingItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeCustomizingItem.name}
                </h3>
                <span className="text-xs text-amber-400 font-semibold tabular-nums">
                  Base Price: ₹{activeCustomizingItem.price}
                </span>
              </div>
              <button
                onClick={() => setActiveCustomizingItem(null)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Spice Level Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Spice Level (Teekha)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Mild', 'Medium', 'Spicy', 'Kolhapuri Fiery'] as SpiceLevel[]).map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setCustomSpiceLevel(level)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center justify-between transition-colors ${
                      customSpiceLevel === level
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'border-neutral-800 bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{level}</span>
                    {customSpiceLevel === level && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Butter Preference */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                Amul Butter Preference
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'Normal Butter',
                    'Extra Amul Butter',
                    'Less Butter',
                    'No Butter',
                  ] as MenuItemCustomization['butterPreference'][]
                ).map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => setCustomButter(b)}
                    className={`py-1.5 px-2.5 text-xs rounded-lg border text-left flex items-center justify-between transition-colors ${
                      customButter === b
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'border-neutral-800 bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{b}</span>
                    {b === 'Extra Amul Butter' && (
                      <span className="text-[10px] text-amber-500">+₹20</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pav Type */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                Pav Style Selection
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'Standard Butter Pav',
                    'Kadak Crispy Pav',
                    'Wheat / Brown Pav',
                    'Masala Pav',
                  ] as MenuItemCustomization['pavType'][]
                ).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setCustomPav(p)}
                    className={`py-1.5 px-2.5 text-xs rounded-lg border text-left flex items-center justify-between transition-colors ${
                      customPav === p
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'border-neutral-800 bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{p}</span>
                    {p === 'Masala Pav' && (
                      <span className="text-[10px] text-amber-500">+₹25</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredient Exclusions (Jain, No garlic, etc.) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                Exclusions & Dietary Restrictions
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'No Onion (Jain)',
                  'No Garlic',
                  'Less Butter (Health)',
                  'Extra Lemon & Chili',
                  'No Coriander',
                ].map((exclusion) => {
                  const isChecked = customExclusions.includes(exclusion);
                  return (
                    <button
                      type="button"
                      key={exclusion}
                      onClick={() => toggleExclusion(exclusion)}
                      className={`py-1 px-2 text-[11px] rounded border text-left flex items-center gap-1.5 transition-colors ${
                        isChecked
                          ? 'bg-rose-950/40 border-rose-600 text-rose-300 font-medium'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded flex items-center justify-center text-[10px] border ${
                        isChecked ? 'border-rose-500 bg-rose-500 text-white' : 'border-neutral-600'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                      <span>{exclusion}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chef Preparation Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Special Kitchen Note
              </label>
              <input
                type="text"
                placeholder="e.g. Mash bhaji very smooth, pav extra roasted"
                value={customSpecialNotes}
                onChange={(e) => setCustomSpecialNotes(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-xs rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quantity Selector & Add Button */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Quantity:</span>
                <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-1 border border-neutral-700">
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-6 h-6 rounded bg-neutral-700 text-white flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-white text-xs tabular-nums">
                    {customQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-6 h-6 rounded bg-neutral-700 text-white flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCustomizingItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg shadow-sm"
                >
                  Add to Table Basket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
