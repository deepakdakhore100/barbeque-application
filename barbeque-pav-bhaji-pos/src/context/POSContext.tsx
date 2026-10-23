import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ActiveAppView,
  Table,
  MenuItem,
  Order,
  OnlineOrder,
  BulkCateringOrder,
  InventoryItem,
  PaymentDetails,
  OrderStatus,
  OrderItem,
} from '../types/pos';
import {
  INITIAL_MENU_ITEMS,
  INITIAL_TABLES,
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  INITIAL_ONLINE_ORDERS,
  INITIAL_BULK_ORDERS,
} from '../data/initialData';
import { soundEffects } from '../utils/audioAlert';

interface POSContextType {
  activeView: ActiveAppView;
  setActiveView: (view: ActiveAppView) => void;
  tables: Table[];
  menuItems: MenuItem[];
  orders: Order[];
  onlineOrders: OnlineOrder[];
  bulkOrders: BulkCateringOrder[];
  inventory: InventoryItem[];
  activeTableId: string | null;
  setActiveTableId: (id: string | null) => void;
  activeCaptain: string;
  setActiveCaptain: (name: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activePaymentOrderId: string | null;
  openPaymentModal: (orderId: string) => void;
  closePaymentModal: () => void;

  // In-Dine & Table operations
  assignTable: (tableId: string, guestCount: number, captainName: string) => void;
  saveInDineOrderAndFireKOT: (tableId: string, items: OrderItem[], specialNotes?: string) => string;
  resetTable: (tableId: string) => void;

  // Kitchen Display System operations
  acknowledgeKitchenOrder: (orderId: string) => void;
  markKitchenOrderReady: (orderId: string) => void;

  // Online Zomato Operations
  approveOnlineOrder: (orderId: string) => void;
  rejectOnlineOrder: (orderId: string, reason?: string) => void;
  markOnlineDispatched: (orderId: string) => void;
  simulateIncomingZomatoOrder: () => void;

  // Bulk Catering Operations
  createBulkOrder: (order: Partial<BulkCateringOrder>) => void;
  updateBulkMilestone: (orderId: string, milestoneId: string, completed: boolean) => void;
  updateBulkOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Billing & Payment
  recordPayment: (orderId: string, paymentDetails: PaymentDetails) => void;

  // Inventory
  restockInventory: (itemId: string, amount: number) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;

  // Helpers
  getOrderById: (orderId: string) => Order | OnlineOrder | BulkCateringOrder | undefined;
  calculateOrderTotals: (items: OrderItem[]) => { subtotal: number; tax: number; total: number };
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveAppView>('cashier_pos');
  const [activeTableId, setActiveTableId] = useState<string | null>('tbl_t1');
  const [activeCaptain, setActiveCaptain] = useState<string>('Rahul Sharma');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [activePaymentOrderId, setActivePaymentOrderId] = useState<string | null>(null);

  // Core Data State
  const [tables, setTables] = useState<Table[]>(() => {
    const saved = localStorage.getItem('bbq_tables');
    return saved ? JSON.parse(saved) : INITIAL_TABLES;
  });

  const [menuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('bbq_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => {
    const saved = localStorage.getItem('bbq_online_orders');
    return saved ? JSON.parse(saved) : INITIAL_ONLINE_ORDERS;
  });

  const [bulkOrders, setBulkOrders] = useState<BulkCateringOrder[]>(() => {
    const saved = localStorage.getItem('bbq_bulk_orders');
    return saved ? JSON.parse(saved) : INITIAL_BULK_ORDERS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('bbq_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('bbq_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('bbq_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('bbq_online_orders', JSON.stringify(onlineOrders));
  }, [onlineOrders]);

  useEffect(() => {
    localStorage.setItem('bbq_bulk_orders', JSON.stringify(bulkOrders));
  }, [bulkOrders]);

  useEffect(() => {
    localStorage.setItem('bbq_inventory', JSON.stringify(inventory));
  }, [inventory]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundEffects.setSoundEnabled(enabled);
  };

  const openPaymentModal = (orderId: string) => {
    setActivePaymentOrderId(orderId);
  };

  const closePaymentModal = () => {
    setActivePaymentOrderId(null);
  };

  // Helper to calculate totals
  const calculateOrderTotals = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  };

  // Helper to deduct raw inventory when an order goes into kitchen
  const deductInventoryForOrder = (items: OrderItem[]) => {
    setInventory((prevInv) => {
      const updated = [...prevInv];
      items.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        if (menuItem && menuItem.inventoryImpact) {
          menuItem.inventoryImpact.forEach((impact) => {
            const idx = updated.findIndex((i) => i.id === impact.ingredientId);
            if (idx !== -1) {
              const current = updated[idx];
              const deduction = impact.amount * item.quantity;
              const newStock = Math.max(0, Math.round((current.currentStock - deduction) * 100) / 100);
              updated[idx] = { ...current, currentStock: newStock };
            }
          });
        }
      });
      return updated;
    });
  };

