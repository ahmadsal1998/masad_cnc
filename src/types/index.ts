export interface Employee {
  id: string;
  name: string;
  position: string;
  phone: string;
  salary: number;
  joinDate: string;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  notes: string;
}

export interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
}

export interface SaleItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SaleItem[];
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  discountAmount?: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: 'cash' | 'bank' | 'credit';
  supplierId: string;
  supplierName: string;
  notes: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface AppData {
  employees: Employee[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
}

export interface SyncStatus {
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
}
