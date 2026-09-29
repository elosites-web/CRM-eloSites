import { fmtBRL } from '../lib/format';
import { receivedTotal, remainingBalance } from '../lib/finance';
import { exportBackupJSON, exportSpreadsheet } from '../lib/export';
import type { Client } from '../types';
import { Alerts, type ClientAlert } from './Alerts';
import { Button, EmptyState, Kpi, SectionTitle, StageBadge } from './ui';

export function Dashboard({
  clients,
  alerts,
  onAlertClient,
}: {
  clients: Client[];
  alerts: ClientAlert[];
  onAlertClient: (client: Client) => void;
}) {
  const totalClientes = clients.length;
  const ativos = clients.filter(
    (c) => c.pipelineStage !== 'entregue' || c.maintenance,
  ).length;
  const aReceber = clients.reduce((sum, c) => sum + remainingBalance(c), 0);
  const receitaFechada = clients.reduce((sum, c) => sum + receivedTotal(c), 0);
  const manutencoesAtivas = clients.filter((c) => c.maintenance).length;
  const receitaManutencao = clients.reduce(
    (sum, c) => (c.maintenance ? sum + (Number(c.maintenanceValue) || 0) : sum),
    0,
  );

  const recentes = clients.slice(0, 6);

  return (
    <div>
      <Alerts alerts={alerts} onSelectClient={onAlertClient} />

      <div className="mb-[22px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <Kpi
          label="Clientes"
          value={String(totalClientes)}
          sub={`${ativos} em andamento/ativos`}
        />
        <Kpi
          label="Recebido"
          value={fmtBRL(receitaFechada)}
          sub="entradas + finais registrados"
        />
        <Kpi
          label="A receber"
          value={fmtBRL(aReceber)}
          sub="saldo de projetos em aberto"
        />
        <Kpi
          label="Receita recorrente mensal"
          value={fmtBRL(receitaManutencao)}
          sub={`${manutencoesAtivas} clientes em manutenção`}
        />
      </div>

      <SectionTitle
        title="Clientes recentes"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void exportSpreadsheet(clients).catch((err) => console.error(err));
              }}
            >
              Baixar planilha
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportBackupJSON(clients)}
            >
              Baixar backup (.json)
            </Button>
          </div>
        }
      />

      {clients.length === 0 ? (
        <EmptyState>
          Nenhum cliente cadastrado ainda. Use a aba <strong>Clientes</strong> para
          adicionar o primeiro.
        </EmptyState>
      ) : (
        <div className="table-wrap overflow-x-auto rounded-[14px] border border-edge bg-card">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-edge px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                  Cliente
                </th>
                <th className="border-b border-edge px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                  Projeto
                </th>
                <th className="border-b border-edge px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                  Etapa
                </th>
                <th className="border-b border-edge px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                  Status pagamento
                </th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((c) => (
                <tr key={c.id}>
                  <td className="border-b border-edge px-2.5 py-2.5 align-top last:border-b-0">
                    <strong>{c.name}</strong>
                    {c.segment && <div className="text-muted">{c.segment}</div>}
                  </td>
                  <td className="border-b border-edge px-2.5 py-2.5 align-top">
                    {c.projectType || '—'}
                  </td>
                  <td className="border-b border-edge px-2.5 py-2.5 align-top">
                    <StageBadge stage={c.pipelineStage} />
                  </td>
                  <td className="border-b border-edge px-2.5 py-2.5 align-top">
                    {c.paymentStatus || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