  // Assign table to guests
  const assignTable = (tableId: string, guestCount: number, captainName: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'ordering',
              guestCount,
              assignedCaptain: captainName,
              seatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Save In-Dine order and send to kitchen (fire KOT)
  const saveInDineOrderAndFireKOT = (tableId: string, items: OrderItem[], specialNotes?: string): string => {
    const targetTable = tables.find((t) => t.id === tableId);
    if (!targetTable) return '';

    const { subtotal, tax, total } = calculateOrderTotals(items);
    const orderNumber = `#BBQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrderId = `ord_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newOrder: Order = {
      id: newOrderId,
      orderNumber,
      type: 'in_dine',
      tableId,
      tableNumber: targetTable.number,
      captainName: targetTable.assignedCaptain || activeCaptain,
      createdAt: timestamp,
      status: 'sent_to_kitchen',
      kotFiredAt: timestamp,
      items: items.map((it) => ({ ...it, itemStatus: 'preparing' })),
      subtotal,
      tax,
      discount: 0,
      serviceCharge: 0,
      total,
      specialInstructions: specialNotes,
    };

    // Update orders list
    setOrders((prev) => [newOrder, ...prev]);

    // Update table status to in_kitchen
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'in_kitchen',
              currentOrderId: newOrderId,
            }
          : t
      )
    );

    // Deduct stock
    deductInventoryForOrder(items);

    // Play KOT alert sound
    soundEffects.playKOTAlert();

    return newOrderId;
  };

  // Kitchen Acknowledge order
  const acknowledgeKitchenOrder = (orderId: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'kitchen_preparing',
              kitchenAcknowledgedAt: now,
              items: ord.items.map((i) => ({ ...i, itemStatus: 'preparing' })),
            }
          : ord
      )
    );

    setOnlineOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'kitchen_preparing',
              kitchenAcknowledgedAt: now,
              items: ord.items.map((i) => ({ ...i, itemStatus: 'preparing' })),
            }
          : ord
      )
    );

    setBulkOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'kitchen_preparing',
              kitchenAcknowledgedAt: now,
              items: ord.items.map((i) => ({ ...i, itemStatus: 'preparing' })),
            }
          : ord
      )
    );
  };

  // Kitchen Mark order ready
  const markKitchenOrderReady = (orderId: string) => {
    const now = new Date().toISOString();

    // Check if in-dine order
    const inDineOrder = orders.find((o) => o.id === orderId);
    if (inDineOrder) {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'food_ready',
                kitchenReadyAt: now,
                items: ord.items.map((i) => ({ ...i, itemStatus: 'ready' })),
              }
            : ord
        )
      );

      // Also update table to served
      if (inDineOrder.tableId) {
        setTables((prev) =>
          prev.map((t) => (t.id === inDineOrder.tableId ? { ...t, status: 'served' } : t))
        );
      }
      soundEffects.playFoodReadyAlert();
      return;
    }

    // Check online order
    const onlineOrder = onlineOrders.find((o) => o.id === orderId);
    if (onlineOrder) {
      setOnlineOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'ready_to_dispatch',
                kitchenReadyAt: now,
                items: ord.items.map((i) => ({ ...i, itemStatus: 'ready' })),
              }
            : ord
        )
      );
      soundEffects.playFoodReadyAlert();
      return;
    }

    // Check bulk order
    const bulkOrder = bulkOrders.find((o) => o.id === orderId);
    if (bulkOrder) {
      setBulkOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'ready_to_dispatch',
                kitchenReadyAt: now,
                items: ord.items.map((i) => ({ ...i, itemStatus: 'ready' })),
              }
            : ord
        )
      );
      soundEffects.playFoodReadyAlert();
    }
  };

  // Zomato Online Order: Owner Approval
  const approveOnlineOrder = (orderId: string) => {
    const now = new Date().toISOString();
    const targetOrder = onlineOrders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    setOnlineOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              approvalStatus: 'approved',
              status: 'sent_to_kitchen',
              kotFiredAt: now,
              deliveryPartnerName: ord.deliveryPartnerName || 'Ramesh Shinde (Zomato Rider)',
              deliveryPartnerPhone: ord.deliveryPartnerPhone || '+91 98201 99234',
              deliveryVehicle: ord.deliveryVehicle || 'Hero Splendor (MH-02-EE-1942)',
              pickupOtp: ord.pickupOtp || `${Math.floor(1000 + Math.random() * 9000)}`,
            }
          : ord
      )
    );

    // Deduct raw ingredients
    deductInventoryForOrder(targetOrder.items);

    // Play KOT chime to signal kitchen
    soundEffects.playKOTAlert();
  };

  // Zomato Online Order: Owner Reject
  const rejectOnlineOrder = (orderId: string, reason = 'Kitchen at peak capacity') => {
    setOnlineOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              approvalStatus: 'rejected',
              status: 'cancelled',
              rejectionReason: reason,
            }
          : ord
      )
    );
  };

  // Mark online order as handed over / dispatched to delivery rider
  const markOnlineDispatched = (orderId: string) => {
    setOnlineOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'dispatched',
            }
          : ord
      )
    );
  };

  // Simulate incoming Zomato order
  const simulateIncomingZomatoOrder = () => {
    const customerNames = [
      'Gaurav Shah',
      'Pooja Kadam',
      'Rohan Singhal',
      'Sneha Patil',
      'Aniket Verma',
      'Tanvi Merchant',
    ];
    const customerAddresses = [
      'A-404, Solitaire Heights, Opp R-City Mall, Ghatkopar West',
      'Flat 1201, Lodha Fiorenza, Goregaon East',
      'Row House 5, Hiranandani Estate, Thane',
      'B-302, Palm Beach Residency, Vashi, Navi Mumbai',
    ];

    const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
    const randomAddress = customerAddresses[Math.floor(Math.random() * customerAddresses.length)];
    const randomOrderId = `onl_zom_${Date.now()}`;
    const randomOrderNum = `#ZOM-${Math.floor(1000 + Math.random() * 9000)}`;

    const mockItems: OrderItem[] = [
      {
        id: `oi_sim_${Date.now()}_1`,
        menuItemId: 'item_bbq_signature',
        name: 'Signature Barbeque Pav Bhaji',
        price: 240,
        quantity: 2,
        customization: {
          spiceLevel: 'Spicy',
          exclusions: [],
          butterPreference: 'Extra Amul Butter',
          pavType: 'Standard Butter Pav',
          specialNotes: 'Send extra chopped onion and lemon',
        },
        itemStatus: 'pending',
      },
      {
        id: `oi_sim_${Date.now()}_2`,
        menuItemId: 'item_barbeque_tava_pulao',
        name: 'Barbeque Special Tava Pulao',
        price: 230,
        quantity: 1,
        customization: {
          spiceLevel: 'Medium',
          exclusions: [],
          butterPreference: 'Normal Butter',
          pavType: 'Standard Butter Pav',
        },
        itemStatus: 'pending',
      },
    ];

    const { subtotal, tax, total } = calculateOrderTotals(mockItems);

    const newOnlineOrder: OnlineOrder = {
      id: randomOrderId,
      orderNumber: randomOrderNum,
      platformOrderId: `ZOMATO-WZ-${Math.floor(10000 + Math.random() * 90000)}`,
      type: 'online_zomato',
      onlinePlatform: 'Zomato',
      approvalStatus: 'pending',
      status: 'awaiting_approval',
      createdAt: new Date().toISOString(),
      customerName: randomName,
      customerPhone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
      deliveryAddress: randomAddress,
      estimatedDeliveryTime: '30 mins',
      specialInstructions: 'Contactless delivery, please do not ring doorbell.',
      items: mockItems,
      subtotal,
      tax,
      discount: 0,
      serviceCharge: 0,
      total,
    };

    setOnlineOrders((prev) => [newOnlineOrder, ...prev]);
    soundEffects.playOnlineOrderAlert();
  };

  // Create Bulk Order
  const createBulkOrder = (orderData: Partial<BulkCateringOrder>) => {
    const newId = `blk_${Date.now()}`;
    const newOrderNumber = `#BLK-${Math.floor(100 + Math.random() * 900)}`;
    const items = orderData.items || [];
    const { subtotal, tax, total } = calculateOrderTotals(items);

    const newBulkOrder: BulkCateringOrder = {
      id: newId,
      orderNumber: newOrderNumber,
      type: 'bulk_catering',
      eventName: orderData.eventName || 'Corporate Pav Bhaji Feast',
      eventType: orderData.eventType || 'Corporate Event',
      eventDate: orderData.eventDate || new Date().toISOString().split('T')[0],
      targetDeliveryTime: orderData.targetDeliveryTime || '14:00',
      guestPaxCount: orderData.guestPaxCount || 100,
      customerName: orderData.customerName || 'Bulk Client',
      customerPhone: orderData.customerPhone || '+91 99999 00000',
      venueAddress: orderData.venueAddress || 'Mumbai Banquet Hall',
      liveCounterRequired: orderData.liveCounterRequired ?? true,
      chaffingDishesSupplied: orderData.chaffingDishesSupplied ?? true,
      cutleryIncluded: orderData.cutleryIncluded ?? true,
      advanceDepositPaid: orderData.advanceDepositPaid || 5000,
      balancePaymentDue: Math.max(0, total - (orderData.advanceDepositPaid || 5000)),
      status: 'draft',
      createdAt: new Date().toISOString(),
      customRequirementsNotes: orderData.customRequirementsNotes || '',
      cateringMilestones: [
        { id: 'm1', title: 'Procurement of Ingredients & Bulk Pav Packs', dueTime: 'Event Day - 07:00 AM', completed: false },
        { id: 'm2', title: 'Large Tawa Bhaji Boiling, Mashing & Spicing', dueTime: 'Event Day - 10:00 AM', completed: false },
        { id: 'm3', title: 'Insulated Hot Food Transport & Chef Dispatch', dueTime: 'Event Day - 12:00 PM', completed: false },
        { id: 'm4', title: 'Live Counter Ignition & Guest Food Service', dueTime: 'Event Day - On Time', completed: false },
      ],
      items,
      subtotal,
      tax,
      discount: orderData.discount || 0,
      serviceCharge: 0,
      total,
    };

    setBulkOrders((prev) => [newBulkOrder, ...prev]);
  };

  const updateBulkMilestone = (orderId: string, milestoneId: string, completed: boolean) => {
    setBulkOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedMilestones = ord.cateringMilestones.map((m) =>
            m.id === milestoneId ? { ...m, completed } : m
          );
          return { ...ord, cateringMilestones: updatedMilestones };
        }
        return ord;
      })
    );
  };

  const updateBulkOrderStatus = (orderId: string, status: OrderStatus) => {
    setBulkOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status } : ord))
    );
  };

  // Record payment (In-Dine / Takeaway / Bulk)
  const recordPayment = (orderId: string, paymentDetails: PaymentDetails) => {
    // Check in-dine orders
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                status: 'completed',
                paymentDetails,
              }
            : ord
        )
      );

      // Release the table
      if (targetOrder.tableId) {
        setTables((prev) =>
          prev.map((t) =>
            t.id === targetOrder.tableId
              ? {
                  ...t,
                  status: 'available',
                  currentOrderId: undefined,
                  seatedAt: undefined,
                  guestCount: undefined,
                  assignedCaptain: undefined,
                }
              : t
          )
        );
      }
      closePaymentModal();
      return;
    }

    // Check bulk orders
    setBulkOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              balancePaymentDue: 0,
              paymentDetails,
              status: 'completed',
            }
          : ord
      )
    );
    closePaymentModal();
  };

  // Reset Table manually
  const resetTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'available',
              currentOrderId: undefined,
              seatedAt: undefined,
              guestCount: undefined,
              assignedCaptain: undefined,
            }
          : t
      )
    );
  };

  // Restock inventory
  const restockInventory = (itemId: string, amount: number) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              currentStock: Math.round((item.currentStock + amount) * 100) / 100,
              lastRestocked: timestamp,
            }
          : item
      )
    );
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `inv_${Date.now()}`,
    };
    setInventory((prev) => [...prev, newItem]);
  };

  // Helper to fetch any order
  const getOrderById = (orderId: string) => {
    return (
      orders.find((o) => o.id === orderId) ||
      onlineOrders.find((o) => o.id === orderId) ||
      bulkOrders.find((o) => o.id === orderId)
    );
  };

  return (
    <POSContext.Provider
      value={{
        activeView,
        setActiveView,
        tables,
        menuItems,
        orders,
        onlineOrders,
        bulkOrders,
        inventory,
        activeTableId,
        setActiveTableId,
        activeCaptain,
        setActiveCaptain,
        soundEnabled,
        setSoundEnabled,
        activePaymentOrderId,
        openPaymentModal,
        closePaymentModal,
        assignTable,
        saveInDineOrderAndFireKOT,
        resetTable,
        acknowledgeKitchenOrder,
        markKitchenOrderReady,
        approveOnlineOrder,
        rejectOnlineOrder,
        markOnlineDispatched,
        simulateIncomingZomatoOrder,
        createBulkOrder,
        updateBulkMilestone,
        updateBulkOrderStatus,
        recordPayment,
        restockInventory,
        addInventoryItem,
        getOrderById,
        calculateOrderTotals,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
