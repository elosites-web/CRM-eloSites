import { useMemo, useState } from 'react';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { storage } from './firebase';
import { useAuth } from './hooks/useAuth';
import { useClients } from './hooks/useClients';
import { useSyncStatus } from './hooks/useSyncStatus';
import type {
  Client,
  ClientInput,
  DocumentLogEntry,
  MaintenanceLogEntry,
  SignedDocumentEntry,
} from './types';
import { Header } from './components/Header';
import { Tabs, type TabId } from './components/Tabs';
import { Dashboard } from './components/Dashboard';
import { Clientes } from './components/Clientes';
import { Financeiro } from './components/Financeiro';
import { Pipeline } from './components/Pipeline';
import { ClientFormModal } from './components/ClientFormModal';
import { ClientDetailModal } from './components/ClientDetailModal';
import { Login } from './components/Login';
import { computeAlerts, useAlertSound } from './components/Alerts';

function CrmApp({
  email,
  onLogout,
}: {
  email: string | null;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const {
    clients,
    pendingWrites,
    fromCache,
    error,
    addClient,
    updateClient,
    removeClient,
  } = useClients(true);

  const detailClient = detailId
    ? clients.find((c) => c.id === detailId) ?? null
    : null;

  const sync = useSyncStatus(pendingWrites, fromCache);

  const alerts = useMemo(() => computeAlerts(clients), [clients]);
  const { soundOn, toggleSound } = useAlertSound(alerts.length);

  async function handleSave(input: ClientInput) {
    if (editing) {
      await updateClient(editing.id, input);
    } else {
      await addClient(input);
    }
  }

  async function handleDelete(client: Client) {
    if (!confirm('Excluir este cliente? Essa ação não pode ser desfeita.')) return;
    try {
      await removeClient(client.id);
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir agora.');
    }
  }

  async function handleDeleteDocumentLog(client: Client, log: DocumentLogEntry) {
    if (
      !confirm(
        `Excluir "${log.templateLabel}" do histórico de documentos deste cliente? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      const documentLogs = client.documentLogs.filter(
        (l) => !(l.templateId === log.templateId && l.generatedAt === log.generatedAt),
      );
      await updateClient(client.id, { documentLogs });
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir o documento agora.');
    }
  }

  async function handleAddMaintenanceLog(client: Client, note: string) {
    const entry: MaintenanceLogEntry = {
      id: crypto.randomUUID(),
      date: Date.now(),
      note,
    };
    await updateClient(client.id, {
      maintenanceLogs: [...client.maintenanceLogs, entry],
    });
  }

  async function handleDeleteMaintenanceLog(client: Client, log: MaintenanceLogEntry) {
    if (!confirm('Excluir esta solicitação de manutenção do registro?')) return;
    try {
      const maintenanceLogs = client.maintenanceLogs.filter((l) => l.id !== log.id);
      await updateClient(client.id, { maintenanceLogs });
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir agora.');
    }
  }

  async function handleUploadSignedDocument(client: Client, file: File) {
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const storagePath = `clients/${client.id}/signed/${id}-${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const entry: SignedDocumentEntry = {
      id,
      name: file.name,
      url,
      storagePath,
      uploadedAt: Date.now(),
    };
    await updateClient(client.id, {
      signedDocuments: [...client.signedDocuments, entry],
    });
  }

  async function handleDeleteSignedDocument(client: Client, doc: SignedDocumentEntry) {
    if (!confirm(`Excluir "${doc.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      const signedDocuments = client.signedDocuments.filter((d) => d.id !== doc.id);
      await updateClient(client.id, { signedDocuments });
      if (doc.storagePath) {
        await deleteObject(ref(storage, doc.storagePath)).catch((err) => {
          // The Firestore record is already gone; a stray file left in
          // Storage isn't worth blocking the user over.
          console.error('Falha ao remover arquivo do Storage:', err);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir agora.');
    }
  }

  async function handleStageChange(client: Client, stage: string) {
    try {
      await updateClient(client.id, { pipelineStage: stage });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-5">
      <Header
        syncKind={sync.kind}
        syncLabel={sync.label}
        email={email}
        onLogout={onLogout}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
      <Tabs current={tab} onChange={setTab} />

      {error && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {tab === 'dashboard' && (
        <Dashboard
          clients={clients}
          alerts={alerts}
          onAlertClient={(client) => {
            setEditing(client);
            setFormOpen(true);
          }}
        />
      )}
      {tab === 'clientes' && (
        <Clientes
          clients={clients}
          onNew={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onEdit={(client) => {
            setEditing(client);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
          onOpen={(client) => setDetailId(client.id)}
        />
      )}
      {tab === 'financeiro' && <Financeiro clients={clients} />}
      {tab === 'pipeline' && (
        <Pipeline clients={clients} onStageChange={handleStageChange} />
      )}

      <p className="mt-7 text-center text-[11px] leading-relaxed text-muted">
        Dados salvos de forma privada no seu Firebase, com sincronização offline-first.
        Nada é enviado para o site público do ēloSites.
      </p>

      {formOpen && (
        <ClientFormModal
          client={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {detailClient && (
        <ClientDetailModal
          client={detailClient}
          onClose={() => setDetailId(null)}
          onDeleteDocumentLog={(log) => handleDeleteDocumentLog(detailClient, log)}
          onAddMaintenanceLog={(note) => handleAddMaintenanceLog(detailClient, note)}
          onDeleteMaintenanceLog={(log) => handleDeleteMaintenanceLog(detailClient, log)}
          onUploadSignedDocument={(file) =>
            handleUploadSignedDocument(detailClient, file)
          }
          onDeleteSignedDocument={(doc) =>
            handleDeleteSignedDocument(detailClient, doc)
          }
        />
      )}
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, login, logout, resetPassword } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-muted">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} onResetPassword={resetPassword} />;
  }

  // Keyed by uid so a fresh login remounts the whole authenticated UI.
  // This resets the session-only sound toggle to muted and clears any
  // alert-sound interval on logout/unmount.
  return <CrmApp key={user.uid} email={user.email} onLogout={logout} />;
}
