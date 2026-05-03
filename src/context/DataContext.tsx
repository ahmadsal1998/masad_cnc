import React, {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react';
import type { Employee, Customer, Supplier, Purchase, Sale, SyncStatus } from '../types';
import { fetchSheet, insertRecord, updateRecord, deleteRecord } from '../services/googleSheets';
import { SHEETS } from '../services/config';

interface DataContextValue {
  employees: Employee[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  syncStatus: SyncStatus;
  loadAll: () => Promise<void>;
  addEmployee: (e: Employee) => Promise<void>;
  updateEmployee: (e: Employee) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  addCustomer: (c: Customer) => Promise<void>;
  updateCustomer: (c: Customer) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  addSupplier: (s: Supplier) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  addPurchase: (p: Purchase) => Promise<void>;
  updatePurchase: (p: Purchase) => Promise<void>;
  removePurchase: (id: string) => Promise<void>;
  addSale: (s: Sale) => Promise<void>;
  updateSale: (s: Sale) => Promise<void>;
  removeSale: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Outstanding debt = total − paid */
const owed = (total: number, paid: number) => (total ?? 0) - (paid ?? 0);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ loading: false, error: null, lastSync: null });

  // Refs always hold the latest slice of state — safe to read inside async callbacks
  const customersRef  = useRef<Customer[]>([]);
  const suppliersRef  = useRef<Supplier[]>([]);
  const salesRef      = useRef<Sale[]>([]);
  const purchasesRef  = useRef<Purchase[]>([]);

  useEffect(() => { customersRef.current  = customers;  }, [customers]);
  useEffect(() => { suppliersRef.current  = suppliers;  }, [suppliers]);
  useEffect(() => { salesRef.current      = sales;      }, [sales]);
  useEffect(() => { purchasesRef.current  = purchases;  }, [purchases]);

  // ── Sync wrapper ────────────────────────────────────────────────────────────
  const withSync = useCallback(async (fn: () => Promise<void>) => {
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    try {
      await fn();
      setSyncStatus({ loading: false, error: null, lastSync: new Date() });
    } catch (err) {
      setSyncStatus(s => ({ ...s, loading: false, error: (err as Error).message }));
      throw err;
    }
  }, []);

  // ── Balance helpers (write to sheet + update local state atomically) ────────

  /** Adjust a customer's balance by `delta` and persist to sheet. */
  const adjustCustomerBalance = useCallback(async (customerId: string, delta: number) => {
    if (delta === 0) return;
    const customer = customersRef.current.find(c => c.id === customerId);
    if (!customer) return;
    const updated: Customer = { ...customer, balance: (customer.balance ?? 0) + delta };
    await updateRecord(SHEETS.CUSTOMERS, updated);
    setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
  }, []);

  /** Adjust a supplier's balance by `delta` and persist to sheet. */
  const adjustSupplierBalance = useCallback(async (supplierId: string, delta: number) => {
    if (delta === 0) return;
    const supplier = suppliersRef.current.find(s => s.id === supplierId);
    if (!supplier) return;
    const updated: Supplier = { ...supplier, balance: (supplier.balance ?? 0) + delta };
    await updateRecord(SHEETS.SUPPLIERS, updated);
    setSuppliers(prev => prev.map(s => s.id === supplierId ? updated : s));
  }, []);

  // ── Load all ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    await withSync(async () => {
      const [emps, custs, sups, purs, sls] = await Promise.all([
        fetchSheet<Employee>(SHEETS.EMPLOYEES),
        fetchSheet<Customer>(SHEETS.CUSTOMERS),
        fetchSheet<Supplier>(SHEETS.SUPPLIERS),
        fetchSheet<Purchase>(SHEETS.PURCHASES),
        fetchSheet<Sale>(SHEETS.SALES),
      ]);
      setEmployees(emps);
      setCustomers(custs);
      setSuppliers(sups);
      setPurchases(purs);
      setSales(sls);
    });
  }, [withSync]);

  // ── Employees ───────────────────────────────────────────────────────────────
  const addEmployee = useCallback(async (emp: Employee) => {
    await withSync(async () => {
      await insertRecord(SHEETS.EMPLOYEES, emp);
      setEmployees(prev => [...prev, emp]);
    });
  }, [withSync]);

  const updateEmployee = useCallback(async (emp: Employee) => {
    await withSync(async () => {
      await updateRecord(SHEETS.EMPLOYEES, emp);
      setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    });
  }, [withSync]);

  const removeEmployee = useCallback(async (id: string) => {
    await withSync(async () => {
      await deleteRecord(SHEETS.EMPLOYEES, id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    });
  }, [withSync]);

  // ── Customers ───────────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (c: Customer) => {
    await withSync(async () => {
      await insertRecord(SHEETS.CUSTOMERS, c);
      setCustomers(prev => [...prev, c]);
    });
  }, [withSync]);

  const updateCustomer = useCallback(async (c: Customer) => {
    await withSync(async () => {
      await updateRecord(SHEETS.CUSTOMERS, c);
      setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
    });
  }, [withSync]);

  const removeCustomer = useCallback(async (id: string) => {
    await withSync(async () => {
      await deleteRecord(SHEETS.CUSTOMERS, id);
      setCustomers(prev => prev.filter(x => x.id !== id));
    });
  }, [withSync]);

  // ── Suppliers ───────────────────────────────────────────────────────────────
  const addSupplier = useCallback(async (s: Supplier) => {
    await withSync(async () => {
      await insertRecord(SHEETS.SUPPLIERS, s);
      setSuppliers(prev => [...prev, s]);
    });
  }, [withSync]);

  const updateSupplier = useCallback(async (s: Supplier) => {
    await withSync(async () => {
      await updateRecord(SHEETS.SUPPLIERS, s);
      setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
    });
  }, [withSync]);

  const removeSupplier = useCallback(async (id: string) => {
    await withSync(async () => {
      await deleteRecord(SHEETS.SUPPLIERS, id);
      setSuppliers(prev => prev.filter(x => x.id !== id));
    });
  }, [withSync]);

  // ── Purchases → Supplier balance ─────────────────────────────────────────────
  const addPurchase = useCallback(async (p: Purchase) => {
    await withSync(async () => {
      await insertRecord(SHEETS.PURCHASES, p);
      setPurchases(prev => [...prev, p]);
      // Increase supplier's outstanding balance by the unpaid amount
      await adjustSupplierBalance(p.supplierId, owed(p.totalAmount, p.paidAmount));
    });
  }, [withSync, adjustSupplierBalance]);

  const updatePurchase = useCallback(async (p: Purchase) => {
    await withSync(async () => {
      const old = purchasesRef.current.find(x => x.id === p.id);
      await updateRecord(SHEETS.PURCHASES, p);
      setPurchases(prev => prev.map(x => x.id === p.id ? p : x));

      if (old) {
        if (old.supplierId === p.supplierId) {
          // Same supplier — apply the net difference
          const delta = owed(p.totalAmount, p.paidAmount) - owed(old.totalAmount, old.paidAmount);
          await adjustSupplierBalance(p.supplierId, delta);
        } else {
          // Supplier changed — reverse old, apply new
          await adjustSupplierBalance(old.supplierId, -owed(old.totalAmount, old.paidAmount));
          await adjustSupplierBalance(p.supplierId,   owed(p.totalAmount,   p.paidAmount));
        }
      }
    });
  }, [withSync, adjustSupplierBalance]);

  const removePurchase = useCallback(async (id: string) => {
    await withSync(async () => {
      const old = purchasesRef.current.find(x => x.id === id);
      await deleteRecord(SHEETS.PURCHASES, id);
      setPurchases(prev => prev.filter(x => x.id !== id));
      // Reverse the outstanding balance that was added when this purchase was recorded
      if (old) {
        await adjustSupplierBalance(old.supplierId, -owed(old.totalAmount, old.paidAmount));
      }
    });
  }, [withSync, adjustSupplierBalance]);

  // ── Sales → Customer balance ─────────────────────────────────────────────────
  const addSale = useCallback(async (s: Sale) => {
    await withSync(async () => {
      await insertRecord(SHEETS.SALES, s);
      setSales(prev => [...prev, s]);
      // Increase customer's outstanding balance by the unpaid amount
      await adjustCustomerBalance(s.customerId, owed(s.totalAmount, s.paidAmount));
    });
  }, [withSync, adjustCustomerBalance]);

  const updateSale = useCallback(async (s: Sale) => {
    await withSync(async () => {
      const old = salesRef.current.find(x => x.id === s.id);
      await updateRecord(SHEETS.SALES, s);
      setSales(prev => prev.map(x => x.id === s.id ? s : x));

      if (old) {
        if (old.customerId === s.customerId) {
          // Same customer — apply the net difference
          const delta = owed(s.totalAmount, s.paidAmount) - owed(old.totalAmount, old.paidAmount);
          await adjustCustomerBalance(s.customerId, delta);
        } else {
          // Customer changed — reverse old, apply new
          await adjustCustomerBalance(old.customerId, -owed(old.totalAmount, old.paidAmount));
          await adjustCustomerBalance(s.customerId,    owed(s.totalAmount,   s.paidAmount));
        }
      }
    });
  }, [withSync, adjustCustomerBalance]);

  const removeSale = useCallback(async (id: string) => {
    await withSync(async () => {
      const old = salesRef.current.find(x => x.id === id);
      await deleteRecord(SHEETS.SALES, id);
      setSales(prev => prev.filter(x => x.id !== id));
      // Reverse the outstanding balance that was added when this sale was recorded
      if (old) {
        await adjustCustomerBalance(old.customerId, -owed(old.totalAmount, old.paidAmount));
      }
    });
  }, [withSync, adjustCustomerBalance]);

  return (
    <DataContext.Provider value={{
      employees, customers, suppliers, purchases, sales, syncStatus, loadAll,
      addEmployee, updateEmployee, removeEmployee,
      addCustomer, updateCustomer, removeCustomer,
      addSupplier, updateSupplier, removeSupplier,
      addPurchase, updatePurchase, removePurchase,
      addSale, updateSale, removeSale,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
