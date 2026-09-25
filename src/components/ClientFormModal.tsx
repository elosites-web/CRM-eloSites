import { useState, type FormEvent, type ReactNode } from 'react';
import {
  PROJECT_TYPES,
  PAYMENT_PROVIDERS,
  STAGES,
  CUSTOM_PROJECT_TYPE,
  catalogFor,
} from '../constants';
import type {
  Client,
  ClientInput,
  CnpjCpfType,
  Installment,
  PaymentProvider,
} from '../types';
import { Button } from './ui';

const inputClass =
  'w-full rounded-lg border border-edge bg-card px-2.5 py-2 text-[13px] text-text outline-none focus:border-brand';
const labelClass = 'mb-1 block text-[11px] font-semibold text-muted';

function emptyInput(): ClientInput {
  return {
    name: '',
    cnpjCpf: '',
    cnpjCpfType: 'CPF',
    segment: '',
    whatsapp: '',
    email: '',
    address: '',
    projectType: PROJECT_TYPES[0],
    pipelineStage: 'lead',
    domain: '',
    hosting: '',
    repo: '',
    contractDate: '',
    deliveryDate: '',
    budget: null,
    deposit: null,
    paymentMethod: '',
    paymentStatus: '',
    paymentProvider: 'Pix direto',
    feesAmount: null,
    proofReference: '',
    maintenance: false,
    maintenanceValue: null,
    notes: '',
    deliveryUrl: '',
    maintenanceStartDate: '',
    paymentInstallments: [],
    scopeItems: [...catalogFor(PROJECT_TYPES[0])],
    reviewRounds: 3,
  };
}

