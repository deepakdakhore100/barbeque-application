import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { OnlineOrder } from '../../types/pos';
import {
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Bike,
  Sparkles,
  AlertCircle,
  Send,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const OnlineOrderHub: React.FC = () => {
  const {
    onlineOrders,
    approveOnlineOrder,
    rejectOnlineOrder,
    markOnlineDispatched,
    simulateIncomingZomatoOrder,
    setActiveView,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<
    'pending' | 'in_kitchen' | 'ready_dispatch' | 'all'
  >('pending');
  const [rejectingOrder, setRejectingOrder] = useState<OnlineOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Kitchen at peak capacity');

  const pendingOrders = onlineOrders.filter((o) => o.approvalStatus === 'pending');
  const inKitchenOrders = onlineOrders.filter(
    (o) =>
      o.approvalStatus === 'approved' &&
      (o.status === 'sent_to_kitchen' || o.status === 'kitchen_preparing')
  );
  const readyToDispatchOrders = onlineOrders.filter(
    (o) => o.status === 'ready_to_dispatch'
  );
  const completedOrders = onlineOrders.filter((o) => o.status === 'dispatched');

  const displayedOrders = () => {
    switch (activeTab) {
      case 'pending':
        return pendingOrders;
      case 'in_kitchen':
        return inKitchenOrders;
      case 'ready_dispatch':
        return readyToDispatchOrders;
      case 'all':
      default:
        return onlineOrders;
    }
  };

  const handleApprove = (orderId: string) => {
    approveOnlineOrder(orderId);
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;
    rejectOnlineOrder(rejectingOrder.id, rejectReason);
    setRejectingOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Zomato & Online Order Dispatch Hub
              </h2>
              <span className="text-xs bg-rose-500/20 text-rose-400 font-semibold px-2 py-0.5 rounded border border-rose-500/30">
                Owner Gatekeeper Mode
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Online orders require owner approval before sending to kitchen screen. Ready items are assigned delivery partner OTP.
            </p>
          </div>
        </div>

        {/* Action: Simulate Incoming Order */}
        <button
          onClick={simulateIncomingZomatoOrder}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-98 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulate Incoming Zomato Order</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Pending Owner Approval</span>
          {pendingOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse tabular-nums">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('in_kitchen')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'in_kitchen'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>In Kitchen Prep</span>
          <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 text-[10px] tabular-nums">
            {inKitchenOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ready_dispatch')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'ready_dispatch'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>Ready for Pickup & Dispatch</span>
          {readyToDispatchOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold tabular-nums">
              {readyToDispatchOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>All History ({onlineOrders.length})</span>
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders().length === 0 ? (
        <div className="py-16 text-center bg-neutral-900 border border-neutral-800 rounded-xl">
          <CheckCircle className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-300">No orders in this queue</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Tap &ldquo;Simulate Incoming Zomato Order&rdquo; above to test order injection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedOrders().map((order) => {
            const isPendingApproval = order.approvalStatus === 'pending';
            const isReadyForPickup = order.status === 'ready_to_dispatch';
            const isCooking =
              order.status === 'sent_to_kitchen' || order.status === 'kitchen_preparing';

            return (
              <div
                key={order.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all bg-neutral-900 ${
                  isPendingApproval
                    ? 'border-rose-500/40 ring-1 ring-rose-500/20 shadow-md'
                    : isReadyForPickup
                    ? 'border-emerald-500/40 shadow-sm'
                    : 'border-neutral-800'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ({order.platformOrderId})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                        <span className="text-rose-400 font-semibold">{order.onlinePlatform}</span>
                        <span>·</span>
                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span className="text-neutral-300">{order.estimatedDeliveryTime}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPendingApproval ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500 text-white animate-pulse">
                          Awaiting Approval
                        </span>
                      ) : isReadyForPickup ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                          Food Ready for Rider
                        </span>
                      ) : isCooking ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400">
                          Cooking in Kitchen
                        </span>
                      ) : order.status === 'dispatched' ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          Handed to Delivery Rider
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-rose-950 text-rose-400">
                          Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="py-3 border-b border-neutral-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="font-semibold">{order.customerName}</span>
                      <span className="text-neutral-400 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{order.customerPhone}</span>
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-neutral-400 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.deliveryAddress}</span>
                    </div>

                    {order.specialInstructions && (
                      <div className="text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 p-1.5 rounded font-medium">
                        Customer instruction: &ldquo;{order.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="py-3 space-y-2 text-xs">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white">
                            <span className="text-amber-400 mr-1.5 font-bold tabular-nums">
                              {item.quantity}x
                            </span>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <span className="text-orange-400">🌶️ {item.customization.spiceLevel}</span>
                            <span>·</span>
                            <span>{item.customization.butterPreference}</span>
                            {item.customization.exclusions.length > 0 && (
                              <span className="text-rose-400">
                                · Excl: {item.customization.exclusions.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-neutral-300 tabular-nums font-mono">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Total */}
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Total Net Value:</span>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums font-mono">
                      ₹{order.total.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Delivery Partner OTP & Details (if ready or in dispatch) */}
                  {(isReadyForPickup || order.status === 'dispatched') && (
                    <div className="mt-3 p-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rider: {order.deliveryPartnerName}</span>
                        </span>
                        {order.pickupOtp && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-mono font-bold text-xs">
                            OTP: {order.pickupOtp}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Vehicle: {order.deliveryVehicle || 'Delivery Motorcycle'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-2">
                  {isPendingApproval && (
                    <>
                      <button
                        onClick={() => handleApprove(order.id)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>APPROVE & ROUTE TO KITCHEN</span>
                      </button>
                      <button
                        onClick={() => setRejectingOrder(order)}
                        className="py-2 px-3 bg-neutral-800 hover:bg-rose-900/40 text-neutral-300 hover:text-rose-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isCooking && (
                    <div className="w-full flex items-center justify-between text-xs text-amber-400 py-1 px-2 rounded bg-amber-950/20 border border-amber-900/30">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Displaying on Kitchen Screen (Chef prepping)</span>
                      </span>
                      <button
                        onClick={() => setActiveView('kitchen_kds')}
                        className="text-[11px] text-white hover:underline flex items-center gap-0.5"
                      >
                        <span>View KDS</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {isReadyForPickup && (
                    <button
                      onClick={() => markOnlineDispatched(order.id)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>VERIFY OTP & DISPATCH TO RIDER</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Order Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Reject Online Order {rejectingOrder.orderNumber}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Specify the rejection reason that will be transmitted back to Zomato.
            </p>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Reason for rejection
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Kitchen at peak capacity">Kitchen at peak capacity</option>
                  <option value="Item ingredients out of stock">Item ingredients out of stock</option>
                  <option value="Closing time reached">Closing time reached</option>
                  <option value="Delivery radius unreachable">Delivery radius unreachable</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRejectingOrder(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
