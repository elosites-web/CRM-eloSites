import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { CLIENTS_COLLECTION, db } from '../firebase';
import {
  CUSTOM_PROJECT_TYPE,
  DOCUMENT_TEMPLATES,
  LANDING_CATALOG,
  LEGACY_PROJECT_TYPE,
  SITE_CATALOG,
} from '../constants';
import type { Client, DocumentLogEntry, Installment } from '../types';
import { buildBriefingContext } from './briefing';
import { valorPorExtenso } from './extenso';
import { flag, parseDateParts, todayParts } from './format';

function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(Number(n))) return '';
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function daysBetween(from: string, to: string): string {
  const d1 = Date.parse(from);
  const d2 = Date.parse(to);
  if (isNaN(d1) || isNaN(d2)) return '';
  const days = Math.round((d2 - d1) / 86_400_000);
  return days >= 0 ? String(days) : '';
}

// Documents state the agreed payment schedule only (amount and due date).
// The paid/pending status is deliberately left out: it changes over time, so
// printing it would make a signed document inaccurate. It stays in the CRM.
function formatInstallments(list: Installment[]): string {
  const valid = list.filter((i) => i.date || (i.value !== null && i.value !== undefined));
  if (valid.length === 0) return '—';
  return valid
    .map((inst, idx) => {
      const parts: string[] = [];
      if (inst.value !== null && inst.value !== undefined) parts.push(`R$ ${money(inst.value)}`);
      if (inst.date) parts.push(`em ${parseDateParts(inst.date).br}`);
      return `${idx + 1}ª parcela: ${parts.join(' ')}`;
    })
    .join('; ');
}

// Budget number: generated once per client and then persisted, so the quote
// and the contract that references it always show the same number.
function makeBudgetNumber(client: Client): string {
  const t = todayParts();
  return `ORC-${t.iso.replace(/-/g, '')}-${client.id.slice(0, 4).toUpperCase()}`;
}

// Older records may still carry the previous catalog label that referenced a
// specific hosting provider. Map it to the current neutral publication item so
// previously selected scope is not silently dropped from generated documents.
const LEGACY_SCOPE_LABELS: Record<string, string> = {
  'Publicação no Netlify':
    'Publicação e implantação do site no endereço definido com o cliente',
};

function catalogRows(catalog: string[], selected: string[], active: boolean) {
  const chosen = new Set(selected.map((item) => LEGACY_SCOPE_LABELS[item] ?? item));
  return catalog.map((label) => ({
    label,
    mark: active && chosen.has(label) ? 'X' : ' ',
  }));
}

// Scope items typed manually via "item extra" (Projeto Personalizado) live in
// the same flat scopeItems list as catalog items — anything not found in
// either standard catalog is, by definition, a client-specific extra. These
// feed the existing "Itens adicionais" table in the orçamento template.
function extraScopeItems(client: Client): string[] {
  const known = new Set([
    ...LANDING_CATALOG,
    ...SITE_CATALOG,
    ...Object.keys(LEGACY_SCOPE_LABELS),
  ]);
  return client.scopeItems.filter((item) => !known.has(item));
}

