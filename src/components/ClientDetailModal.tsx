import { useMemo, useState, type ChangeEvent } from 'react';
import { BRIEFING_BLOCKS, DOCUMENT_TEMPLATES } from '../constants';
import { generateDocument } from '../lib/documents';
import { fmtBRL, parseDateParts, stageLabel } from '../lib/format';
import type {
  Client,
  DocumentLogEntry,
  MaintenanceLogEntry,
  SignedDocumentEntry,
} from '../types';
import { Button, StageBadge } from './ui';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function fmtLogDate(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function ClientDetailModal({
  client,
  onClose,
  onDeleteDocumentLog,
  onAddMaintenanceLog,
  onDeleteMaintenanceLog,
  onUploadSignedDocument,
  onDeleteSignedDocument,
}: {
  client: Client;
  onClose: () => void;
  onDeleteDocumentLog: (log: DocumentLogEntry) => Promise<void> | void;
  onAddMaintenanceLog: (note: string) => Promise<void> | void;
  onDeleteMaintenanceLog: (log: MaintenanceLogEntry) => Promise<void> | void;
  onUploadSignedDocument: (file: File) => Promise<void> | void;
  onDeleteSignedDocument: (doc: SignedDocumentEntry) => Promise<void> | void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [addingMaintenance, setAddingMaintenance] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [briefingBlockIds, setBriefingBlockIds] = useState<string[]>([]);

  const now = new Date();
  const monthLogs = useMemo(
    () =>
      client.maintenanceLogs.filter((log) => {
        const d = new Date(log.date);
        return (
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        );
      }),
    [client.maintenanceLogs, now],
  );
  const monthLabel = `${MONTH_NAMES[now.getMonth()]}/${now.getFullYear()}`;

  async function handleAddMaintenance() {
    setAddingMaintenance(true);
    try {
      await onAddMaintenanceLog(maintenanceNote.trim());
      setMaintenanceNote('');
    } catch (err) {
      console.error(err);
      setError('Não foi possível registrar a solicitação agora.');
    } finally {
      setAddingMaintenance(false);
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDoc(true);
    setError(null);
    try {
      await onUploadSignedDocument(file);
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code;
      setError(
        code
          ? `Não foi possível enviar o arquivo (${code}). Se for a primeira vez, confira se o Storage está ativado e as regras publicadas no Firebase Console.`
          : 'Não foi possível enviar o arquivo agora.',
      );
    } finally {
      setUploadingDoc(false);
    }
  }

  const installments = client.paymentInstallments;
  const paidInstallments = installments.filter((i) => i.paid);
  const paidTotal = paidInstallments.reduce(
    (sum, i) => sum + (Number(i.value) || 0),
    0,
  );
  const pendingTotal = installments.reduce(
    (sum, i) => (i.paid ? sum : sum + (Number(i.value) || 0)),
    0,
  );

  function toggleBriefingBlock(blockId: string) {
    setBriefingBlockIds((current) =>
      current.includes(blockId)
        ? current.filter((item) => item !== blockId)
        : [...current, blockId],
    );
  }

  async function handleGenerate(id: string) {
    setError(null);
    setSuccess(null);
    setBusyId(id);
    try {
      await generateDocument(id, client, { briefingBlockIds });
      const template = DOCUMENT_TEMPLATES.find((t) => t.id === id);
      setSuccess(`"${template?.label ?? 'Documento'}" gerado com sucesso.`);
    } catch (err) {
      console.error(err);
      setError('Não foi possível gerar o documento. Verifique se o modelo existe.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-edge bg-bg2 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-base font-bold">{client.name}</h3>
            {client.legalName && (
              <div className="mt-0.5 text-xs text-muted">{client.legalName}</div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <StageBadge stage={client.pipelineStage} />
              {client.projectType && <span>{client.projectType}</span>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 rounded-[10px] border border-edge bg-card p-3 text-[12.5px]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
              Etapa
            </div>
            <div>{stageLabel(client.pipelineStage)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
              Valor orçado
            </div>
            <div>{fmtBRL(client.budget)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
              Entrada recebida
            </div>
            <div>{fmtBRL(client.deposit)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
              Manutenção/mês
            </div>
            <div>{client.maintenance ? fmtBRL(client.maintenanceValue) : '—'}</div>
          </div>
          {client.domain && (
            <div className="col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                Domínio
              </div>
              <div>{client.domain}</div>
            </div>
          )}
        </div>

        {installments.length > 0 && (
          <div className="mb-5 rounded-[10px] border border-edge bg-card p-3 text-[12.5px]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                Parcelas de pagamento
              </div>
              <div className="text-[11px] text-muted">
                {paidInstallments.length}/{installments.length} pagas
              </div>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {installments.map((inst, idx) => (
                <li
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5"
                >
                  <span className="text-muted">
                    {idx + 1}ª parcela
                    {inst.date ? ` · ${parseDateParts(inst.date).br}` : ''}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{fmtBRL(inst.value)}</span>
                    <span
                      className={`rounded-full border px-1.5 py-[1px] text-[10px] ${
                        inst.paid
                          ? 'border-ok/40 text-ok'
                          : 'border-warn/30 text-warn'
                      }`}
                    >
                      {inst.paid ? 'Paga' : 'Pendente'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-2 text-[11px]">
              <span className="text-muted">
                Recebido em parcelas:{' '}
                <strong className="text-ok">{fmtBRL(paidTotal)}</strong>
              </span>
              <span className="text-muted">
                Pendente em parcelas:{' '}
                <strong className="text-warn">{fmtBRL(pendingTotal)}</strong>
              </span>
            </div>
          </div>
        )}

        {client.maintenance && (
          <div className="mb-5 rounded-[10px] border border-edge bg-card p-3 text-[12.5px]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                Manutenção — solicitações do mês
              </div>
              <div
                className={`text-[11px] font-semibold ${
                  monthLogs.length >= 5
                    ? 'text-danger'
                    : monthLogs.length >= 4
                      ? 'text-warn'
                      : 'text-ok'
                }`}
              >
                {monthLogs.length}/5 usadas em {monthLabel}
              </div>
            </div>

            {monthLogs.length > 0 && (
              <ul className="mb-2.5 flex list-none flex-col gap-1.5 p-0">
                {[...monthLogs]
                  .sort((a, b) => b.date - a.date)
                  .map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-muted"
                    >
                      <span>
                        {fmtLogDate(log.date)}
                        {log.note ? ` · ${log.note}` : ''}
                      </span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteMaintenanceLog(log)}
                      >
                        Excluir
                      </Button>
                    </li>
                  ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded-[10px] border border-edge bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none focus:border-brand-light"
                placeholder="Nota (opcional) — ex.: troca de texto na Home"
                value={maintenanceNote}
                onChange={(e) => setMaintenanceNote(e.target.value)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddMaintenance}
                disabled={addingMaintenance}
              >
                {addingMaintenance ? 'Registrando…' : '+ Registrar solicitação'}
              </Button>
            </div>
          </div>
        )}

        <div className="mb-3">
          <h4 className="m-0 text-[15px] font-bold">Gerar documentos</h4>
          <p className="mt-1 text-xs text-muted">
            Cada documento é baixado em .docx já preenchido com os dados deste cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DOCUMENT_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="flex min-w-0 flex-col rounded-[10px] border border-edge bg-card p-2.5"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-text">
                  {t.label}
                </span>
                <span className="shrink-0 rounded-full border border-edge px-1.5 py-[1px] text-[10px] text-muted">
                  {t.kind === 'client' ? 'Cliente' : 'Interno'}
                </span>
              </div>
              <p className="mb-2 text-[11px] leading-snug text-muted">
                {t.description}
              </p>
              {t.id === 'briefing' && (
                <fieldset className="mb-2 min-w-0 border-0 p-0">
                  <legend className="mb-1 p-0 text-[11px] font-semibold text-muted">
                    Perguntas extras do segmento (opcional)
                  </legend>
                  <div className="flex flex-col gap-1">
                    {BRIEFING_BLOCKS.map((block) => (
                      <label
                        key={block.id}
                        className="flex cursor-pointer items-start gap-1.5 text-[11.5px] text-text"
                      >
                        <input
                          type="checkbox"
                          className="mt-[2px]"
                          checked={briefingBlockIds.includes(block.id)}
                          onChange={() => toggleBriefingBlock(block.id)}
                        />
                        <span>{block.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-auto w-full justify-center"
                onClick={() => handleGenerate(t.id)}
                disabled={busyId !== null}
              >
                {busyId === t.id ? 'Gerando…' : 'Gerar'}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Todos os documentos acima são entregáveis ao cliente. Arquivos internos de
          referência não são gerados aqui.
        </p>

        {client.documentLogs.length > 0 && (
          <div className="mt-4 border-t border-edge pt-3">
            <h4 className="m-0 text-[13px] font-bold">Documentos gerados</h4>
            <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-xs text-muted">
              {[...client.documentLogs]
                .sort((a, b) => b.generatedAt - a.generatedAt)
                .map((log, idx) => (
                  <li
                    key={`${log.templateId}-${log.generatedAt}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      <strong className="text-text">{log.templateLabel}</strong> gerado em{' '}
                      {fmtLogDate(log.generatedAt)}
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDeleteDocumentLog(log)}
                    >
                      Excluir
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-4 border-t border-edge pt-3">
          <h4 className="m-0 text-[13px] font-bold">Documentos assinados</h4>
          <p className="mt-1 text-[11px] text-muted">
            Guarde aqui a cópia assinada que o cliente devolver (contrato, orçamento etc.).
          </p>

          {client.signedDocuments.length > 0 && (
            <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-xs">
              {[...client.signedDocuments]
                .sort((a, b) => b.uploadedAt - a.uploadedAt)
                .map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-light underline decoration-brand-light/40 underline-offset-2"
                    >
                      {doc.name}
                    </a>
                    <span className="flex items-center gap-2 text-muted">
                      enviado em {fmtLogDate(doc.uploadedAt)}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteSignedDocument(doc)}
                      >
                        Excluir
                      </Button>
                    </span>
                  </li>
                ))}
            </ul>
          )}

          <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 text-[12.5px]">
            <span
              className={`inline-flex items-center gap-1.5 rounded-[10px] border border-edge px-3.5 py-2 text-[13px] font-semibold text-text transition-colors hover:bg-white/5 ${
                uploadingDoc ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {uploadingDoc ? 'Enviando…' : '+ Enviar documento assinado'}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadingDoc}
              accept=".pdf,.doc,.docx,image/*"
            />
          </label>
        </div>

        {success && (
          <div className="mt-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
