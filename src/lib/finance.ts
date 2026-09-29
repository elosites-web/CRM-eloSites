import type { Client } from '../types';

function hasInstallments(client: Client): boolean {
  return (
    Array.isArray(client.paymentInstallments) && client.paymentInstallments.length > 0
  );
}

// When installments are registered they are the source of truth for what has
// actually been received (only paid ones count). Clients without installments
// keep the legacy `deposit` value. Paid installments replace `deposit` — never
// sum both, which would double-count the same payment.
//
// Shared by Dashboard and Financeiro so the two screens can never show a
// different "received" total for the same client again.
export function receivedTotal(client: Client): number {
  if (hasInstallments(client)) {
    return client.paymentInstallments.reduce(
      (sum, inst) => (inst.paid ? sum + (Number(inst.value) || 0) : sum),
      0,
    );
  }
  return Number(client.deposit) || 0;
}

export function remainingBalance(client: Client): number {
  const budget = Number(client.budget) || 0;
  return Math.max(budget - receivedTotal(client), 0);
}