export function buildContext(
  client: Client,
  budgetNumber: string,
  briefingBlockIds: string[] = [],
) {
  const today = todayParts();
  const isLanding = client.projectType === 'Landing page';
  const isSite = client.projectType === 'Site institucional';
  const isCustom =
    client.projectType === CUSTOM_PROJECT_TYPE ||
    client.projectType === LEGACY_PROJECT_TYPE;
  const budget = client.budget;
  const maintenanceStandard = budget ? budget * 0.2 : null;
  // Maintenance is billed on the same day of the month it starts.
  const maintenanceStart = parseDateParts(client.maintenanceStartDate);

  return {
    clientName: client.name,
    legalName: client.legalName,
    cnpjCpf: client.cnpjCpf,
    cnpjCpfType: client.cnpjCpfType,
    address: client.address,
    email: client.email,
    whatsapp: client.whatsapp,
    segment: client.segment,
    projectType: client.projectType,
    domain: client.domain,
    hosting: client.hosting,
    repo: client.repo,
    notes: client.notes,

    budgetFormatted: money(budget),
    budgetWords: valorPorExtenso(budget),
    maintenanceValueFormatted: money(client.maintenanceValue),
    maintenanceWords: valorPorExtenso(client.maintenanceValue),
    maintenanceStandardFormatted: money(maintenanceStandard),

    contractDateBr: parseDateParts(client.contractDate).br,
    deliveryDateBr: parseDateParts(client.deliveryDate).br,
    deliveryDays: daysBetween(client.contractDate, client.deliveryDate),
    maintenanceStartDateBr: parseDateParts(client.maintenanceStartDate).br,
    deliveryUrl: client.deliveryUrl,

    today: today.br,
    todayDay: today.day,
    todayMonth: today.month,
    todayYear: today.year,
    budgetNumber,

    landingMark: flag(isLanding),
    siteMark: flag(isSite),
    otherMark: flag(isCustom),
    otherType: isCustom ? CUSTOM_PROJECT_TYPE : '',
    maintenanceYes: flag(client.maintenance),
    maintenanceNo: flag(!client.maintenance),
    pixMark: flag(/pix/i.test(client.paymentMethod)),
    cardMark: flag(/cart/i.test(client.paymentMethod)),
    otherPayment: '',
    repoYes: flag(Boolean(client.repo)),
    repoNo: flag(!client.repo),
    hostingYes: flag(Boolean(client.hosting)),
    hostingNo: flag(!client.hosting),
    domainYes: flag(Boolean(client.domain)),
    domainNo: flag(!client.domain),
    otherYes: ' ',
    otherNo: ' ',
    transferValue: '',

    installmentsList: formatInstallments(client.paymentInstallments),
    hasInstallments: client.paymentInstallments.some(
      (i) => Boolean(i.date) || (i.value !== null && i.value !== undefined),
    ),
    reviewRounds: String(client.reviewRounds || 3),
    noticeDays: '30',
    cureDays: '30',
    maintenanceDueDay: maintenanceStart.iso ? String(Number(maintenanceStart.day)) : '',

    ...buildBriefingContext(briefingBlockIds),

    scopeItems: client.scopeItems,
    // Projeto Personalizado draws its checklist from both standard catalogs
    // (see CUSTOM_CATALOG), so marks must reflect the selection there too —
    // not just for the matching Landing/Site project type.
    landingCatalog: catalogRows(LANDING_CATALOG, client.scopeItems, isLanding || isCustom),
    siteCatalog: catalogRows(SITE_CATALOG, client.scopeItems, isSite || isCustom),
    additionalItems: (() => {
      const extras = extraScopeItems(client);
      return extras.length > 0
        ? extras.map((item) => ({ item, description: '' }))
        : [{ item: 'Nenhum item adicional.', description: '—' }];
    })(),
  };
}

function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Cliente';
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface GenerateOptions {
  // Optional question blocks (BRIEFING_BLOCKS ids); only used by the briefing.
  briefingBlockIds?: string[];
}

export async function generateDocument(
  templateId: string,
  client: Client,
  options: GenerateOptions = {},
): Promise<void> {
  const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error('Modelo de documento não encontrado.');

  const response = await fetch(`${import.meta.env.BASE_URL}templates/${template.file}`);
  if (!response.ok) {
    throw new Error('Não foi possível carregar o modelo de documento.');
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const docx = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  const budgetNumber = client.budgetNumber || makeBudgetNumber(client);
  docx.render(
    buildContext(
      client,
      budgetNumber,
      templateId === 'briefing' ? options.briefingBlockIds : [],
    ),
  );

  const out = docx.getZip().generate({
    type: 'blob',
    // pizzip defaults to no compression (STORE) when this is omitted, which
    // both bloats the file (5x+ observed) and — per docxtemplater's own
    // guidance — is the configuration known to cause "problemas com o
    // conteúdo" errors in some Word installations. DEFLATE matches how Word
    // itself saves .docx files.
    compression: 'DEFLATE',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }) as Blob;

  download(out, `${template.prefix}_${safeFileName(client.name)}.docx`);

  await updateDoc(doc(db, CLIENTS_COLLECTION, client.id), {
    documentLogs: arrayUnion({
      templateId,
      templateLabel: template.label,
      generatedAt: Date.now(),
    } satisfies DocumentLogEntry),
    ...(client.budgetNumber ? {} : { budgetNumber }),
  }).catch((err: unknown) => console.error(err));
}
