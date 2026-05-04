// ── Centralized balance calculation ──────────────────────────────────────────
//
// DataContext stores `balance` on Customer/Supplier records and updates it as:
//   - Cash sale/purchase:   += totalAmount  (auto-payment is only a doc record,
//                                            it does NOT reduce the stored balance)
//   - Credit sale/purchase: += (totalAmount − paidAmount)
//   - Standalone payment    -= payment.amount   (payments WITHOUT a relatedSaleId /
//     (no relatedSaleId):                        relatedPurchaseId)
//
// This means the stored balance over-counts cash transactions because the cash
// auto-payment appears in the payments list as a credit but never reduces the
// stored balance.  All functions below undo that discrepancy.

type SaleLike     = { paymentType: string; totalAmount: number; paidAmount?: number };
type CustomerPay  = { amount: number; relatedSaleId?: string; voucherType?: 'receipt' | 'payment' };
type PurchaseLike = { paymentType: string; totalAmount: number; paidAmount?: number };
type SupplierPay  = { amount: number; relatedPurchaseId?: string; voucherType?: 'receipt' | 'payment' };

function txImpact(items: SaleLike[]): number {
  return items.reduce((sum, s) => {
    const paid = s.paymentType === 'credit' ? (s.paidAmount ?? 0) : 0;
    return sum + (s.paymentType === 'cash' ? s.totalAmount : s.totalAmount - paid);
  }, 0);
}

// ── Customers ─────────────────────────────────────────────────────────────────

export function computeCustomerOpeningBalance(
  storedBalance: number,
  sales: SaleLike[],
  payments: CustomerPay[],
): number {
  const standalone = payments.filter(p => !p.relatedSaleId);
  // سند قبض (receipt, default): DataContext subtracted amount → add back to find opening
  const standaloneReceipts = standalone
    .filter(p => p.voucherType !== 'payment')
    .reduce((s, p) => s + p.amount, 0);
  // سند صرف (payment): DataContext ADDED amount → subtract back to find opening
  const standaloneDebits = standalone
    .filter(p => p.voucherType === 'payment')
    .reduce((s, p) => s + p.amount, 0);
  return storedBalance - txImpact(sales) + standaloneReceipts - standaloneDebits;
}

export function computeCustomerCurrentBalance(
  storedBalance: number,
  sales: SaleLike[],
  payments: CustomerPay[],
): number {
  const opening = computeCustomerOpeningBalance(storedBalance, sales, payments);
  const salesDebit   = sales.reduce((s, x) => s + x.totalAmount, 0);
  const payDebit     = payments.filter(p => p.voucherType === 'payment').reduce((s, p) => s + p.amount, 0);
  const payCredit    = payments.filter(p => p.voucherType !== 'payment').reduce((s, p) => s + p.amount, 0);
  return opening + salesDebit + payDebit - payCredit;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
//
// Mirror of customer logic (same balance direction, opposite column placement):
//   سند قبض (receipt): DataContext subtracts amount → add back to find opening
//   سند صرف (payment): DataContext ADDS amount      → subtract back to find opening

export function computeSupplierOpeningBalance(
  storedBalance: number,
  purchases: PurchaseLike[],
  payments: SupplierPay[],
): number {
  const standalone = payments.filter(p => !p.relatedPurchaseId);
  const standaloneReceipts = standalone
    .filter(p => p.voucherType !== 'payment')
    .reduce((s, p) => s + p.amount, 0);
  const standaloneDebits = standalone
    .filter(p => p.voucherType === 'payment')
    .reduce((s, p) => s + p.amount, 0);
  return storedBalance - txImpact(purchases) + standaloneReceipts - standaloneDebits;
}

export function computeSupplierCurrentBalance(
  storedBalance: number,
  purchases: PurchaseLike[],
  payments: SupplierPay[],
): number {
  const opening        = computeSupplierOpeningBalance(storedBalance, purchases, payments);
  const purchaseDebit  = purchases.reduce((s, x) => s + x.totalAmount, 0);
  const payDebit       = payments.filter(p => p.voucherType === 'payment').reduce((s, p) => s + p.amount, 0);
  const payCredit      = payments.filter(p => p.voucherType !== 'payment').reduce((s, p) => s + p.amount, 0);
  return opening + purchaseDebit + payDebit - payCredit;
}
