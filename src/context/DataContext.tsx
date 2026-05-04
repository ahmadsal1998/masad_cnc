import React, {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react';
import type { Employee, Customer, Supplier, Purchase, Sale, Expense, SyncStatus } from '../types';
import { fetchSheet, insertRecord, updateRecord, deleteRecord } from '../services/googleSheets';
import { SHEETS } from '../services/config';
import { useToast } from './ToastContext';

interface DataContextValue {
  employees: Employee[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  syncStatus: SyncStatus;
  loadAll: () => Promise<void>;
  addEmployee: (e: Employee) => void;
  updateEmployee: (e: Employee) => void;
  removeEmployee: (id: string) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  removeSupplier: (id: string) => void;
  addPurchase: (p: Purchase) => void;
  updatePurchase: (p: Purchase) => void;
  removePurchase: (id: string) => void;
  addSale: (s: Sale) => void;
  updateSale: (s: Sale) => void;
  removeSale: (id: string) => void;
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const owed = (total: number, paid: number) => (total ?? 0) - (paid ?? 0);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ loading: false, error: null, lastSync: null });

  // Refs always hold the latest slice of state — safe to read before async operations
  const employeesRef = useRef<Employee[]>([]);
  const customersRef = useRef<Customer[]>([]);
  const suppliersRef = useRef<Supplier[]>([]);
  const purchasesRef = useRef<Purchase[]>([]);
  const salesRef     = useRef<Sale[]>([]);
  const expensesRef  = useRef<Expense[]>([]);

  useEffect(() => { employeesRef.current = employees; }, [employees]);
  useEffect(() => { customersRef.current = customers;  }, [customers]);
  useEffect(() => { suppliersRef.current = suppliers;  }, [suppliers]);
  useEffect(() => { purchasesRef.current = purchases;  }, [purchases]);
  useEffect(() => { salesRef.current     = sales;      }, [sales]);
  useEffect(() => { expensesRef.current  = expenses;   }, [expenses]);

  // ── Load all ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const [emps, custs, sups, purs, sls, exps] = await Promise.all([
        fetchSheet<Employee>(SHEETS.EMPLOYEES),
        fetchSheet<Customer>(SHEETS.CUSTOMERS),
        fetchSheet<Supplier>(SHEETS.SUPPLIERS),
        fetchSheet<Purchase>(SHEETS.PURCHASES),
        fetchSheet<Sale>(SHEETS.SALES),
        fetchSheet<Expense>(SHEETS.EXPENSES),
      ]);
      setEmployees(emps);
      setCustomers(custs);
      setSuppliers(sups);
      setPurchases(purs);
      setSales(sls);
      setExpenses(exps);
      setSyncStatus({ loading: false, error: null, lastSync: new Date() });
    } catch (err) {
      setSyncStatus(s => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, []);

  // ── Sync helpers ─────────────────────────────────────────────────────────────
  const onSyncOk  = () => setSyncStatus({ loading: false, error: null, lastSync: new Date() });
  const onSyncErr = (err: unknown) =>
    setSyncStatus(s => ({ ...s, loading: false, error: (err as Error).message }));

  // ── Employees ───────────────────────────────────────────────────────────────
  const addEmployee = useCallback((emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
    toast.success('تمت إضافة الموظف بنجاح');
    insertRecord(SHEETS.EMPLOYEES, emp).then(onSyncOk).catch(err => {
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      toast.error('فشلت إضافة الموظف. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const updateEmployee = useCallback((emp: Employee) => {
    const old = employeesRef.current.find(e => e.id === emp.id);
    setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e));
    toast.success('تم تحديث بيانات الموظف بنجاح');
    updateRecord(SHEETS.EMPLOYEES, emp).then(onSyncOk).catch(err => {
      if (old) setEmployees(prev => prev.map(e => e.id === emp.id ? old : e));
      toast.error('فشل تحديث بيانات الموظف. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const removeEmployee = useCallback((id: string) => {
    const old = employeesRef.current.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast.success('تم حذف الموظف بنجاح');
    deleteRecord(SHEETS.EMPLOYEES, id).then(onSyncOk).catch(err => {
      if (old) setEmployees(prev => [...prev, old]);
      toast.error('فشل حذف الموظف. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  // ── Customers ───────────────────────────────────────────────────────────────
  const addCustomer = useCallback((c: Customer) => {
    setCustomers(prev => [...prev, c]);
    toast.success('تمت إضافة العميل بنجاح');
    insertRecord(SHEETS.CUSTOMERS, c).then(onSyncOk).catch(err => {
      setCustomers(prev => prev.filter(x => x.id !== c.id));
      toast.error('فشلت إضافة العميل. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const updateCustomer = useCallback((c: Customer) => {
    const old = customersRef.current.find(x => x.id === c.id);
    setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
    toast.success('تم تحديث بيانات العميل بنجاح');
    updateRecord(SHEETS.CUSTOMERS, c).then(onSyncOk).catch(err => {
      if (old) setCustomers(prev => prev.map(x => x.id === c.id ? old : x));
      toast.error('فشل تحديث بيانات العميل. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const removeCustomer = useCallback((id: string) => {
    const old = customersRef.current.find(x => x.id === id);
    setCustomers(prev => prev.filter(x => x.id !== id));
    toast.success('تم حذف العميل بنجاح');
    deleteRecord(SHEETS.CUSTOMERS, id).then(onSyncOk).catch(err => {
      if (old) setCustomers(prev => [...prev, old]);
      toast.error('فشل حذف العميل. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  // ── Suppliers ───────────────────────────────────────────────────────────────
  const addSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => [...prev, s]);
    toast.success('تمت إضافة المورد بنجاح');
    insertRecord(SHEETS.SUPPLIERS, s).then(onSyncOk).catch(err => {
      setSuppliers(prev => prev.filter(x => x.id !== s.id));
      toast.error('فشلت إضافة المورد. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const updateSupplier = useCallback((s: Supplier) => {
    const old = suppliersRef.current.find(x => x.id === s.id);
    setSuppliers(prev => prev.map(x => x.id === s.id ? s : x));
    toast.success('تم تحديث بيانات المورد بنجاح');
    updateRecord(SHEETS.SUPPLIERS, s).then(onSyncOk).catch(err => {
      if (old) setSuppliers(prev => prev.map(x => x.id === s.id ? old : x));
      toast.error('فشل تحديث بيانات المورد. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  const removeSupplier = useCallback((id: string) => {
    const old = suppliersRef.current.find(x => x.id === id);
    setSuppliers(prev => prev.filter(x => x.id !== id));
    toast.success('تم حذف المورد بنجاح');
    deleteRecord(SHEETS.SUPPLIERS, id).then(onSyncOk).catch(err => {
      if (old) setSuppliers(prev => [...prev, old]);
      toast.error('فشل حذف المورد. يرجى المحاولة مرة أخرى.');
      onSyncErr(err);
    });
  }, [toast]);

  // ── Purchases → Supplier balance ─────────────────────────────────────────────
  const addPurchase = useCallback((p: Purchase) => {
    const delta    = owed(p.totalAmount, p.paidAmount);
    const oldSup   = suppliersRef.current.find(s => s.id === p.supplierId);
    const newSupBal = (oldSup?.balance ?? 0) + delta;

    // Optimistic
    setPurchases(prev => [...prev, p]);
    if (delta !== 0 && oldSup)
      setSuppliers(prev => prev.map(s => s.id === p.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تمت إضافة فاتورة الشراء بنجاح');

    // Background sync
    (async () => {
      try {
        await insertRecord(SHEETS.PURCHASES, p);
        if (delta !== 0 && oldSup)
          await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        setPurchases(prev => prev.filter(x => x.id !== p.id));
        if (oldSup) setSuppliers(prev => prev.map(s => s.id === p.supplierId ? oldSup : s));
        toast.error('فشلت إضافة فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updatePurchase = useCallback((p: Purchase) => {
    const oldP      = purchasesRef.current.find(x => x.id === p.id);
    if (!oldP) return;

    const oldDelta   = owed(oldP.totalAmount, oldP.paidAmount);
    const newDelta   = owed(p.totalAmount,    p.paidAmount);
    const sameSup    = oldP.supplierId === p.supplierId;
    const oldSupA    = suppliersRef.current.find(s => s.id === oldP.supplierId);
    const oldSupB    = sameSup ? oldSupA : suppliersRef.current.find(s => s.id === p.supplierId);

    // Optimistic purchase update
    setPurchases(prev => prev.map(x => x.id === p.id ? p : x));

    // Optimistic supplier balance updates
    if (sameSup) {
      const net = newDelta - oldDelta;
      if (net !== 0 && oldSupA)
        setSuppliers(prev => prev.map(s =>
          s.id === p.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) + net } : s
        ));
    } else {
      if (oldDelta !== 0 && oldSupA)
        setSuppliers(prev => prev.map(s =>
          s.id === oldP.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) - oldDelta } : s
        ));
      if (newDelta !== 0 && oldSupB)
        setSuppliers(prev => prev.map(s =>
          s.id === p.supplierId ? { ...s, balance: (oldSupB.balance ?? 0) + newDelta } : s
        ));
    }
    toast.success('تم تحديث فاتورة الشراء بنجاح');

    // Background sync
    (async () => {
      try {
        await updateRecord(SHEETS.PURCHASES, p);
        if (sameSup) {
          const net = newDelta - oldDelta;
          if (net !== 0 && oldSupA)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) + net });
        } else {
          if (oldDelta !== 0 && oldSupA)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) - oldDelta });
          if (newDelta !== 0 && oldSupB)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupB, balance: (oldSupB.balance ?? 0) + newDelta });
        }
        onSyncOk();
      } catch (err) {
        setPurchases(prev => prev.map(x => x.id === p.id ? oldP : x));
        if (oldSupA) setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? oldSupA : s));
        if (!sameSup && oldSupB) setSuppliers(prev => prev.map(s => s.id === p.supplierId ? oldSupB : s));
        toast.error('فشل تحديث فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removePurchase = useCallback((id: string) => {
    const oldP      = purchasesRef.current.find(x => x.id === id);
    const oldSup    = oldP ? suppliersRef.current.find(s => s.id === oldP.supplierId) : undefined;
    const delta     = oldP ? owed(oldP.totalAmount, oldP.paidAmount) : 0;
    const newSupBal = (oldSup?.balance ?? 0) - delta;

    // Optimistic
    setPurchases(prev => prev.filter(x => x.id !== id));
    if (delta !== 0 && oldSup && oldP)
      setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تم حذف فاتورة الشراء بنجاح');

    // Background sync
    (async () => {
      try {
        await deleteRecord(SHEETS.PURCHASES, id);
        if (delta !== 0 && oldSup)
          await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        if (oldP) setPurchases(prev => [...prev, oldP]);
        if (oldSup && oldP) setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? oldSup : s));
        toast.error('فشل حذف فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  // ── Sales → Customer balance ─────────────────────────────────────────────────
  const addSale = useCallback((s: Sale) => {
    const delta     = owed(s.totalAmount, s.paidAmount);
    const oldCust   = customersRef.current.find(c => c.id === s.customerId);
    const newCustBal = (oldCust?.balance ?? 0) + delta;

    // Optimistic
    setSales(prev => [...prev, s]);
    if (delta !== 0 && oldCust)
      setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تمت إضافة فاتورة البيع بنجاح');

    // Background sync
    (async () => {
      try {
        await insertRecord(SHEETS.SALES, s);
        if (delta !== 0 && oldCust)
          await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        setSales(prev => prev.filter(x => x.id !== s.id));
        if (oldCust) setCustomers(prev => prev.map(c => c.id === s.customerId ? oldCust : c));
        toast.error('فشلت إضافة فاتورة البيع. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updateSale = useCallback((s: Sale) => {
    const oldS      = salesRef.current.find(x => x.id === s.id);
    if (!oldS) return;

    const oldDelta   = owed(oldS.totalAmount, oldS.paidAmount);
    const newDelta   = owed(s.totalAmount,    s.paidAmount);
    const sameCust   = oldS.customerId === s.customerId;
    const oldCustA   = customersRef.current.find(c => c.id === oldS.customerId);
    const oldCustB   = sameCust ? oldCustA : customersRef.current.find(c => c.id === s.customerId);

    // Optimistic sale update
    setSales(prev => prev.map(x => x.id === s.id ? s : x));

    // Optimistic customer balance updates
    if (sameCust) {
      const net = newDelta - oldDelta;
      if (net !== 0 && oldCustA)
        setCustomers(prev => prev.map(c =>
          c.id === s.customerId ? { ...c, balance: (oldCustA.balance ?? 0) + net } : c
        ));
    } else {
      if (oldDelta !== 0 && oldCustA)
        setCustomers(prev => prev.map(c =>
          c.id === oldS.customerId ? { ...c, balance: (oldCustA.balance ?? 0) - oldDelta } : c
        ));
      if (newDelta !== 0 && oldCustB)
        setCustomers(prev => prev.map(c =>
          c.id === s.customerId ? { ...c, balance: (oldCustB.balance ?? 0) + newDelta } : c
        ));
    }
    toast.success('تم تحديث فاتورة البيع بنجاح');

    // Background sync
    (async () => {
      try {
        await updateRecord(SHEETS.SALES, s);
        if (sameCust) {
          const net = newDelta - oldDelta;
          if (net !== 0 && oldCustA)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) + net });
        } else {
          if (oldDelta !== 0 && oldCustA)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) - oldDelta });
          if (newDelta !== 0 && oldCustB)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustB, balance: (oldCustB.balance ?? 0) + newDelta });
        }
        onSyncOk();
      } catch (err) {
        setSales(prev => prev.map(x => x.id === s.id ? oldS : x));
        if (oldCustA) setCustomers(prev => prev.map(c => c.id === oldS.customerId ? oldCustA : c));
        if (!sameCust && oldCustB) setCustomers(prev => prev.map(c => c.id === s.customerId ? oldCustB : c));
        toast.error('فشل تحديث فاتورة البيع. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removeSale = useCallback((id: string) => {
    const oldS      = salesRef.current.find(x => x.id === id);
    const oldCust   = oldS ? customersRef.current.find(c => c.id === oldS.customerId) : undefined;
    const delta     = oldS ? owed(oldS.totalAmount, oldS.paidAmount) : 0;
    const newCustBal = (oldCust?.balance ?? 0) - delta;

    // Optimistic
    setSales(prev => prev.filter(x => x.id !== id));
    if (delta !== 0 && oldCust && oldS)
      setCustomers(prev => prev.map(c => c.id === oldS.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تم حذف فاتورة البيع بنجاح');

    // Background sync
    (async () => {
      try {
        await deleteRecord(SHEETS.SALES, id);
        if (delta !== 0 && oldCust)
          await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        if (oldS) setSales(prev => [...prev, oldS]);
        if (oldCust && oldS) setCustomers(prev => prev.map(c => c.id === oldS.customerId ? oldCust : c));
        toast.error('فشل حذف فاتورة البيع. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  // ── Expenses → Supplier balance (credit only) ───────────────────────────────
  const addExpense = useCallback((exp: Expense) => {
    const isCredit = exp.paymentMethod === 'credit' && exp.supplierId;
    const oldSup   = isCredit ? suppliersRef.current.find(s => s.id === exp.supplierId) : undefined;
    const newSupBal = (oldSup?.balance ?? 0) + exp.amount;

    setExpenses(prev => [...prev, exp]);
    if (oldSup)
      setSuppliers(prev => prev.map(s => s.id === exp.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تمت إضافة المصروف بنجاح');

    (async () => {
      try {
        await insertRecord(SHEETS.EXPENSES, exp);
        if (oldSup)
          await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        setExpenses(prev => prev.filter(x => x.id !== exp.id));
        if (oldSup) setSuppliers(prev => prev.map(s => s.id === exp.supplierId ? oldSup : s));
        toast.error('فشلت إضافة المصروف. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updateExpense = useCallback((exp: Expense) => {
    const oldExp   = expensesRef.current.find(x => x.id === exp.id);
    if (!oldExp) return;

    const oldSupId = oldExp.paymentMethod === 'credit' ? (oldExp.supplierId || '') : '';
    const newSupId = exp.paymentMethod    === 'credit' ? (exp.supplierId    || '') : '';
    const oldSup   = oldSupId ? suppliersRef.current.find(s => s.id === oldSupId) : undefined;
    const newSup   = newSupId ? suppliersRef.current.find(s => s.id === newSupId) : undefined;
    const sameSup  = !!oldSupId && !!newSupId && oldSupId === newSupId;

    setExpenses(prev => prev.map(x => x.id === exp.id ? exp : x));

    if (sameSup && oldSup) {
      const net = exp.amount - oldExp.amount;
      if (net !== 0)
        setSuppliers(prev => prev.map(s =>
          s.id === oldSup.id ? { ...s, balance: (oldSup.balance ?? 0) + net } : s
        ));
    } else {
      if (oldSup)
        setSuppliers(prev => prev.map(s =>
          s.id === oldSup.id ? { ...s, balance: (oldSup.balance ?? 0) - oldExp.amount } : s
        ));
      if (newSup)
        setSuppliers(prev => prev.map(s =>
          s.id === newSup.id ? { ...s, balance: (newSup.balance ?? 0) + exp.amount } : s
        ));
    }
    toast.success('تم تحديث المصروف بنجاح');

    (async () => {
      try {
        await updateRecord(SHEETS.EXPENSES, exp);
        if (sameSup && oldSup) {
          const net = exp.amount - oldExp.amount;
          if (net !== 0)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: (oldSup.balance ?? 0) + net });
        } else {
          if (oldSup)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: (oldSup.balance ?? 0) - oldExp.amount });
          if (newSup)
            await updateRecord(SHEETS.SUPPLIERS, { ...newSup, balance: (newSup.balance ?? 0) + exp.amount });
        }
        onSyncOk();
      } catch (err) {
        setExpenses(prev => prev.map(x => x.id === exp.id ? oldExp : x));
        if (oldSup) setSuppliers(prev => prev.map(s => s.id === oldSup.id ? oldSup : s));
        if (!sameSup && newSup) setSuppliers(prev => prev.map(s => s.id === newSup.id ? newSup : s));
        toast.error('فشل تحديث المصروف. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removeExpense = useCallback((id: string) => {
    const oldExp   = expensesRef.current.find(x => x.id === id);
    const isCredit = oldExp?.paymentMethod === 'credit' && oldExp.supplierId;
    const oldSup   = isCredit ? suppliersRef.current.find(s => s.id === oldExp?.supplierId) : undefined;
    const newSupBal = (oldSup?.balance ?? 0) - (oldExp?.amount ?? 0);

    setExpenses(prev => prev.filter(x => x.id !== id));
    if (oldSup && oldExp)
      setSuppliers(prev => prev.map(s => s.id === oldExp.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تم حذف المصروف بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.EXPENSES, id);
        if (oldSup && oldExp)
          await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        if (oldExp) setExpenses(prev => [...prev, oldExp]);
        if (oldSup && oldExp) setSuppliers(prev => prev.map(s => s.id === oldExp.supplierId ? oldSup : s));
        toast.error('فشل حذف المصروف. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  return (
    <DataContext.Provider value={{
      employees, customers, suppliers, purchases, sales, syncStatus, loadAll,
      addEmployee, updateEmployee, removeEmployee,
      addCustomer, updateCustomer, removeCustomer,
      addSupplier, updateSupplier, removeSupplier,
      addPurchase, updatePurchase, removePurchase,
      addSale, updateSale, removeSale,
      expenses, addExpense, updateExpense, removeExpense,
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
