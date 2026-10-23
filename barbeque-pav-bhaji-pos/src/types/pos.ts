export type TableStatus = 'available' | 'seated' | 'ordering' | 'in_kitchen' | 'served' | 'billed' | 'paid';

export type TableSection = 'Indoor AC' | 'Barbeque Patio' | 'Family Lounge' | 'Quick Counter';

export interface Table {
  id: string;
  number: string;
  section: TableSection;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  seatedAt?: string;
  guestCount?: number;
  assignedCaptain?: string;
}

export type SpiceLevel = 'Mild' | 'Medium' | 'Spicy' | 'Kolhapuri Fiery';

export interface MenuItemCustomization {
  spiceLevel: SpiceLevel;
  exclusions: string[]; // e.g. "No Onion (Jain)", "No Garlic", "Less Butter"
  butterPreference: 'Normal Butter' | 'Extra Amul Butter' | 'Less Butter' | 'No Butter';
  pavType: 'Standard Butter Pav' | 'Kadak Crispy Pav' | 'Wheat / Brown Pav' | 'Masala Pav';
  specialNotes?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Barbeque Specials' | 'Cheese & Gourmet' | 'Tava Pulao & Rice' | 'Pav & Accompaniments' | 'Starters & Sides' | 'Beverages & Desserts';
  price: number;
  description: string;
  image: string;
  isVeg: boolean;
  isJainAvailable: boolean;
  preparationTimeMinutes: number;
  station: 'Tawa Griddle' | 'Pav Grill' | 'Fryer & Sides' | 'Beverages';
  inventoryImpact: {
    ingredientId: string;
    amount: number;
  }[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  customization: MenuItemCustomization;
  itemStatus: 'pending' | 'preparing' | 'ready' | 'served';
}

export type OrderType = 'in_dine' | 'online_zomato' | 'bulk_catering' | 'takeaway';

export type OrderStatus =
  | 'draft'
  | 'awaiting_approval' // Online Zomato
  | 'sent_to_kitchen'
  | 'kitchen_preparing'
  | 'food_ready'
  | 'ready_to_dispatch' // Delivery / Pickup
  | 'dispatched'
  | 'served'
  | 'billed'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // e.g. #ORD-1042
  type: OrderType;
  tableId?: string;
  tableNumber?: string;
  captainName?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  tax: number; // 5% GST
  discount: number;
  serviceCharge: number;
  total: number;
  kotFiredAt?: string;
  kitchenAcknowledgedAt?: string;
  kitchenReadyAt?: string;
  paymentDetails?: PaymentDetails;
  specialInstructions?: string;
}

export interface PaymentDetails {
  method: 'UPI_QR' | 'CASH' | 'CARD' | 'SPLIT';
  transactionId?: string;
  paidAt: string;
  amountPaid: number;
  cashTendered?: number;
  changeGiven?: number;
  splitDetails?: {
    splitCount: number;
    amountPerPerson: number;
  };
}

export interface OnlineOrder extends Order {
  onlinePlatform: 'Zomato' | 'Swiggy' | 'Direct Delivery';
  platformOrderId: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  deliveryVehicle?: string;
  pickupOtp?: string;
  estimatedDeliveryTime?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  deliveryAddress: string;
}

export interface BulkCateringOrder extends Order {
  eventName: string; // e.g. "Mehta Family Wedding Reception"
  eventType: 'Wedding' | 'Corporate Event' | 'Birthday Party' | 'Festival Gathering' | 'House Party';
  eventDate: string; // YYYY-MM-DD
  targetDeliveryTime: string; // e.g. "19:30"
  guestPaxCount: number;
  venueAddress: string;
  liveCounterRequired: boolean;
  chaffingDishesSupplied: boolean;
  cutleryIncluded: boolean;
  advanceDepositPaid: number;
  balancePaymentDue: number;
  cateringMilestones: {
    id: string;
    title: string;
    dueTime: string;
    completed: boolean;
  }[];
  customRequirementsNotes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Bakery' | 'Produce' | 'Dairy' | 'Spices' | 'Charcoal & Fuel';
  currentStock: number;
  unit: 'kg' | 'packets' | 'blocks' | 'pcs' | 'liters';
  minThreshold: number;
  costPerUnit: number;
  supplier: string;
  lastRestocked: string;
}

export type ActiveAppView =
  | 'cashier_pos'
  | 'captain_tablet'
  | 'kitchen_kds'
  | 'online_zomato'
  | 'bulk_catering'
  | 'inventory'
  | 'analytics';
