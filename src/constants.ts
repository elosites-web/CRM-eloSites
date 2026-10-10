import type { PaymentProvider } from './types';

export interface Stage {
  id: string;
  label: string;
}

export const STAGES: Stage[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'pagamento', label: 'Pagamento (entrada)' },
  { id: 'desenvolvimento', label: 'Desenvolvimento' },
  { id: 'aprovacao', label: 'Aprovação' },
  { id: 'publicacao', label: 'Publicação' },
  { id: 'entregue', label: 'Entregue' },
  { id: 'manutencao', label: 'Manutenção' },
];

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  'Pix direto',
  'InfinitePay',
  'Mercado Pago',
  'Outro',
];

export const PROJECT_TYPES = [
  'Landing page',
  'Site institucional',
  'Projeto Personalizado',
] as const;

// Legacy value historically persisted in Firestore. Kept only for reading old
// records — never write it again. `normalizeProjectType` maps it to the
// business-facing name so existing clients keep working unchanged.
export const LEGACY_PROJECT_TYPE = 'Outro';
export const CUSTOM_PROJECT_TYPE = 'Projeto Personalizado';

export function normalizeProjectType(value: string | null | undefined): string {
  const v = String(value ?? '');
  return v === LEGACY_PROJECT_TYPE ? CUSTOM_PROJECT_TYPE : v;
}

export const LANDING_CATALOG: string[] = [
  'Página única com rolagem contínua (hero, serviços, prova social, contato)',
  'Botão de WhatsApp com mensagem pré-preenchida em cada chamada',
  'Apresentação detalhada dos serviços ou produtos',
  'Responsiva para celular, tablet e desktop',
  'Publicação e implantação do site no endereço definido com o cliente',
  'Configuração e conexão técnica de domínio e hospedagem contratados diretamente pelo cliente, quando previstos no escopo',
];

export const SITE_CATALOG: string[] = [
  'Múltiplas seções: início, serviços, sobre, galeria, depoimentos e localização',
  'Descrição detalhada de cada serviço oferecido',
  'Galeria de fotos do trabalho ou do espaço',
  'Seção de localização (endereço e/ou mapa)',
  'Botão de WhatsApp integrado ao longo da página',
  'Responsiva para celular, tablet e desktop',
  'Publicação e implantação do site no endereço definido com o cliente',
  'Configuração e conexão técnica de domínio e hospedagem contratados diretamente pelo cliente, quando previstos no escopo',
];

// Projeto Personalizado has no catalog of its own: it offers every item from
// both standard catalogs (deduplicated) as a starting checklist, since a
// custom project can combine landing-page and institutional-site items.
export const CUSTOM_CATALOG: string[] = Array.from(
  new Set([...LANDING_CATALOG, ...SITE_CATALOG]),
);

export function catalogFor(projectType: string): string[] {
  if (projectType === 'Landing page') return LANDING_CATALOG;
  if (projectType === 'Site institucional') return SITE_CATALOG;
  if (projectType === CUSTOM_PROJECT_TYPE || projectType === LEGACY_PROJECT_TYPE) {
    return CUSTOM_CATALOG;
  }
  return [];
}

export interface DocumentTemplate {
  id: string;
  label: string;
  file: string;
  prefix: string;
  // Who the generated file is meant for. Internal/reference documents must
  // never be presented here as ordinary client deliverables.
  kind: 'client' | 'internal';
  description: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'briefing',
    label: 'Briefing',
    file: 'briefing.docx',
    prefix: 'Briefing',
    kind: 'client',
    description: 'Levantamento inicial de informações e conteúdo do projeto.',
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    file: 'orcamento.docx',
    prefix: 'Orcamento',
    kind: 'client',
    description: 'Proposta comercial com escopo, valor e forma de pagamento.',
  },
  {
    id: 'contrato',
    label: 'Contrato Padrão',
    file: 'contrato.docx',
    prefix: 'Contrato',
    kind: 'client',
    description: 'Contrato de prestação de serviços vinculado ao orçamento aprovado.',
  },
  {
    id: 'entrega',
    label: 'Termo de Entrega',
    file: 'termo-entrega.docx',
    prefix: 'Termo_de_Entrega',
    kind: 'client',
    description: 'Aceite de conclusão e entrega final do site.',
  },
  {
    id: 'transferencia',
    label: 'Termo de Transferência de Infraestrutura',
    file: 'termo-transferencia.docx',
    prefix: 'Termo_de_Transferencia',
    kind: 'client',
    description:
      'Transferência de código-fonte, repositório e informações técnicas de implantação e configuração.',
  },
  {
    id: 'manual',
    label: 'Manual de Instruções Básicas',
    file: 'manual-instrucoes.docx',
    prefix: 'Manual_de_Instrucoes',
    kind: 'client',
    description:
      'Orientações ao cliente sobre o repositório, a publicação e o domínio/hospedagem de sua titularidade.',
  },
  {
    id: 'manutencao',
    label: 'Termo de Manutenção Mensal',
    file: 'termo-manutencao.docx',
    prefix: 'Termo_de_Manutencao',
    kind: 'client',
    description: 'Acordo do plano de manutenção mensal, quando contratado.',
  },
  {
    id: 'checklist',
    label: 'Checklist de Entrega',
    file: 'checklist-entrega.docx',
    prefix: 'Checklist_de_Entrega',
    kind: 'internal',
    description:
      'Ritual de entrega por cliente: site, documentação, financeiro, transferência e encerramento — com os entregáveis contratados deste cliente já preenchidos.',
  },
];

