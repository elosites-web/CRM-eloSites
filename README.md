# ēloSites CRM

CRM interno da ēloSites (uso pessoal, um único usuário): clientes, financeiro, pipeline e geração de documentos `.docx`.

**Stack:** React 18 + TypeScript + Vite + Tailwind, Firebase (Auth + Firestore com cache offline), docxtemplater/pizzip (documentos) e exceljs (planilha).

## Como executar

```bash
npm install
cp .env.example .env    # preencha com os valores do SEU projeto Firebase
npm run dev             # http://localhost:5173
```

Scripts: `npm run lint` (checagem de tipos) · `npm run build` (tipos + build de produção) · `npm run preview`.

Nunca faça commit do `.env`. Só o `.env.example` (com valores de exemplo) vai para o repositório.

## Segurança do Firestore (obrigatório)

A chave do Firebase que vai para o navegador **não é segredo**. Quem protege os dados são as **regras do Firestore** e a **autenticação**:

1. O **User UID** do proprietário está em Firebase Console > Authentication > Users.
2. `firestore.rules` já contém esse UID e espelha as regras publicadas em Firebase Console > Firestore Database > Rules. Ao alterar o arquivo, publique o conteúdo também no console (ou use a Firebase CLI).
3. Em Authentication > Settings (User actions), **desative o cadastro de novos usuários** ("Enable create (sign-up)"), se essa opção estiver disponível na sua conta. Sem isso, qualquer pessoa com a chave pública pode criar uma conta. A regra por UID protege os dados mesmo assim, mas desativar o cadastro reduz a superfície.
4. Teste: sem estar logado, uma leitura da coleção `clients` deve ser negada (use o "Rules Playground" do console).

A tela de login tem recuperação de senha por e-mail ("Esqueci minha senha", via `sendPasswordResetEmail` do Firebase Auth). A mensagem de confirmação é sempre a mesma, exista ou não a conta — evita que alguém descubra por tentativa se um e-mail está cadastrado.

Se as regras forem alteradas, repita o teste do item 4.

## Segurança do Storage (documentos assinados)

Os documentos assinados enviados pelo cliente (Cláusula "Documentos assinados" na ficha do cliente) ficam no Firebase Storage, em `clients/{id}/signed/...`. Diferente de `public/templates/`, esses arquivos **não** são estáticos nem públicos — o acesso passa pelas regras em `storage.rules`, que seguem o mesmo padrão de `firestore.rules` (só o UID do proprietário lê ou escreve). Publique o conteúdo desse arquivo também em Firebase Console > Storage > Rules ao alterá-lo.

## Documentos (.docx)

- **Fonte oficial dos modelos:** `public/templates/`. É de lá que o CRM lê e preenche os arquivos.
- A pasta `templates/` (raiz) **não é usada** pelo CRM e pode conter versões anteriores. Em caso de divergência, vale `public/templates/`.
- Os modelos usam tags do docxtemplater, como `{clientName}`. Ao editar um modelo, preserve as tags. Uma tag quebrada no meio faz o documento falhar. Alterações de redação jurídica devem ser validadas por advogado.
- As variáveis são montadas em `src/lib/documents.ts` (`buildContext`).

Valores padrão definidos no código (alteráveis em `buildContext`):

| Variável | Valor | Uso |
|---|---|---|
| `noticeDays` | 30 | Aviso prévio de cancelamento da manutenção |
| `cureDays` | 30 | Prazo para sanar descumprimento antes da rescisão |
| `maintenanceDueDay` | dia de `maintenanceStartDate` | Vencimento mensal da manutenção |

`reviewRounds` (rodadas de revisão) deixou de ser um valor fixo no código: agora é um campo por cliente (`Client.reviewRounds`, padrão 3), editável no formulário de cadastro junto ao catálogo de escopo.

### Cadastro: nome comercial, razão social e CNPJ/CPF

- `name` = **nome comercial** (nome fantasia) para empresas, ou o nome da pessoa/negócio quando o cliente é CPF. É o que aparece na lista e em `{clientName}`.
- `legalName` = **razão social** (campo exibido só quando o tipo é CNPJ). Disponível nos modelos como `{legalName}`; hoje só o briefing usa.
- `cnpjCpf` + `cnpjCpfType` = número e tipo do documento (`{cnpjCpf}`).
- Contrato, termos e orçamento continuam usando `{clientName}`. Se quiser que a parte contratante de clientes CNPJ seja identificada pela razão social, é uma decisão a tomar (e a validar com advogado) antes de trocar a tag nesses modelos.

### Briefing: base fixa + perguntas por segmento

- O briefing só preenche dados que você já tem: nome comercial, razão social, CNPJ/CPF, endereço, WhatsApp e e-mail. **Domínio não é preenchido** (o cliente responde).
- Ao gerar o briefing, é possível marcar blocos de perguntas extras (profissão regulamentada, parceria/revenda de marca, atendimento local, comércio). Os blocos ficam em `BRIEFING_BLOCKS` (`src/constants.ts`); para criar um novo, basta acrescentar um item lá. Nenhuma alteração no `.docx` é necessária.
- Variáveis do briefing: `{legalName}`, `{nicheSections}` (laço com `{title}` e `{questions}` → `{text}`), `{sendSectionNumber}` e `{finalSectionNumber}` (mantêm a numeração contínua conforme os blocos escolhidos). Montadas em `src/lib/briefing.ts`.

Observações:

- O **número do orçamento** (`ORC-AAAAMMDD-XXXX`) é gerado na primeira geração de documento do cliente e gravado no cadastro; não muda depois.
- Os documentos mostram apenas o **cronograma de parcelas** (valor e data). O status pago/pendente fica somente no CRM.
- Se a manutenção começar nos dias 29, 30 ou 31, o vencimento "todo dia N" não existe em todos os meses. Prefira um início entre os dias 1 e 28.
- **Solicitações de manutenção do mês** (`Client.maintenanceLogs`) são registradas manualmente na ficha do cliente (não são geradas automaticamente) e servem só para você acompanhar o uso da franquia de 5/mês — não entram em nenhum documento gerado.

## Aviso sobre arquivos públicos

Tudo em `public/` é servido como arquivo estático quando o CRM está publicado, inclusive `public/templates/*.docx`. Esses modelos contêm dados do contratado (nome, CPF, endereço, contatos). Como o CRM é de uso exclusivo do proprietário, esse risco foi aceito. Se a URL do CRM for compartilhada com terceiros, reavalie: proteja o acesso no host ou retire esses dados dos modelos.

## Publicação (Netlify)

Comando de build: `npm run build` · Diretório de publicação: `dist`. Configure as variáveis `VITE_FIREBASE_*` no painel do Netlify (Site settings > Environment variables), com os mesmos nomes do `.env.example`.
