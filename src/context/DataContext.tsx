import React, {
  createContext, useContext, useState, useCallback, useRef, useEffect,
} from 'react';
import type {
  Employee, Customer, Supplier, Purchase, Sale, Expense,
  SupplierPayment, CustomerPayment, SyncStatus,
} from '../types';
import { fetchSheet, insertRecord, updateRecord, deleteRecord } from '../services/googleSheets';
import { SHEETS } from '../services/config';
import { useToast } from './ToastContext';
import { generateId } from '../utils/hash';

interface DataContextValue {
  employees: Employee[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  customerPayments: CustomerPayment[];
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
  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
  addSupplierPayment: (p: SupplierPayment) => void;
  updateSupplierPayment: (p: SupplierPayment) => void;
  removeSupplierPayment: (id: string) => void;
  addCustomerPayment: (p: CustomerPayment) => void;
  updateCustomerPayment: (p: CustomerPayment) => void;
  removeCustomerPayment: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [employees, setEmployees]             = useState<Employee[]>([]);
  const [customers, setCustomers]             = useState<Customer[]>([]);
  const [suppliers, setSuppliers]             = useState<Supplier[]>([]);
  const [purchases, setPurchases]             = useState<Purchase[]>([]);
  const [sales, setSales]                     = useState<Sale[]>([]);
  const [expenses, setExpenses]               = useState<Expense[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [syncStatus, setSyncStatus]           = useState<SyncStatus>({ loading: false, error: null, lastSync: null });

  const employeesRef        = useRef<Employee[]>([]);
  const customersRef        = useRef<Customer[]>([]);
  const suppliersRef        = useRef<Supplier[]>([]);
  const purchasesRef        = useRef<Purchase[]>([]);
  const salesRef            = useRef<Sale[]>([]);
  const expensesRef         = useRef<Expense[]>([]);
  const supplierPaymentsRef = useRef<SupplierPayment[]>([]);
  const customerPaymentsRef = useRef<CustomerPayment[]>([]);

  useEffect(() => { employeesRef.current        = employees;        }, [employees]);
  useEffect(() => { customersRef.current        = customers;        }, [customers]);
  useEffect(() => { suppliersRef.current        = suppliers;        }, [suppliers]);
  useEffect(() => { purchasesRef.current        = purchases;        }, [purchases]);
  useEffect(() => { salesRef.current            = sales;            }, [sales]);
  useEffect(() => { expensesRef.current         = expenses;         }, [expenses]);
  useEffect(() => { supplierPaymentsRef.current = supplierPayments; }, [supplierPayments]);
  useEffect(() => { customerPaymentsRef.current = customerPayments; }, [customerPayments]);

  // ── Load all ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setSyncStatus(s => ({ ...s, loading: true, error: null }));
    try {
      const [emps, custs, sups, purs, sls, exps, spays, cpays] = await Promise.all([
        fetchSheet<Employee>(SHEETS.EMPLOYEES),
        fetchSheet<Customer>(SHEETS.CUSTOMERS),
        fetchSheet<Supplier>(SHEETS.SUPPLIERS),
        fetchSheet<Purchase>(SHEETS.PURCHASES),
        fetchSheet<Sale>(SHEETS.SALES),
        fetchSheet<Expense>(SHEETS.EXPENSES),
        fetchSheet<SupplierPayment>(SHEETS.SUPPLIER_PAYMENTS),
        fetchSheet<CustomerPayment>(SHEETS.CUSTOMER_PAYMENTS),
      ]);
      setEmployees(emps);
      setCustomers(custs);
      setSuppliers(sups);
      setPurchases(purs);
      setSales(sls);
      setExpenses(exps);
      setSupplierPayments(spays);
      setCustomerPayments(cpays);
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
    const relatedPayments = customerPaymentsRef.current.filter(x => x.customerId === id);

    setCustomers(prev => prev.filter(x => x.id !== id));
    setCustomerPayments(prev => prev.filter(x => x.customerId !== id));
    toast.success('تم حذف العميل بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.CUSTOMERS, id);
        await Promise.all(relatedPayments.map(p => deleteRecord(SHEETS.CUSTOMER_PAYMENTS, p.id)));
        onSyncOk();
      } catch (err) {
        if (old) setCustomers(prev => [...prev, old]);
        if (relatedPayments.length > 0) setCustomerPayments(prev => [...prev, ...relatedPayments]);
        toast.error('فشل حذف العميل. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
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
    const relatedPayments = supplierPaymentsRef.current.filter(x => x.supplierId === id);

    setSuppliers(prev => prev.filter(x => x.id !== id));
    setSupplierPayments(prev => prev.filter(x => x.supplierId !== id));
    toast.success('تم حذف المورد بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.SUPPLIERS, id);
        await Promise.all(relatedPayments.map(p => deleteRecord(SHEETS.SUPPLIER_PAYMENTS, p.id)));
        onSyncOk();
      } catch (err) {
        if (old) setSuppliers(prev => [...prev, old]);
        if (relatedPayments.length > 0) setSupplierPayments(prev => [...prev, ...relatedPayments]);
        toast.error('فشل حذف المورد. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  // ── Purchases → Supplier balance + SupplierPayments ─────────────────────────
  //
  // Balance semantics: supplier.balance tracks total amount owed.
  //   - Any purchase (cash or credit) adds the full totalAmount to balance.
  //   - A cash purchase also auto-creates a SupplierPayment record to document
  //     that the money was paid immediately.
  //   - Standalone payments (addSupplierPayment) reduce the balance.

  const addPurchase = useCallback((p: Purchase) => {
    const oldSup    = suppliersRef.current.find(s => s.id === p.supplierId);
    const pPaidAmt  = p.paymentType === 'credit' ? (p.paidAmount ?? 0) : 0;
    const pBal      = p.paymentType === 'cash' ? p.totalAmount : (p.totalAmount - pPaidAmt);
    const newSupBal = (oldSup?.balance ?? 0) + pBal;

    const autoPayment: SupplierPayment | null =
      p.paymentType === 'cash'
        ? { id: generateId(), supplierId: p.supplierId, amount: p.totalAmount, type: 'cash', relatedPurchaseId: p.id, date: p.date }
        : pPaidAmt > 0
          ? { id: generateId(), supplierId: p.supplierId, amount: pPaidAmt, type: 'cash', relatedPurchaseId: p.id, date: p.date }
          : null;

    setPurchases(prev => [...prev, p]);
    if (autoPayment) setSupplierPayments(prev => [...prev, autoPayment]);
    if (oldSup)
      setSuppliers(prev => prev.map(s => s.id === p.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تمت إضافة فاتورة الشراء بنجاح');

    (async () => {
      try {
        await insertRecord(SHEETS.PURCHASES, p);
        if (autoPayment) await insertRecord(SHEETS.SUPPLIER_PAYMENTS, autoPayment);
        if (oldSup) await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        setPurchases(prev => prev.filter(x => x.id !== p.id));
        if (autoPayment) setSupplierPayments(prev => prev.filter(x => x.id !== autoPayment.id));
        if (oldSup) setSuppliers(prev => prev.map(s => s.id === p.supplierId ? oldSup : s));
        toast.error('فشلت إضافة فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updatePurchase = useCallback((p: Purchase) => {
    const oldP = purchasesRef.current.find(x => x.id === p.id);
    if (!oldP) return;

    const sameSup  = oldP.supplierId === p.supplierId;
    const oldSupA  = suppliersRef.current.find(s => s.id === oldP.supplierId);
    const oldSupB  = sameSup ? oldSupA : suppliersRef.current.find(s => s.id === p.supplierId);
    const existingPayment = supplierPaymentsRef.current.find(x => x.relatedPurchaseId === p.id);

    let newPayment:     SupplierPayment | null = null;
    let updatedPayment: SupplierPayment | null = null;
    let deletedPayment: SupplierPayment | null = null;

    const newPPaidAmt = p.paymentType === 'credit' ? (p.paidAmount ?? 0) : 0;
    if (p.paymentType === 'cash') {
      if (existingPayment) {
        updatedPayment = { ...existingPayment, amount: p.totalAmount, supplierId: p.supplierId, date: p.date };
      } else {
        newPayment = { id: generateId(), supplierId: p.supplierId, amount: p.totalAmount, type: 'cash', relatedPurchaseId: p.id, date: p.date };
      }
    } else if (newPPaidAmt > 0) {
      if (existingPayment) {
        updatedPayment = { ...existingPayment, amount: newPPaidAmt, supplierId: p.supplierId, date: p.date };
      } else {
        newPayment = { id: generateId(), supplierId: p.supplierId, amount: newPPaidAmt, type: 'cash', relatedPurchaseId: p.id, date: p.date };
      }
    } else {
      if (existingPayment) deletedPayment = existingPayment;
    }

    const oldPPaid   = oldP.paymentType === 'credit' ? (oldP.paidAmount ?? 0) : 0;
    const oldPImpact = oldP.paymentType === 'cash' ? oldP.totalAmount : (oldP.totalAmount - oldPPaid);
    const newPImpact = p.paymentType === 'cash' ? p.totalAmount : (p.totalAmount - newPPaidAmt);

    setPurchases(prev => prev.map(x => x.id === p.id ? p : x));
    if (newPayment)     setSupplierPayments(prev => [...prev, newPayment!]);
    if (updatedPayment) setSupplierPayments(prev => prev.map(x => x.id === updatedPayment!.id ? updatedPayment! : x));
    if (deletedPayment) setSupplierPayments(prev => prev.filter(x => x.id !== deletedPayment!.id));

    if (sameSup) {
      const net = newPImpact - oldPImpact;
      if (net !== 0 && oldSupA)
        setSuppliers(prev => prev.map(s =>
          s.id === p.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) + net } : s
        ));
    } else {
      if (oldSupA)
        setSuppliers(prev => prev.map(s =>
          s.id === oldP.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) - oldPImpact } : s
        ));
      if (oldSupB)
        setSuppliers(prev => prev.map(s =>
          s.id === p.supplierId ? { ...s, balance: (oldSupB.balance ?? 0) + newPImpact } : s
        ));
    }
    toast.success('تم تحديث فاتورة الشراء بنجاح');

    (async () => {
      try {
        await updateRecord(SHEETS.PURCHASES, p);
        if (newPayment)     await insertRecord(SHEETS.SUPPLIER_PAYMENTS, newPayment);
        if (updatedPayment) await updateRecord(SHEETS.SUPPLIER_PAYMENTS, updatedPayment);
        if (deletedPayment) await deleteRecord(SHEETS.SUPPLIER_PAYMENTS, deletedPayment.id);
        if (sameSup) {
          const net = newPImpact - oldPImpact;
          if (net !== 0 && oldSupA)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) + net });
        } else {
          if (oldSupA)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) - oldPImpact });
          if (oldSupB)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupB, balance: (oldSupB.balance ?? 0) + newPImpact });
        }
        onSyncOk();
      } catch (err) {
        setPurchases(prev => prev.map(x => x.id === p.id ? oldP : x));
        if (newPayment)                       setSupplierPayments(prev => prev.filter(x => x.id !== newPayment!.id));
        if (updatedPayment && existingPayment) setSupplierPayments(prev => prev.map(x => x.id === updatedPayment!.id ? existingPayment : x));
        if (deletedPayment)                   setSupplierPayments(prev => [...prev, deletedPayment!]);
        if (oldSupA) setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? oldSupA : s));
        if (!sameSup && oldSupB) setSuppliers(prev => prev.map(s => s.id === p.supplierId ? oldSupB : s));
        toast.error('فشل تحديث فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removePurchase = useCallback((id: string) => {
    const oldP    = purchasesRef.current.find(x => x.id === id);
    const oldSup  = oldP ? suppliersRef.current.find(s => s.id === oldP.supplierId) : undefined;
    const pPaid    = oldP?.paymentType === 'credit' ? (oldP?.paidAmount ?? 0) : 0;
    const pImpact  = oldP?.paymentType === 'cash' ? (oldP?.totalAmount ?? 0) : ((oldP?.totalAmount ?? 0) - pPaid);
    const newSupBal = (oldSup?.balance ?? 0) - pImpact;
    const relatedPayment = supplierPaymentsRef.current.find(x => x.relatedPurchaseId === id);

    setPurchases(prev => prev.filter(x => x.id !== id));
    if (relatedPayment) setSupplierPayments(prev => prev.filter(x => x.id !== relatedPayment.id));
    if (oldSup && oldP)
      setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تم حذف فاتورة الشراء بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.PURCHASES, id);
        if (relatedPayment) await deleteRecord(SHEETS.SUPPLIER_PAYMENTS, relatedPayment.id);
        if (oldSup && oldP) await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        if (oldP)           setPurchases(prev => [...prev, oldP]);
        if (relatedPayment) setSupplierPayments(prev => [...prev, relatedPayment]);
        if (oldSup && oldP) setSuppliers(prev => prev.map(s => s.id === oldP.supplierId ? oldSup : s));
        toast.error('فشل حذف فاتورة الشراء. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  // ── Sales → Customer balance + CustomerPayments ──────────────────────────────
  //
  // Balance semantics: customer.balance tracks how much the customer owes us.
  //   - Any sale (cash or credit) adds the full totalAmount to balance.
  //   - A cash sale also auto-creates a CustomerPayment record to document
  //     that the customer paid immediately.
  //   - Standalone payments (addCustomerPayment) reduce the balance.
  //
  // Net balance: balance = totalSales - totalPayments
  //   balance > 0 → customer still owes money
  //   balance = 0 → fully settled
  //   balance < 0 → customer overpaid

  const addSale = useCallback((s: Sale) => {
    const oldCust    = customersRef.current.find(c => c.id === s.customerId);
    const sPaidAmt   = s.paymentType === 'credit' ? (s.paidAmount ?? 0) : 0;
    const sBal       = s.paymentType === 'cash' ? s.totalAmount : (s.totalAmount - sPaidAmt);
    const newCustBal = (oldCust?.balance ?? 0) + sBal;

    const autoPayment: CustomerPayment | null =
      s.paymentType === 'cash'
        ? { id: generateId(), customerId: s.customerId, amount: s.totalAmount, type: 'cash', relatedSaleId: s.id, date: s.date }
        : sPaidAmt > 0
          ? { id: generateId(), customerId: s.customerId, amount: sPaidAmt, type: 'cash', relatedSaleId: s.id, date: s.date }
          : null;

    setSales(prev => [...prev, s]);
    if (autoPayment) setCustomerPayments(prev => [...prev, autoPayment]);
    if (oldCust)
      setCustomers(prev => prev.map(c => c.id === s.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تمت إضافة فاتورة البيع بنجاح');

    (async () => {
      try {
        await insertRecord(SHEETS.SALES, s);
        if (autoPayment) await insertRecord(SHEETS.CUSTOMER_PAYMENTS, autoPayment);
        if (oldCust) await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        setSales(prev => prev.filter(x => x.id !== s.id));
        if (autoPayment) setCustomerPayments(prev => prev.filter(x => x.id !== autoPayment.id));
        if (oldCust) setCustomers(prev => prev.map(c => c.id === s.customerId ? oldCust : c));
        toast.error('فشلت إضافة فاتورة البيع. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updateSale = useCallback((s: Sale) => {
    const oldS = salesRef.current.find(x => x.id === s.id);
    if (!oldS) return;

    const sameCust  = oldS.customerId === s.customerId;
    const oldCustA  = customersRef.current.find(c => c.id === oldS.customerId);
    const oldCustB  = sameCust ? oldCustA : customersRef.current.find(c => c.id === s.customerId);
    const existingPayment = customerPaymentsRef.current.find(x => x.relatedSaleId === s.id);

    let newPayment:     CustomerPayment | null = null;
    let updatedPayment: CustomerPayment | null = null;
    let deletedPayment: CustomerPayment | null = null;

    const newPaidAmt = s.paymentType === 'credit' ? (s.paidAmount ?? 0) : 0;
    if (s.paymentType === 'cash') {
      if (existingPayment) {
        updatedPayment = { ...existingPayment, amount: s.totalAmount, customerId: s.customerId, date: s.date };
      } else {
        newPayment = { id: generateId(), customerId: s.customerId, amount: s.totalAmount, type: 'cash', relatedSaleId: s.id, date: s.date };
      }
    } else if (newPaidAmt > 0) {
      if (existingPayment) {
        updatedPayment = { ...existingPayment, amount: newPaidAmt, customerId: s.customerId, date: s.date };
      } else {
        newPayment = { id: generateId(), customerId: s.customerId, amount: newPaidAmt, type: 'cash', relatedSaleId: s.id, date: s.date };
      }
    } else {
      if (existingPayment) deletedPayment = existingPayment;
    }

    const oldPaid   = oldS.paymentType === 'credit' ? (oldS.paidAmount ?? 0) : 0;
    const oldImpact = oldS.paymentType === 'cash' ? oldS.totalAmount : (oldS.totalAmount - oldPaid);
    const newImpact = s.paymentType === 'cash' ? s.totalAmount : (s.totalAmount - newPaidAmt);

    setSales(prev => prev.map(x => x.id === s.id ? s : x));
    if (newPayment)     setCustomerPayments(prev => [...prev, newPayment!]);
    if (updatedPayment) setCustomerPayments(prev => prev.map(x => x.id === updatedPayment!.id ? updatedPayment! : x));
    if (deletedPayment) setCustomerPayments(prev => prev.filter(x => x.id !== deletedPayment!.id));

    if (sameCust) {
      const net = newImpact - oldImpact;
      if (net !== 0 && oldCustA)
        setCustomers(prev => prev.map(c =>
          c.id === s.customerId ? { ...c, balance: (oldCustA.balance ?? 0) + net } : c
        ));
    } else {
      if (oldCustA)
        setCustomers(prev => prev.map(c =>
          c.id === oldS.customerId ? { ...c, balance: (oldCustA.balance ?? 0) - oldImpact } : c
        ));
      if (oldCustB)
        setCustomers(prev => prev.map(c =>
          c.id === s.customerId ? { ...c, balance: (oldCustB.balance ?? 0) + newImpact } : c
        ));
    }
    toast.success('تم تحديث فاتورة البيع بنجاح');

    (async () => {
      try {
        await updateRecord(SHEETS.SALES, s);
        if (newPayment)     await insertRecord(SHEETS.CUSTOMER_PAYMENTS, newPayment);
        if (updatedPayment) await updateRecord(SHEETS.CUSTOMER_PAYMENTS, updatedPayment);
        if (deletedPayment) await deleteRecord(SHEETS.CUSTOMER_PAYMENTS, deletedPayment.id);
        if (sameCust) {
          const net = newImpact - oldImpact;
          if (net !== 0 && oldCustA)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) + net });
        } else {
          if (oldCustA)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) - oldImpact });
          if (oldCustB)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustB, balance: (oldCustB.balance ?? 0) + newImpact });
        }
        onSyncOk();
      } catch (err) {
        setSales(prev => prev.map(x => x.id === s.id ? oldS : x));
        if (newPayment)                        setCustomerPayments(prev => prev.filter(x => x.id !== newPayment!.id));
        if (updatedPayment && existingPayment)  setCustomerPayments(prev => prev.map(x => x.id === updatedPayment!.id ? existingPayment : x));
        if (deletedPayment)                    setCustomerPayments(prev => [...prev, deletedPayment!]);
        if (oldCustA) setCustomers(prev => prev.map(c => c.id === oldS.customerId ? oldCustA : c));
        if (!sameCust && oldCustB) setCustomers(prev => prev.map(c => c.id === s.customerId ? oldCustB : c));
        toast.error('فشل تحديث فاتورة البيع. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removeSale = useCallback((id: string) => {
    const oldS    = salesRef.current.find(x => x.id === id);
    const oldCust = oldS ? customersRef.current.find(c => c.id === oldS.customerId) : undefined;
    const sPaid    = oldS?.paymentType === 'credit' ? (oldS?.paidAmount ?? 0) : 0;
    const sImpact  = oldS?.paymentType === 'cash' ? (oldS?.totalAmount ?? 0) : ((oldS?.totalAmount ?? 0) - sPaid);
    const newCustBal = (oldCust?.balance ?? 0) - sImpact;
    const relatedPayment = customerPaymentsRef.current.find(x => x.relatedSaleId === id);

    setSales(prev => prev.filter(x => x.id !== id));
    if (relatedPayment) setCustomerPayments(prev => prev.filter(x => x.id !== relatedPayment.id));
    if (oldCust && oldS)
      setCustomers(prev => prev.map(c => c.id === oldS.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تم حذف فاتورة البيع بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.SALES, id);
        if (relatedPayment) await deleteRecord(SHEETS.CUSTOMER_PAYMENTS, relatedPayment.id);
        if (oldCust && oldS) await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        if (oldS)           setSales(prev => [...prev, oldS]);
        if (relatedPayment) setCustomerPayments(prev => [...prev, relatedPayment]);
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

  // ── Supplier Payments ─────────────────────────────────────────────────────────
  //
  // Mirror of customer payment logic (same balance direction, opposite display column):
  //   سند قبض (receipt, default): supplier refunds/pays us → balance decreases
  //   سند صرف (payment):          we pay supplier          → balance increases
  const addSupplierPayment = useCallback((pay: SupplierPayment) => {
    const oldSup  = suppliersRef.current.find(s => s.id === pay.supplierId);
    const isDebit = pay.voucherType === 'payment'; // صرف increases balance
    const newSupBal = (oldSup?.balance ?? 0) + (isDebit ? pay.amount : -pay.amount);

    setSupplierPayments(prev => [...prev, pay]);
    if (oldSup)
      setSuppliers(prev => prev.map(s => s.id === pay.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تمت إضافة السند بنجاح');

    (async () => {
      try {
        await insertRecord(SHEETS.SUPPLIER_PAYMENTS, pay);
        if (oldSup) await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        setSupplierPayments(prev => prev.filter(x => x.id !== pay.id));
        if (oldSup) setSuppliers(prev => prev.map(s => s.id === pay.supplierId ? oldSup : s));
        toast.error('فشلت إضافة السند. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updateSupplierPayment = useCallback((pay: SupplierPayment) => {
    const oldPay = supplierPaymentsRef.current.find(x => x.id === pay.id);
    if (!oldPay) return;

    const sameSup = oldPay.supplierId === pay.supplierId;
    const oldSupA = suppliersRef.current.find(s => s.id === oldPay.supplierId);
    const oldSupB = sameSup ? oldSupA : suppliersRef.current.find(s => s.id === pay.supplierId);

    // Effect on supplier.balance: receipt (قبض): -amount | payment (صرف): +amount
    const oldEffect = oldPay.voucherType === 'payment' ? oldPay.amount : -oldPay.amount;
    const newEffect = pay.voucherType    === 'payment' ? pay.amount    : -pay.amount;

    setSupplierPayments(prev => prev.map(x => x.id === pay.id ? pay : x));

    if (sameSup && oldSupA) {
      const net = newEffect - oldEffect;
      if (net !== 0)
        setSuppliers(prev => prev.map(s =>
          s.id === pay.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) + net } : s
        ));
    } else {
      if (oldSupA)
        setSuppliers(prev => prev.map(s =>
          s.id === oldPay.supplierId ? { ...s, balance: (oldSupA.balance ?? 0) - oldEffect } : s
        ));
      if (oldSupB)
        setSuppliers(prev => prev.map(s =>
          s.id === pay.supplierId ? { ...s, balance: (oldSupB.balance ?? 0) + newEffect } : s
        ));
    }
    toast.success('تم تحديث السند بنجاح');

    (async () => {
      try {
        await updateRecord(SHEETS.SUPPLIER_PAYMENTS, pay);
        if (sameSup && oldSupA) {
          const net = newEffect - oldEffect;
          if (net !== 0)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) + net });
        } else {
          if (oldSupA)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupA, balance: (oldSupA.balance ?? 0) - oldEffect });
          if (oldSupB)
            await updateRecord(SHEETS.SUPPLIERS, { ...oldSupB, balance: (oldSupB.balance ?? 0) + newEffect });
        }
        onSyncOk();
      } catch (err) {
        setSupplierPayments(prev => prev.map(x => x.id === pay.id ? oldPay : x));
        if (oldSupA) setSuppliers(prev => prev.map(s => s.id === oldPay.supplierId ? oldSupA : s));
        if (!sameSup && oldSupB) setSuppliers(prev => prev.map(s => s.id === pay.supplierId ? oldSupB : s));
        toast.error('فشل تحديث السند. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removeSupplierPayment = useCallback((id: string) => {
    const oldPay = supplierPaymentsRef.current.find(x => x.id === id);
    const oldSup = oldPay ? suppliersRef.current.find(s => s.id === oldPay.supplierId) : undefined;
    // Reverse the effect: receipt had -amount → restore +amount; صرف had +amount → restore -amount
    const restore    = oldPay?.voucherType === 'payment' ? -(oldPay?.amount ?? 0) : (oldPay?.amount ?? 0);
    const newSupBal  = (oldSup?.balance ?? 0) + restore;

    setSupplierPayments(prev => prev.filter(x => x.id !== id));
    if (oldSup && oldPay)
      setSuppliers(prev => prev.map(s => s.id === oldPay.supplierId ? { ...s, balance: newSupBal } : s));
    toast.success('تم حذف السند بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.SUPPLIER_PAYMENTS, id);
        if (oldSup && oldPay) await updateRecord(SHEETS.SUPPLIERS, { ...oldSup, balance: newSupBal });
        onSyncOk();
      } catch (err) {
        if (oldPay) setSupplierPayments(prev => [...prev, oldPay]);
        if (oldSup && oldPay) setSuppliers(prev => prev.map(s => s.id === oldPay.supplierId ? oldSup : s));
        toast.error('فشل حذف السند. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  // ── Customer Payments (standalone — collecting on credit sales) ───────────────
  //
  // سند قبض (receipt, default): customer pays us → balance decreases
  // سند صرف (payment):          we pay customer  → balance increases
  const addCustomerPayment = useCallback((pay: CustomerPayment) => {
    const oldCust    = customersRef.current.find(c => c.id === pay.customerId);
    const isDebit    = pay.voucherType === 'payment';
    const newCustBal = (oldCust?.balance ?? 0) + (isDebit ? pay.amount : -pay.amount);

    setCustomerPayments(prev => [...prev, pay]);
    if (oldCust)
      setCustomers(prev => prev.map(c => c.id === pay.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تمت إضافة السند بنجاح');

    (async () => {
      try {
        await insertRecord(SHEETS.CUSTOMER_PAYMENTS, pay);
        if (oldCust) await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        setCustomerPayments(prev => prev.filter(x => x.id !== pay.id));
        if (oldCust) setCustomers(prev => prev.map(c => c.id === pay.customerId ? oldCust : c));
        toast.error('فشلت إضافة السند. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const updateCustomerPayment = useCallback((pay: CustomerPayment) => {
    const oldPay = customerPaymentsRef.current.find(x => x.id === pay.id);
    if (!oldPay) return;

    const sameCust = oldPay.customerId === pay.customerId;
    const oldCustA = customersRef.current.find(c => c.id === oldPay.customerId);
    const oldCustB = sameCust ? oldCustA : customersRef.current.find(c => c.id === pay.customerId);

    // Effect a payment has on customer.balance:
    //   receipt (قبض): -amount  |  payment/صرف: +amount
    const oldEffect = oldPay.voucherType === 'payment' ? oldPay.amount : -oldPay.amount;
    const newEffect = pay.voucherType    === 'payment' ? pay.amount    : -pay.amount;

    setCustomerPayments(prev => prev.map(x => x.id === pay.id ? pay : x));

    if (sameCust && oldCustA) {
      const net = newEffect - oldEffect;
      if (net !== 0)
        setCustomers(prev => prev.map(c =>
          c.id === pay.customerId ? { ...c, balance: (oldCustA.balance ?? 0) + net } : c
        ));
    } else {
      if (oldCustA)
        setCustomers(prev => prev.map(c =>
          c.id === oldPay.customerId ? { ...c, balance: (oldCustA.balance ?? 0) - oldEffect } : c
        ));
      if (oldCustB)
        setCustomers(prev => prev.map(c =>
          c.id === pay.customerId ? { ...c, balance: (oldCustB.balance ?? 0) + newEffect } : c
        ));
    }
    toast.success('تم تحديث السند بنجاح');

    (async () => {
      try {
        await updateRecord(SHEETS.CUSTOMER_PAYMENTS, pay);
        if (sameCust && oldCustA) {
          const net = newEffect - oldEffect;
          if (net !== 0)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) + net });
        } else {
          if (oldCustA)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustA, balance: (oldCustA.balance ?? 0) - oldEffect });
          if (oldCustB)
            await updateRecord(SHEETS.CUSTOMERS, { ...oldCustB, balance: (oldCustB.balance ?? 0) + newEffect });
        }
        onSyncOk();
      } catch (err) {
        setCustomerPayments(prev => prev.map(x => x.id === pay.id ? oldPay : x));
        if (oldCustA) setCustomers(prev => prev.map(c => c.id === oldPay.customerId ? oldCustA : c));
        if (!sameCust && oldCustB) setCustomers(prev => prev.map(c => c.id === pay.customerId ? oldCustB : c));
        toast.error('فشل تحديث السند. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  const removeCustomerPayment = useCallback((id: string) => {
    const oldPay  = customerPaymentsRef.current.find(x => x.id === id);
    const oldCust = oldPay ? customersRef.current.find(c => c.id === oldPay.customerId) : undefined;
    // Reverse the effect: receipt had -amount effect → restore with +amount; صرف had +amount → restore with -amount
    const restore    = oldPay?.voucherType === 'payment' ? -(oldPay?.amount ?? 0) : (oldPay?.amount ?? 0);
    const newCustBal = (oldCust?.balance ?? 0) + restore;

    setCustomerPayments(prev => prev.filter(x => x.id !== id));
    if (oldCust && oldPay)
      setCustomers(prev => prev.map(c => c.id === oldPay.customerId ? { ...c, balance: newCustBal } : c));
    toast.success('تم حذف دفعة العميل بنجاح');

    (async () => {
      try {
        await deleteRecord(SHEETS.CUSTOMER_PAYMENTS, id);
        if (oldCust && oldPay) await updateRecord(SHEETS.CUSTOMERS, { ...oldCust, balance: newCustBal });
        onSyncOk();
      } catch (err) {
        if (oldPay) setCustomerPayments(prev => [...prev, oldPay]);
        if (oldCust && oldPay) setCustomers(prev => prev.map(c => c.id === oldPay.customerId ? oldCust : c));
        toast.error('فشل حذف دفعة العميل. يرجى المحاولة مرة أخرى.');
        onSyncErr(err);
      }
    })();
  }, [toast]);

  return (
    <DataContext.Provider value={{
      employees, customers, suppliers, purchases, sales, expenses,
      supplierPayments, customerPayments,
      syncStatus, loadAll,
      addEmployee, updateEmployee, removeEmployee,
      addCustomer, updateCustomer, removeCustomer,
      addSupplier, updateSupplier, removeSupplier,
      addPurchase, updatePurchase, removePurchase,
      addSale, updateSale, removeSale,
      addExpense, updateExpense, removeExpense,
      addSupplierPayment, updateSupplierPayment, removeSupplierPayment,
      addCustomerPayment, updateCustomerPayment, removeCustomerPayment,
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
