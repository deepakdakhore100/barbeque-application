import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, PaymentDetails } from '../../types/pos';
import {
  QrCode,
  CreditCard,
  Banknote,
  Users,
  Printer,
  CheckCircle,
  X,
  Percent,
  Receipt,
  Sparkles,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    activePaymentOrderId,
    closePaymentModal,
    getOrderById,
    recordPayment,
  } = usePOS();

  if (!activePaymentOrderId) return null;

  const order = getOrderById(activePaymentOrderId);
  if (!order) return null;

  const [paymentMode, setPaymentMode] = useState<PaymentDetails['method']>('UPI_QR');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);

  // Cash calculations
  const [cashTendered, setCashTendered] = useState<number>(order.total);

  // Split bill calculations
  const [splitCount, setSplitCount] = useState<number>(2);

  // Applied discounts
  const discountAmount = Math.round((order.subtotal * discountPercent) / 100);
  const netSubtotal = Math.max(0, order.subtotal - discountAmount);
  const netTax = Math.round(netSubtotal * 0.05 * 100) / 100;
  const netTotal = Math.round((netSubtotal + netTax) * 100) / 100;

  const cashChange = Math.max(0, cashTendered - netTotal);
  const splitPerPerson = Math.ceil((netTotal / splitCount) * 100) / 100;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'FLAT10') {
      setDiscountPercent(10);
      setPromoApplied('10% Flat Discount applied');
    } else if (code === 'CORPORATE15') {
      setDiscountPercent(15);
      setPromoApplied('15% Corporate Discount applied');
    } else if (code === 'WELCOME50') {
      setDiscountPercent(5);
      setPromoApplied('5% First-time guest discount');
    } else {
      alert('Invalid Promo Code. Try "FLAT10" or "CORPORATE15"');
    }
  };

  const handleCompletePayment = () => {
    const paymentDetails: PaymentDetails = {
      method: paymentMode,
      paidAt: new Date().toISOString(),
      amountPaid: netTotal,
      transactionId: `TXN_${Date.now()}`,
      cashTendered: paymentMode === 'CASH' ? cashTendered : undefined,
      changeGiven: paymentMode === 'CASH' ? cashChange : undefined,
      splitDetails:
        paymentMode === 'SPLIT'
          ? {
              splitCount,
              amountPerPerson: splitPerPerson,
            }
          : undefined,
    };

    recordPayment(order.id, paymentDetails);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left Side: Payment Configuration (60%) */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto scrollbar-thin space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Cashier Settle Terminal
              </span>
              <h2 className="text-lg font-bold text-white">
                Payment Collection: {order.orderNumber}
              </h2>
            </div>
            <button
              onClick={closePaymentModal}
              className="p-1 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('UPI_QR')}
                className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMode === 'UPI_QR'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-neutral-800/60 border-neutral-750 text-neutral-400 hover:text-white'
                }`}
              >
                <QrCode className="w-5 h-5 text-amber-400" />
                <span>UPI / Dynamic QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMode === 'CASH'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-neutral-800/60 border-neutral-750 text-neutral-400 hover:text-white'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span>Cash Drawer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CARD')}
                className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMode === 'CARD'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-neutral-800/60 border-neutral-750 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span>Credit / Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('SPLIT')}
                className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMode === 'SPLIT'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                    : 'bg-neutral-800/60 border-neutral-750 text-neutral-400 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Split Equal Bill</span>
              </button>
            </div>
          </div>

          {/* Mode-Specific Panels */}
          {paymentMode === 'UPI_QR' && (
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-750 flex flex-col items-center text-center space-y-3">
              <span className="text-xs font-semibold text-neutral-300">
                Scan with any UPI App (GPay / PhonePe / Paytm)
              </span>

              {/* Dynamic Simulated Interactive UPI QR */}
              <div className="p-3 bg-white rounded-xl shadow-md border-4 border-amber-500">
                <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                  {/* Outer corner squares */}
                  <rect x="5" y="5" width="26" height="26" fill="#000" />
                  <rect x="9" y="9" width="18" height="18" fill="#fff" />
                  <rect x="13" y="13" width="10" height="10" fill="#000" />

                  <rect x="69" y="5" width="26" height="26" fill="#000" />
                  <rect x="73" y="9" width="18" height="18" fill="#fff" />
                  <rect x="77" y="13" width="10" height="10" fill="#000" />

                  <rect x="5" y="69" width="26" height="26" fill="#000" />
                  <rect x="9" y="73" width="18" height="18" fill="#fff" />
                  <rect x="13" y="77" width="10" height="10" fill="#000" />

                  {/* QR Data Matrix grid simulation */}
                  <rect x="36" y="8" width="6" height="6" fill="#000" />
                  <rect x="46" y="8" width="8" height="6" fill="#000" />
                  <rect x="36" y="18" width="6" height="6" fill="#000" />
                  <rect x="50" y="20" width="12" height="6" fill="#000" />

                  <rect x="8" y="38" width="6" height="6" fill="#000" />
                  <rect x="18" y="38" width="6" height="6" fill="#000" />
                  <rect x="28" y="38" width="8" height="6" fill="#000" />
                  <rect x="42" y="36" width="14" height="14" fill="#E65100" rx="3" />
                  <rect x="62" y="38" width="6" height="6" fill="#000" />
                  <rect x="76" y="38" width="16" height="6" fill="#000" />

                  <rect x="8" y="48" width="12" height="6" fill="#000" />
                  <rect x="24" y="48" width="6" height="6" fill="#000" />
                  <rect x="64" y="48" width="12" height="6" fill="#000" />
                  <rect x="82" y="48" width="10" height="6" fill="#000" />

                  <rect x="36" y="68" width="10" height="6" fill="#000" />
                  <rect x="52" y="68" width="6" height="6" fill="#000" />
                  <rect x="66" y="68" width="14" height="6" fill="#000" />
                  <rect x="84" y="68" width="8" height="6" fill="#000" />

                  <rect x="36" y="80" width="16" height="6" fill="#000" />
                  <rect x="58" y="80" width="6" height="6" fill="#000" />
                  <rect x="70" y="80" width="22" height="6" fill="#000" />
                </svg>
              </div>

              <div className="text-xs text-neutral-300">
                VPA: <span className="font-mono font-bold text-amber-400">barbequepavbhaji@okaxis</span>
              </div>
              <div className="text-base font-extrabold text-emerald-400 tabular-nums font-mono">
                Amount: ₹{netTotal.toLocaleString('en-IN')}
              </div>
            </div>
          )}

          {paymentMode === 'CASH' && (
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-750 space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Cash Tendered by Customer (₹)
                </label>
                <input
                  type="number"
                  min={netTotal}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-base font-mono font-bold tabular-nums focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex gap-2">
                {[netTotal, 500, 1000, 2000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setCashTendered(amt)}
                    className="flex-1 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:border-amber-500 font-mono text-xs tabular-nums"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-750 flex items-center justify-between">
                <span className="text-neutral-400">Change Due to Customer:</span>
                <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                  ₹{cashChange.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {paymentMode === 'CARD' && (
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-750 space-y-2 text-xs">
              <span className="font-semibold text-neutral-300 block">
                PineLabs EDC Card Swiper Connected
              </span>
              <p className="text-neutral-400 text-[11px]">
                Please insert or tap customer Visa, Mastercard, or RuPay card on POS swipe machine.
              </p>
              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700 flex items-center justify-between font-mono">
                <span className="text-neutral-400">TERMINAL STATUS:</span>
                <span className="text-emerald-400 font-bold">READY FOR TAP / PIN</span>
              </div>
            </div>
          )}

          {paymentMode === 'SPLIT' && (
            <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-750 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-300">
                  Number of Persons Splitting
                </span>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setSplitCount(num)}
                      className={`w-7 h-7 rounded-lg border text-xs font-bold transition-colors ${
                        splitCount === num
                          ? 'bg-amber-500 text-neutral-950 border-amber-500'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-700 flex items-center justify-between font-mono">
                <span className="text-neutral-400">Each Person Pays:</span>
                <span className="text-base font-bold text-amber-400 tabular-nums">
                  ₹{splitPerPerson.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Discount / Promo Code */}
          <form onSubmit={handleApplyPromo} className="flex gap-2 text-xs">
            <div className="relative flex-1">
              <Percent className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Discount Code (e.g. FLAT10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium rounded-lg transition-colors border border-neutral-700"
            >
              Apply Promo
            </button>
          </form>

          {promoApplied && (
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{promoApplied}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-neutral-750 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill (POS-58)</span>
            </button>

            <button
              type="button"
              onClick={handleCompletePayment}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-all active:scale-98"
            >
              <CheckCircle className="w-4 h-4" />
              <span>CONFIRM & SETTLE (₹{netTotal.toLocaleString('en-IN')})</span>
            </button>
          </div>
        </div>

        {/* Right Side: Thermal Bill Preview (40%) */}
        <div className="p-5 md:p-6 bg-neutral-950 border-t md:border-t-0 md:border-l border-neutral-800 w-full md:w-80 flex flex-col justify-between overflow-y-auto scrollbar-thin">
          <div className="font-mono text-neutral-300 text-xs space-y-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
            {/* Bill Header */}
            <div className="text-center pb-2 border-b border-dashed border-neutral-700">
              <div className="font-bold text-white tracking-wider text-sm flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>BARBEQUE PAV BHAJI</span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Signature Charcoal Smoky Pav Bhaji
              </div>
              <div className="text-[10px] text-neutral-500">
                GSTIN: 27AABCB1234F1Z8
              </div>
              <div className="text-[10px] text-neutral-500">
                FSSAI Lic: 11521019000124
              </div>
            </div>

            {/* Meta */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-neutral-700 pb-2">
              <div className="flex justify-between">
                <span>Bill No: {order.orderNumber}</span>
                <span>Type: {order.type.toUpperCase()}</span>
              </div>
              {order.tableNumber && (
                <div className="flex justify-between">
                  <span>Table: {order.tableNumber}</span>
                  <span>Capt: {order.captainName || 'Associate'}</span>
                </div>
              )}
              <div className="text-neutral-500">
                {new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-1.5 border-b border-dashed border-neutral-700 pb-2">
              {order.items.map((item) => (
                <div key={item.id} className="text-[11px]">
                  <div className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="tabular-nums">₹{item.price * item.quantity}</span>
                  </div>
                  <div className="text-[9px] text-neutral-400 pl-3">
                    [{item.customization.spiceLevel} · {item.customization.butterPreference}
                    {item.customization.exclusions.length > 0 && ` · No ${item.customization.exclusions.join('/')}`}]
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Math */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums">₹{order.subtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Promo Discount ({discountPercent}%):</span>
                  <span className="tabular-nums">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span className="tabular-nums">₹{Math.round((netTax / 2) * 100) / 100}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span className="tabular-nums">₹{Math.round((netTax / 2) * 100) / 100}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-neutral-700">
                <span>GRAND TOTAL:</span>
                <span className="text-emerald-400 tabular-nums">₹{netTotal}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-neutral-500 pt-2 border-t border-dashed border-neutral-700">
              Thank You! Visit Again For The Smokiest Pav Bhaji in Town.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