// Optional question blocks appended to the Briefing, chosen per client when
// the document is generated. The base briefing stays the same for everyone;
// each block adds the questions that only make sense for that kind of
// business. Questions only ask for information: nothing here states or
// promises anything on the client's behalf.
export interface BriefingBlock {
  id: string;
  label: string;
  title: string;
  questions: string[];
}

export const BRIEFING_BLOCKS: BriefingBlock[] = [
  {
    id: 'regulada',
    label: 'Profissão regulamentada',
    title: 'Profissão regulamentada',
    questions: [
      'Qual é o conselho ou órgão que regula a sua atividade (ex.: CRM, OAB, CREF, CRP, CRC) e qual é o número do seu registro?',
      'O conselho tem regras de publicidade? Você tem acesso a elas? (Envie o link ou o documento.)',
      'Quais títulos, especializações ou formações podem ser divulgados? Você consegue enviar a comprovação?',
      'Pelas regras do seu conselho, é permitido divulgar resultados, depoimentos ou fotos de "antes e depois"? (Sem confirmação, esse tipo de conteúdo não será publicado.)',
    ],
  },
  {
    id: 'marca',
    label: 'Parceria / revenda de marca',
    title: 'Parceria, revenda ou representação de marca',
    questions: [
      'Qual é a sua relação com a marca: parceiro autorizado, revendedor, representante, prestador de serviços ou outra? Como você pode se apresentar publicamente?',
      'Você tem contrato ou documento que comprove essa relação? Pode nos enviar?',
      'Você pode usar o nome e o logo da marca no site? A marca tem manual ou regras de uso? (Envie o material, se houver.)',
      'A marca exige aprovação prévia dos materiais de divulgação? Quem aprova?',
      'Quais produtos, planos ou ofertas da marca podem ser divulgados no site? Podem aparecer preços e condições? Quem mantém essas informações atualizadas?',
      'Existe algo que a marca proíbe dizer ou prometer na divulgação (ex.: velocidades, descontos, prazos)?',
    ],
  },
  {
    id: 'local',
    label: 'Atendimento local / por região',
    title: 'Atendimento local ou por região',
    questions: [
      'Como é feito o atendimento: no endereço da empresa, com hora marcada, na casa ou empresa do cliente, à distância ou só por WhatsApp?',
      'O endereço pode aparecer no site como local para receber visitas? Há estacionamento ou acessibilidade que valha informar?',
      'Quais cidades, bairros ou regiões vocês atendem?',
      'Quais são os dias e horários de atendimento?',
      'A empresa tem perfil no Google (Google Meu Negócio)? Envie o link.',
    ],
  },
  {
    id: 'comercio',
    label: 'Comércio / venda de produtos',
    title: 'Comércio e venda de produtos',
    questions: [
      'Quais são as principais categorias ou marcas de produtos que vocês vendem?',
      'A venda é feita pelo site, por WhatsApp ou só na loja? O site terá catálogo com preços ou apenas "consulte"?',
      'Quais formas de pagamento são aceitas?',
      'Vocês fazem entrega? Em quais regiões, em quanto tempo e com qual taxa?',
      'Qual é a política de trocas, devoluções e garantia?',
    ],
  },
];