function fromClient(client: Client): ClientInput {
  return {
    name: client.name,
    cnpjCpf: client.cnpjCpf,
    cnpjCpfType: client.cnpjCpfType,
    segment: client.segment,
    whatsapp: client.whatsapp,
    email: client.email,
    address: client.address,
    projectType: client.projectType,
    pipelineStage: client.pipelineStage,
    domain: client.domain,
    hosting: client.hosting,
    repo: client.repo,
    contractDate: client.contractDate,
    deliveryDate: client.deliveryDate,
    budget: client.budget,
    deposit: client.deposit,
    paymentMethod: client.paymentMethod,
    paymentStatus: client.paymentStatus,
    paymentProvider: client.paymentProvider,
    feesAmount: client.feesAmount,
    proofReference: client.proofReference,
    maintenance: client.maintenance,
    maintenanceValue: client.maintenanceValue,
    notes: client.notes,
    deliveryUrl: client.deliveryUrl,
    maintenanceStartDate: client.maintenanceStartDate,
    paymentInstallments: client.paymentInstallments.map((i) => ({ ...i })),
    scopeItems: [...client.scopeItems],
    reviewRounds: client.reviewRounds || 3,
  };
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`min-w-0 ${full ? 'sm:col-span-2' : ''}`}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function ClientFormModal({
  client,
  onClose,
  onSave,
}: {
  client: Client | null;
  onClose: () => void;
  onSave: (input: ClientInput) => Promise<void> | void;
}) {
  const [form, setForm] = useState<ClientInput>(() =>
    client ? fromClient(client) : emptyInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extraItemText, setExtraItemText] = useState('');

  const catalog = catalogFor(form.projectType);
  const isCustomType = form.projectType === CUSTOM_PROJECT_TYPE;
  // Anything in scopeItems that isn't part of the standard catalog was typed
  // in manually as an "item extra" — no separate field needed to track it.
  const extraItems = form.scopeItems.filter((item) => !catalog.includes(item));

  function set<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function changeProjectType(next: string) {
    setForm((f) => {
      // Existing clients keep their saved scope untouched. New clients get the
      // complete catalog for the selected type pre-selected (Projeto
      // Personalizado has no standard catalog, so the scope stays empty).
      if (client) return { ...f, projectType: next };
      return { ...f, projectType: next, scopeItems: [...catalogFor(next)] };
    });
  }

  function toggleScope(item: string) {
    setForm((f) => ({
      ...f,
      scopeItems: f.scopeItems.includes(item)
        ? f.scopeItems.filter((x) => x !== item)
        : [...f.scopeItems, item],
    }));
  }

  function addExtraItem() {
    const value = extraItemText.trim();
    if (!value) return;
    setForm((f) =>
      f.scopeItems.includes(value) ? f : { ...f, scopeItems: [...f.scopeItems, value] },
    );
    setExtraItemText('');
  }

  function removeExtraItem(item: string) {
    setForm((f) => ({ ...f, scopeItems: f.scopeItems.filter((x) => x !== item) }));
  }

  function addInstallment() {
    setForm((f) => ({
      ...f,
      paymentInstallments: [
        ...f.paymentInstallments,
        { date: '', value: null, paid: false },
      ],
    }));
  }

  function updateInstallment(index: number, patch: Partial<Installment>) {
    setForm((f) => ({
      ...f,
      paymentInstallments: f.paymentInstallments.map((it, i) =>
        i === index ? { ...it, ...patch } : it,
      ),
    }));
  }

  function removeInstallment(index: number) {
    setForm((f) => ({
      ...f,
      paymentInstallments: f.paymentInstallments.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Nome é obrigatório.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave({ ...form, name });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Não foi possível salvar agora. Tente novamente.');
      setBusy(false);
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
        <h3 className="mb-3.5 text-base font-bold">
          {client ? 'Editar cliente' : 'Novo cliente'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field label="Nome / empresa *" full>
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>

            <Field label={form.cnpjCpfType === 'CNPJ' ? 'CNPJ' : 'CPF'}>
              <input
                className={inputClass}
                value={form.cnpjCpf}
                onChange={(e) => set('cnpjCpf', e.target.value)}
              />
            </Field>
            <Field label="Tipo de documento">
              <select
                className={inputClass}
                value={form.cnpjCpfType}
                onChange={(e) => set('cnpjCpfType', e.target.value as CnpjCpfType)}
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </Field>

            <Field label="Segmento">
              <input
                className={inputClass}
                value={form.segment}
                onChange={(e) => set('segment', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                className={inputClass}
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
              />
            </Field>

            <Field label="E-mail">
              <input
                className={inputClass}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Endereço">
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>

            <Field label="Tipo de projeto">
              <select
                className={inputClass}
                value={form.projectType}
                onChange={(e) => changeProjectType(e.target.value)}
              >
                {PROJECT_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etapa (pipeline)">
              <select
                className={inputClass}
                value={form.pipelineStage}
                onChange={(e) => set('pipelineStage', e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Domínio">
              <input
                className={inputClass}
                value={form.domain}
                onChange={(e) => set('domain', e.target.value)}
              />
            </Field>
            <Field label="Hospedagem">
              <input
                className={inputClass}
                placeholder="Netlify"
                value={form.hosting}
                onChange={(e) => set('hosting', e.target.value)}
              />
            </Field>

            <Field label="Repositório GitHub" full>
              <input
                className={inputClass}
                value={form.repo}
                onChange={(e) => set('repo', e.target.value)}
              />
            </Field>

            <Field label="Data contratação">
              <input
                type="date"
                className={inputClass}
                value={form.contractDate}
                onChange={(e) => set('contractDate', e.target.value)}
              />
            </Field>
            <Field label="Data prevista entrega">
              <input
                type="date"
                className={inputClass}
                value={form.deliveryDate}
                onChange={(e) => set('deliveryDate', e.target.value)}
              />
            </Field>

            <Field label="Valor orçado (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.budget ?? ''}
                onChange={(e) =>
                  set('budget', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Entrada recebida (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.deposit ?? ''}
                onChange={(e) =>
                  set('deposit', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </Field>

            <Field label="Forma de pagamento">
              <input
                className={inputClass}
                placeholder="Pix, cartão…"
                value={form.paymentMethod}
                onChange={(e) => set('paymentMethod', e.target.value)}
              />
            </Field>
            <Field label="Status pagamento">
              <input
                className={inputClass}
                placeholder="Em andamento, pago…"
                value={form.paymentStatus}
                onChange={(e) => set('paymentStatus', e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <div className="border-b border-edge pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-brand-light">
                Pagamento
              </div>
            </div>

            <Field label="Processador de pagamento">
              <select
                className={inputClass}
                value={form.paymentProvider}
                onChange={(e) => set('paymentProvider', e.target.value as PaymentProvider)}
              >
                {PAYMENT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Taxas descontadas (R$)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0,00"
                value={form.feesAmount ?? ''}
                onChange={(e) =>
                  set(
                    'feesAmount',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </Field>
            <Field label="Comprovante / referência da transação" full>
              <input
                className={inputClass}
                placeholder="Link do comprovante no Drive ou ID da transação"
                value={form.proofReference}
                onChange={(e) => set('proofReference', e.target.value)}
              />
            </Field>

            <Field label="Manutenção contratada?">
              <select
                className={inputClass}
                value={form.maintenance ? 'true' : 'false'}
                onChange={(e) => set('maintenance', e.target.value === 'true')}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </Field>
            <Field label="Valor manutenção (R$/mês)">
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.maintenanceValue ?? ''}
                onChange={(e) =>
                  set(
                    'maintenanceValue',
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              />
            </Field>

            <Field label="Início da manutenção">
              <input
                type="date"
                className={inputClass}
                value={form.maintenanceStartDate}
                onChange={(e) => set('maintenanceStartDate', e.target.value)}
              />
            </Field>
            <Field label="URL de entrega (site publicado)">
              <input
                className={inputClass}
                placeholder="https://…"
                value={form.deliveryUrl}
                onChange={(e) => set('deliveryUrl', e.target.value)}
              />
            </Field>

            <Field label="Parcelas de pagamento" full>
              <div className="rounded-[10px] border border-edge bg-card p-3">
                {form.paymentInstallments.length === 0 ? (
                  <p className="mb-2 text-xs text-muted">
                    Nenhuma parcela definida. Adicione quantas precisar (data e valor).
                  </p>
                ) : (
                  <div className="mb-3 flex flex-col gap-2.5">
                    {form.paymentInstallments.map((inst, idx) => (
                      <div
                        key={idx}
                        className="rounded-[10px] border border-edge bg-bg2 p-2.5"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                            Parcela {idx + 1}
                          </span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeInstallment(idx)}
                          >
                            Remover
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[11px] text-muted">
                              Data
                            </span>
                            <input
                              type="date"
                              className={`${inputClass} w-full`}
                              value={inst.date}
                              onChange={(e) =>
                                updateInstallment(idx, { date: e.target.value })
                              }
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className="mb-1 block text-[11px] text-muted">
                              Valor (R$)
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              className={`${inputClass} w-full`}
                              value={inst.value ?? ''}
                              onChange={(e) =>
                                updateInstallment(idx, {
                                  value:
                                    e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12.5px] text-text">
                          <input
                            type="checkbox"
                            checked={inst.paid}
                            onChange={(e) =>
                              updateInstallment(idx, { paid: e.target.checked })
                            }
                          />
                          {inst.paid ? 'Parcela paga' : 'Parcela pendente'}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={addInstallment}>
                  + Adicionar parcela
                </Button>
              </div>
            </Field>

            <Field
              label={
                isCustomType
                  ? 'Escopo incluído (itens da Landing Page + Site Institucional)'
                  : 'Escopo incluído (catálogo do tipo de projeto)'
              }
              full
            >
              {catalog.length === 0 ? (
                <p className="rounded-[10px] border border-edge bg-card px-3 py-2 text-xs text-muted">
                  Nenhum catálogo padrão para este tipo de projeto. Use as observações
                  para descrever o escopo.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-[10px] border border-edge bg-card p-3">
                  {catalog.map((item) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-start gap-2 text-[12.5px] text-text"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.scopeItems.includes(item)}
                        onChange={() => toggleScope(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2.5">
                <label className="text-[12.5px] font-semibold text-text" htmlFor="reviewRounds">
                  Rodadas de revisão incluídas:
                </label>
                <select
                  id="reviewRounds"
                  className={`${inputClass} w-20`}
                  value={form.reviewRounds}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reviewRounds: Number(e.target.value) }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {isCustomType && (
                <div className="mt-2.5 rounded-[10px] border border-edge bg-card p-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-muted">
                    Itens extras deste cliente
                  </div>
                  {extraItems.length > 0 && (
                    <ul className="mb-2.5 flex list-none flex-col gap-1.5 p-0">
                      {extraItems.map((item) => (
                        <li
                          key={item}
                          className="flex items-start justify-between gap-2 text-[12.5px] text-text"
                        >
                          <span className="flex items-start gap-2">
                            <span className="mt-0.5 text-brand-light">✓</span>
                            <span>{item}</span>
                          </span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeExtraItem(item)}
                          >
                            Remover
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Descreva o entregável extra pedido pelo cliente…"
                      value={extraItemText}
                      onChange={(e) => setExtraItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addExtraItem();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addExtraItem}
                      disabled={!extraItemText.trim()}
                    >
                      + Adicionar item extra
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    Itens extras entram marcados automaticamente e são salvos junto ao
                    escopo do cliente para constar nos documentos gerados.
                  </p>
                </div>
              )}
            </Field>

            <Field label="Observações" full>
              <textarea
                className={`${inputClass} min-h-[56px] resize-y`}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
