import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { CLIENTS_COLLECTION, db } from '../firebase';
import { PAYMENT_PROVIDERS, normalizeProjectType } from '../constants';
import type { Client, ClientInput, PaymentProvider } from '../types';

function normalize(data: DocumentData, id: string): Client {
  return {
    id,
    name: String(data.name ?? ''),
    cnpjCpf: String(data.cnpjCpf ?? ''),
    cnpjCpfType: data.cnpjCpfType === 'CNPJ' ? 'CNPJ' : 'CPF',
    segment: String(data.segment ?? ''),
    whatsapp: String(data.whatsapp ?? ''),
    email: String(data.email ?? ''),
    address: String(data.address ?? ''),
    projectType: normalizeProjectType(String(data.projectType ?? '')),
    pipelineStage: String(data.pipelineStage ?? 'lead'),
    domain: String(data.domain ?? ''),
    hosting: String(data.hosting ?? ''),
    repo: String(data.repo ?? ''),
    contractDate: String(data.contractDate ?? ''),
    deliveryDate: String(data.deliveryDate ?? ''),
    budget: typeof data.budget === 'number' ? data.budget : null,
    deposit: typeof data.deposit === 'number' ? data.deposit : null,
    paymentMethod: String(data.paymentMethod ?? ''),
    paymentStatus: String(data.paymentStatus ?? ''),
    paymentProvider: PAYMENT_PROVIDERS.includes(
      String(data.paymentProvider ?? '') as PaymentProvider,
    )
      ? (data.paymentProvider as PaymentProvider)
      : 'Pix direto',
    feesAmount: typeof data.feesAmount === 'number' ? data.feesAmount : null,
    proofReference: String(data.proofReference ?? ''),
    maintenance: Boolean(data.maintenance),
    maintenanceValue:
      typeof data.maintenanceValue === 'number' ? data.maintenanceValue : null,
    notes: String(data.notes ?? ''),
    deliveryUrl: String(data.deliveryUrl ?? ''),
    maintenanceStartDate: String(data.maintenanceStartDate ?? ''),
    paymentInstallments: Array.isArray(data.paymentInstallments)
      ? data.paymentInstallments.map((i: DocumentData) => ({
          date: String(i?.date ?? ''),
          value: typeof i?.value === 'number' ? i.value : null,
          paid: Boolean(i?.paid),
        }))
      : [],
    scopeItems: Array.isArray(data.scopeItems) ? data.scopeItems.map(String) : [],
    budgetNumber:
      typeof data.budgetNumber === 'string' && data.budgetNumber
        ? data.budgetNumber
        : undefined,
    documentLogs: Array.isArray(data.documentLogs)
      ? data.documentLogs.map((d: DocumentData) => ({
          templateId: String(d?.templateId ?? ''),
          templateLabel: String(d?.templateLabel ?? ''),
          generatedAt: typeof d?.generatedAt === 'number' ? d.generatedAt : 0,
        }))
      : [],
    reviewRounds:
      typeof data.reviewRounds === 'number' && data.reviewRounds > 0
        ? data.reviewRounds
        : 3,
    maintenanceLogs: Array.isArray(data.maintenanceLogs)
      ? data.maintenanceLogs.map((m: DocumentData) => ({
          id: String(m?.id ?? ''),
          date: typeof m?.date === 'number' ? m.date : 0,
          note: String(m?.note ?? ''),
        }))
      : [],
    signedDocuments: Array.isArray(data.signedDocuments)
      ? data.signedDocuments.map((s: DocumentData) => ({
          id: String(s?.id ?? ''),
          name: String(s?.name ?? ''),
          url: String(s?.url ?? ''),
          storagePath: String(s?.storagePath ?? ''),
          uploadedAt: typeof s?.uploadedAt === 'number' ? s.uploadedAt : 0,
        }))
      : [],
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
  };
}

export function useClients(enabled: boolean) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingWrites, setPendingWrites] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, CLIENTS_COLLECTION));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const rows = snap.docs.map((d) => normalize(d.data(), d.id));
        rows.sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
        );
        setClients(rows);
        setPendingWrites(snap.metadata.hasPendingWrites);
        setFromCache(snap.metadata.fromCache);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Não foi possível carregar os clientes.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [enabled]);

  const addClient = useCallback(async (input: ClientInput) => {
    const now = Date.now();
    await addDoc(collection(db, CLIENTS_COLLECTION), {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }, []);

  const updateClient = useCallback(
    async (
      id: string,
      // Wider than ClientInput on purpose: ClientInput excludes documentLogs
      // (managed by document generation/deletion, not the edit form), but
      // this hook is also how those log entries get persisted.
      input: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => {
      await updateDoc(doc(db, CLIENTS_COLLECTION, id), {
        ...input,
        updatedAt: Date.now(),
      });
    },
    [],
  );

  const removeClient = useCallback(async (id: string) => {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
  }, []);

  return {
    clients,
    loading,
    pendingWrites,
    fromCache,
    error,
    addClient,
    updateClient,
    removeClient,
  };
}
