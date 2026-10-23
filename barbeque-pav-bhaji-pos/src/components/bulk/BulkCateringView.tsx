import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { BulkCateringOrder, OrderItem } from '../../types/pos';
import {
  Truck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Layers,
  UtensilsCrossed,
  DollarSign,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const BulkCateringView: React.FC = () => {
  const {
    bulkOrders,
    createBulkOrder,
    updateBulkMilestone,
    updateBulkOrderStatus,
    openPaymentModal,
    setActiveView,
    calculateOrderTotals,
  } = usePOS();

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(
    bulkOrders[0]?.id || null
  );

  // New Bulk Order Form State
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'Corporate Event' as BulkCateringOrder['eventType'],
    eventDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    targetDeliveryTime: '13:00',
    guestPaxCount: 100,
    customerName: '',
    customerPhone: '',
    venueAddress: '',
    liveCounterRequired: true,
    chaffingDishesSupplied: true,
    cutleryIncluded: true,
    advanceDepositPaid: 5000,
    customRequirementsNotes: '',
    pavBhajiPlates: 100,
    tavaPulaoPlates: 50,
    gulabJamunPlates: 100,
  });

  const totalPax = bulkOrders.reduce((sum, b) => sum + b.guestPaxCount, 0);
  const totalAdvanceCollected = bulkOrders.reduce((sum, b) => sum + b.advanceDepositPaid, 0);
  const totalBalanceDue = bulkOrders.reduce((sum, b) => sum + b.balancePaymentDue, 0);

  // Dynamic ingredient requirement formula based on pax
  const calculateIngredientsRequired = (pax: number, pavBhajiCount: number, pulaoCount: number) => {
    return {
      potatoesKg: Math.round(pavBhajiCount * 0.25 * 10) / 10,
      tomatoesKg: Math.round(pavBhajiCount * 0.18 * 10) / 10,
      butterKg: Math.round((pavBhajiCount * 0.05 + pulaoCount * 0.03) * 10) / 10,
      ladiPavPacks: Math.ceil(pavBhajiCount * 1.2), // 1.2 pair packs per plate
      onionsKg: Math.round(pavBhajiCount * 0.15 * 10) / 10,
      lemonsPcs: Math.ceil(pavBhajiCount * 0.5),
      charcoalKg: Math.round((pavBhajiCount / 50) * 4 * 10) / 10,
    };
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const items: OrderItem[] = [
      {
        id: `oi_blk_${Date.now()}_1`,
        menuItemId: 'item_bbq_signature',
        name: 'Signature Barbeque Pav Bhaji (Bulk Catering)',
        price: 180,
        quantity: formData.pavBhajiPlates,
        customization: {
          spiceLevel: 'Medium',
          exclusions: [],
          butterPreference: 'Normal Butter',
          pavType: 'Standard Butter Pav',
        },
        itemStatus: 'pending',
      },
    ];

    if (formData.tavaPulaoPlates > 0) {
      items.push({
        id: `oi_blk_${Date.now()}_2`,
        menuItemId: 'item_barbeque_tava_pulao',
        name: 'Barbeque Special Tava Pulao (Bulk Catering)',
        price: 150,
        quantity: formData.tavaPulaoPlates,
        customization: {
          spiceLevel: 'Medium',
          exclusions: [],
          butterPreference: 'Normal Butter',
          pavType: 'Standard Butter Pav',
        },
        itemStatus: 'pending',
      });
    }

    if (formData.gulabJamunPlates > 0) {
      items.push({
        id: `oi_blk_${Date.now()}_3`,
        menuItemId: 'item_kesari_gulab_jamun',
        name: 'Royal Kesari Gulab Jamun (Bulk)',
        price: 50,
        quantity: formData.gulabJamunPlates,
        customization: {
          spiceLevel: 'Mild',
          exclusions: [],
          butterPreference: 'Normal Butter',
          pavType: 'Standard Butter Pav',
        },
        itemStatus: 'pending',
      });
    }

    createBulkOrder({
      eventName: formData.eventName,
      eventType: formData.eventType,
      eventDate: formData.eventDate,
      targetDeliveryTime: formData.targetDeliveryTime,
      guestPaxCount: formData.guestPaxCount,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      venueAddress: formData.venueAddress,
      liveCounterRequired: formData.liveCounterRequired,
      chaffingDishesSupplied: formData.chaffingDishesSupplied,
      cutleryIncluded: formData.cutleryIncluded,
      advanceDepositPaid: formData.advanceDepositPaid,
      customRequirementsNotes: formData.customRequirementsNotes,
      items,
    });

    setIsNewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero Visual Card */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl">
        <div className="h-48 sm:h-56 w-full relative">
          <img
            src="/src/assets/images/bulk_catering_setup_1792772501648.jpg"
            alt="Live Barbeque Pav Bhaji Catering Setup"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                Specialized Catering Division
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Bulk Orders & Live Counter Management
              </h2>
              <p className="text-xs text-neutral-300 max-w-xl mt-0.5">
                Full-scale catering execution for weddings, corporate galas, and parties with live smoking charcoal tawas, scheduled milestones, and dynamic raw ingredient calculations.
              </p>
            </div>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-98 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Book Bulk Catering Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Scheduled Bulk Events</span>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">
            {bulkOrders.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Total Guest Pax Booked</span>
          <div className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">
            {totalPax.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Advance Deposits Collected</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{totalAdvanceCollected.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium">Pending Balance on Delivery</span>
          <div className="text-2xl font-bold text-neutral-300 mt-1 tabular-nums">
            ₹{totalBalanceDue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Bulk Orders List */}
      <div className="space-y-4">
        {bulkOrders.map((order) => {
          const isExpanded = expandedOrder === order.id;
          const pbItem = order.items.find((i) => i.menuItemId.includes('bbq') || i.menuItemId.includes('bhaji'));
          const pulaoItem = order.items.find((i) => i.menuItemId.includes('pulao'));
          const pbCount = pbItem ? pbItem.quantity : order.guestPaxCount;
          const pulaoCount = pulaoItem ? pulaoItem.quantity : 0;

          const ingredients = calculateIngredientsRequired(order.guestPaxCount, pbCount, pulaoCount);

          return (
            <div
              key={order.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden transition-all shadow-md"
            >
              {/* Event Header Strip */}
              <div
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-850/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-white">
                      {order.eventName}
                    </span>
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-neutral-400 px-2 py-0.5 bg-neutral-800 rounded">
                      {order.eventType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-neutral-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="text-neutral-200">{order.eventDate}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Service: {order.targetDeliveryTime}</span>
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-amber-400">
                      Pax: {order.guestPaxCount} Guests
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="line-clamp-1">{order.venueAddress}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white tabular-nums">
                      ₹{order.total.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-400">
                      Adv: ₹{order.advanceDepositPaid.toLocaleString('en-IN')} | Due: ₹{order.balancePaymentDue.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button className="p-1 rounded-lg bg-neutral-800 text-neutral-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-950/40 space-y-5">
                  {/* Custom Catering Requirements Badges */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Custom Catering Specifications
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                        order.liveCounterRequired
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                          : 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
                      }`}>
                        <Flame className="w-4 h-4 shrink-0 text-amber-400" />
                        <div>
                          <div className="font-semibold">Live Smoking Tawa Counter</div>
                          <div className="text-[10px] text-neutral-400">Chef + Onsite Live Station</div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                        order.chaffingDishesSupplied
                          ? 'bg-blue-950/30 border-blue-500/40 text-blue-300'
                          : 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
                      }`}>
                        <Layers className="w-4 h-4 shrink-0 text-blue-400" />
                        <div>
                          <div className="font-semibold">Chafing Dishes & Food Warmers</div>
                          <div className="text-[10px] text-neutral-400">Stainless steel buffet gear</div>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                        order.cutleryIncluded
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
                      }`}>
                        <UtensilsCrossed className="w-4 h-4 shrink-0 text-emerald-400" />
                        <div>
                          <div className="font-semibold">Eco Biodegradable Cutlery</div>
                          <div className="text-[10px] text-neutral-400">Plates, spoons & napkins</div>
                        </div>
                      </div>
                    </div>

                    {order.customRequirementsNotes && (
                      <div className="mt-2 text-xs text-amber-300/90 bg-amber-950/20 border border-amber-900/40 p-2 rounded-lg">
                        Special Instructions: &ldquo;{order.customRequirementsNotes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Production Raw Material Calculator */}
                  <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                          Automated Production Raw Material Breakdown ({order.guestPaxCount} Pax)
                        </h4>
                      </div>
                      <span className="text-[11px] text-neutral-400">Calculated from recipe matrix</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-xs text-center">
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Potatoes</span>
                        <span className="font-bold text-white tabular-nums">{ingredients.potatoesKg} kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Tomatoes</span>
                        <span className="font-bold text-white tabular-nums">{ingredients.tomatoesKg} kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Amul Butter</span>
                        <span className="font-bold text-amber-400 tabular-nums">{ingredients.butterKg} kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Ladi Pav Packs</span>
                        <span className="font-bold text-white tabular-nums">{ingredients.ladiPavPacks} pkts</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Onions</span>
                        <span className="font-bold text-white tabular-nums">{ingredients.onionsKg} kg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">Lemons</span>
                        <span className="font-bold text-white tabular-nums">{ingredients.lemonsPcs} pcs</span>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-800/80 border border-neutral-750">
                        <span className="text-[10px] text-neutral-400 block">BBQ Charcoal</span>
                        <span className="font-bold text-orange-400 tabular-nums">{ingredients.charcoalKg} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Deadlines Tracker */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Event Milestone Deadlines & Checklist
                    </h4>
                    <div className="space-y-2">
                      {order.cateringMilestones.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => updateBulkMilestone(order.id, m.id, !m.completed)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            m.completed
                              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {m.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-neutral-500 shrink-0" />
                            )}
                            <span className={m.completed ? 'line-through text-neutral-400' : 'font-medium'}>
                              {m.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                            Due: {m.dueTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Settle */}
                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div className="text-xs text-neutral-400">
                      Client Contact: <span className="text-white font-medium">{order.customerName} ({order.customerPhone})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'draft' && (
                        <button
                          onClick={() => {
                            updateBulkOrderStatus(order.id, 'sent_to_kitchen');
                            alert(`Bulk Order ${order.orderNumber} dispatched to Kitchen Screen queue!`);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Dispatch to Kitchen KDS</span>
                        </button>
                      )}

                      {order.balancePaymentDue > 0 && (
                        <button
                          onClick={() => openPaymentModal(order.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Settle Balance (₹{order.balancePaymentDue.toLocaleString('en-IN')})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Bulk Order Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>Book New Bulk Catering Order</span>
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-neutral-300 font-medium mb-1">
                    Event Name / Client Organization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma Family Wedding Reception"
                    value={formData.eventName}
                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Event Type</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        eventType: e.target.value as BulkCateringOrder['eventType'],
                      })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Birthday Party">Birthday Party</option>
                    <option value="Festival Gathering">Festival Gathering</option>
                    <option value="House Party">House Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Guest Pax Count</label>
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    value={formData.guestPaxCount}
                    onChange={(e) => {
                      const pax = parseInt(e.target.value) || 50;
                      setFormData({
                        ...formData,
                        guestPaxCount: pax,
                        pavBhajiPlates: pax,
                        tavaPulaoPlates: Math.floor(pax * 0.5),
                        gulabJamunPlates: pax,
                      });
                    }}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Service Time</label>
                  <input
                    type="time"
                    required
                    value={formData.targetDeliveryTime}
                    onChange={(e) => setFormData({ ...formData, targetDeliveryTime: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Rajesh Sharma"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98200 00000"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-neutral-300 font-medium mb-1">Venue Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Full address with landmark"
                    value={formData.venueAddress}
                    onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Catering Requirements Checkboxes */}
              <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-750 space-y-2">
                <span className="font-semibold text-white block">Specialized Catering Needs:</span>
                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.liveCounterRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, liveCounterRequired: e.target.checked })
                    }
                    className="rounded bg-neutral-700 border-neutral-600 text-amber-500 focus:ring-0"
                  />
                  <span>Live Charcoal Smoking Tawa & Chef Onsite</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.chaffingDishesSupplied}
                    onChange={(e) =>
                      setFormData({ ...formData, chaffingDishesSupplied: e.target.checked })
                    }
                    className="rounded bg-neutral-700 border-neutral-600 text-amber-500 focus:ring-0"
                  />
                  <span>Buffet Chafing Dishes & Food Warmers</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cutleryIncluded}
                    onChange={(e) =>
                      setFormData({ ...formData, cutleryIncluded: e.target.checked })
                    }
                    className="rounded bg-neutral-700 border-neutral-600 text-amber-500 focus:ring-0"
                  />
                  <span>Eco Biodegradable Cutlery, Spoons & Plates</span>
                </label>
              </div>

              {/* Advance Deposit */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Advance Deposit Collected (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.advanceDepositPaid}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      advanceDepositPaid: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Custom Requirements & Deadlines Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 20 plates pure Jain separated, live service sharp at 13:00"
                  value={formData.customRequirementsNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, customRequirementsNotes: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg shadow-sm"
                >
                  Confirm & Schedule Bulk Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
