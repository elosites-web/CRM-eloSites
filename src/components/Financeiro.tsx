import { fmtBRL, parseDateParts } from '../lib/format';
import { receivedTotal } from '../lib/finance';
import type { Client, Installment } from '../types';
import { EmptyState, Kpi, SectionTitle } from './ui';

function InstallmentsCell({ installments }: { installments: Installment[] }) {
  if (!installments || installments.length === 0) {
    return <span className="text-muted">—</span>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[11.5px] leading-snug">
      {installments.map((inst, idx) => (
        <li key={idx} className="whitespace-nowrap">
          <span className="text-muted">{idx + 1}ª</span>{' '}
          {inst.date ? parseDateParts(inst.date).br : 'sem data'} ·{' '}
          {fmtBRL(inst.value)} ·{' '}
          <span className={inst.paid ? 'text-ok' : 'text-warn'}>
            {inst.paid ? 'Paga' : 'Pendente'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function hasInstallments(client: Client): boolean {
  return (
    Array.isArray(client.paymentInstallments) && client.paymentInstallments.length > 0
  );
}

export function Financeiro({ clients }: { clients: Client[] }) {
  const totalBudget = clients.reduce((s, c) => s + (Number(c.budget) || 0), 0);
  const totalReceived = clients.reduce((s, c) => s + receivedTotal(c), 0);

  const th =
    'border-b border-edge px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-muted';
  const td = 'border-b border-edge px-2.5 py-2.5 align-top';

  return (
    <div>
      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi label="Total orçado" value={fmtBRL(totalBudget)} />
        <Kpi label="Total recebido" value={fmtBRL(totalReceived)} />
        <Kpi label="Saldo a receber" value={fmtBRL(totalBudget - totalReceived)} />
      </div>

      <SectionTitle title="Detalhamento por cliente" />

      {clients.length === 0 ? (
        <EmptyState>
          Nenhum cliente cadastrado ainda. Use a aba <strong>Clientes</strong> para
          adicionar o primeiro.
        </EmptyState>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-[14px] border border-edge bg-card">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>Orçado</th>
                <th className={th}>Recebido</th>
                <th className={th}>Restante</th>
                <th className={th}>Valor líquido</th>
                <th className={th}>Manutenção/mês</th>
                <th className={th}>Processador</th>
                <th className={th}>Pagamento</th>
                <th className={th}>Status</th>
                <th className={th}>Parcelas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const budget = Number(c.budget) || 0;
                const deposit = Number(c.deposit) || 0;
                const hasInst = hasInstallments(c);
                const received = hasInst ? receivedTotal(c) : deposit;
                const remaining = hasInst
                  ? budget - received
                  : Math.max(budget - deposit, 0);
                const net =
                  c.budget == null ? null : c.budget - (c.feesAmount ?? 0);
                return (
                  <tr key={c.id}>
                    <td className={td}>
                      <strong>{c.name}</strong>
                    </td>
                    <td className={td}>{c.budget != null ? fmtBRL(budget) : '—'}</td>
                    <td className={td}>
                      {hasInst
                        ? fmtBRL(received)
                        : c.deposit != null
                          ? fmtBRL(received)
                          : '—'}
                    </td>
                    <td className={td}>
                      {c.budget != null ? fmtBRL(remaining) : '—'}
                    </td>
                    <td className={td}>{net != null ? fmtBRL(net) : '—'}</td>
                    <td className={td}>
                      {c.maintenance ? fmtBRL(Number(c.maintenanceValue) || 0) : '—'}
                    </td>
                    <td className={td}>{c.paymentProvider || '—'}</td>
                    <td className={td}>{c.paymentMethod || '—'}</td>
                    <td className={td}>{c.paymentStatus || '—'}</td>
                    <td className={td}>
                      <InstallmentsCell installments={c.paymentInstallments} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
