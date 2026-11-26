# Meu Teto

Controle financeiro pessoal: transações (com parcelas, cartão de crédito e
vencimentos), categorias e subcategorias, orçamentos, lançamentos recorrentes e
um dashboard mensal.

- **Front-end:** React + Vite (`front/`)
- **Back-end:** Express 5 + Prisma 7 + PostgreSQL (`back/`)
- **Produção:** front e API na Vercel (a API roda como Vercel Function), banco no
  Neon (plano free)

## Modo demonstração

No ambiente público não existe cadastro nem login: cada visitante clica em
**"Experimentar o app"** e recebe um usuário temporário, isolado dos demais e já
com dados de exemplo dos últimos 3 meses. O usuário expira em 6 horas e é
apagado sozinho, junto com tudo o que ele criou.

- `POST /api/demo/start` cria o demo. Tem rate limit por IP (5 por hora) e um
  teto global de demos ativos (100); acima disso responde 429 com uma mensagem
  amigável. Antes de criar, apaga os demos vencidos.
- `POST /api/demo/restart` ("Recomeçar do zero") apaga o demo atual e cria outro.
- Usuários demo têm limites de quantidade (transações, categorias etc.) e de
  tamanho de texto. Ao estourar, a API responde 403/400 com a mensagem em
  português, e o front a mostra no formulário.
- O token do demo expira junto com o usuário. Uma requisição com token vencido
  recebe 401 com `code: "DEMO_EXPIRADO"`, e o front volta para a tela inicial
  com o aviso de expiração.
- `GET /api/cron/limpar-demos` (Vercel Cron, 1x por dia, com
  `Authorization: Bearer $CRON_SECRET`) apaga os demos vencidos e os registros
  antigos de rate limit.
- As transações recorrentes são lançadas pela função SQL
  `gerar_transacoes_recorrentes` a cada carregamento do app (`GET /api/auth/me`),
  só para o usuário logado. Por isso não há job diário de recorrências em
  produção. `npm run recorrentes:gerar` continua disponível para uso local.

## Rodando localmente

Requisitos: Node 22+ e Docker.

```bash
docker compose up -d              # Postgres em localhost:5433

cd back
cp .env.example .env              # ajuste DATABASE_URL e JWT_SECRET
npm install                       # também roda o prisma generate
npx prisma migrate dev
npm run dev                       # http://localhost:3000

cd ../front
cp .env.example .env
npm install
npm run dev                       # http://localhost:5173
```

Com `ALLOW_REGISTRATION=true` (back) e `VITE_ALLOW_REGISTRATION=true` (front),
cadastro e login com e-mail/senha funcionam normalmente, e a tela inicial também
mostra os links para eles.

### Testes

```bash
cd back && npm test     # integração (Vitest + Supertest)
cd front && npm test    # unidade (Vitest)
```

Os testes do back usam um banco separado, `meu_teto_test`, no mesmo servidor do
`DATABASE_URL`. Ele é criado e migrado automaticamente; para usar outro, defina
`TEST_DATABASE_URL`. No Windows, rode os testes a partir do caminho com a letra
do drive em maiúscula (`C:\...`): com `c:\...` o Vitest carrega o módulo duas
vezes e falha com "failed to find the runner".

## Variáveis de ambiente

### Back-end (`back/`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão usada pelo app. No Neon, a URL **com pooler** (host com `-pooler`). |
| `DATABASE_URL_UNPOOLED` | só em produção | Conexão **direta** do Neon (sem `-pooler`), usada pelo `prisma migrate deploy`. Sem ela, o CLI usa `DATABASE_URL`. |
| `JWT_SECRET` | sim | Segredo dos tokens. Também é a chave do HMAC que guarda o IP no rate limit. Use um valor longo e aleatório. |
| `CRON_SECRET` | em produção | Segredo do Vercel Cron (letras e números, 16+ caracteres). Sem ele, a rota de limpeza sempre responde 401. |
| `FRONT_URL` | em produção | Origem(ns) do front aceitas pelo CORS, separadas por vírgula. Padrão: `http://localhost:5173`. |
| `ALLOW_REGISTRATION` | não | `true` libera cadastro e login com e-mail/senha. **Não defina em produção.** |
| `DEMO_TTL_HORAS` | não | Duração de cada demo (padrão 6). |
| `DEMO_MAX_ATIVOS` | não | Teto de demos ativos ao mesmo tempo (padrão 100). |
| `DEMO_RATE_LIMIT_POR_HORA` | não | Demos criados por IP por hora (padrão 5). |
| `DEMO_MAX_TRANSACOES` | não | Padrão 300 (cada parcela conta como uma). |
| `DEMO_MAX_RECORRENCIAS` | não | Padrão 10. |
| `DEMO_MAX_CATEGORIAS` | não | Padrão 20. |
| `DEMO_MAX_SUBCATEGORIAS` | não | Padrão 40. |
| `DEMO_MAX_FORMAS_PAGAMENTO` | não | Padrão 5. |
| `DEMO_MAX_ORCAMENTOS` | não | Padrão 30. |
| `DEMO_MAX_TAMANHO_TEXTO` | não | Tamanho máximo de descrição/nome no demo (padrão 120). |

Os limites contam também os registros arquivados. O corpo de qualquer requisição
é limitado a 20 kB.

### Front-end (`front/`)

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL da API terminando em `/api`, por exemplo `https://meu-teto-api.vercel.app/api`. |
| `VITE_ALLOW_REGISTRATION` | `true` mostra login e cadastro (só local). **Não defina em produção.** |

As variáveis `VITE_*` entram no bundle no momento do build: depois de mudar
alguma, faça um novo deploy.

## Deploy (Neon → Vercel back → Vercel front)

### 1. Banco no Neon

1. Crie um projeto no [Neon](https://neon.com) (plano Free) na região mais
   próxima dos usuários (ex.: `aws-sa-east-1`).
2. Em **Connect**, copie as duas strings de conexão:
   - **com** "Connection pooling" ligado (host com `-pooler`) → `DATABASE_URL`
   - **sem** pooling → `DATABASE_URL_UNPOOLED`

   O app usa o pooler. As migrations precisam da conexão direta, porque o
   PgBouncer em modo transação não segura o advisory lock do `prisma migrate`.
3. O plano free suspende o banco depois de 5 minutos sem uso. O primeiro acesso
   depois disso leva um instante a mais: a tela inicial já chama
   `/api/health/db` para ir acordando o banco, e o app mostra "Carregando…"
   enquanto isso.

### 2. API na Vercel (pasta `back/`)

1. **Add New → Project**, importe o repositório e defina **Root Directory =
   `back`**. A Vercel detecta o Express (a entrada é `src/app.ts`, que exporta o
   app sem `listen`).
2. Em **Environment Variables** (ambiente *Production*), cadastre `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `CRON_SECRET` e, por enquanto,
   `FRONT_URL=https://exemplo.invalid` (você troca no passo 4). **Não** crie
   `ALLOW_REGISTRATION`. Para gerar os segredos:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Faça o deploy. O `back/vercel.json` define:
   - `buildCommand: npm run vercel-build`, que roda `prisma generate` e, **só em
     produção** (`VERCEL_ENV=production`), `prisma migrate deploy`. Deploys de
     preview não alteram o banco; se quiser previews, use outro banco (por
     exemplo, uma branch do Neon) nas variáveis do ambiente *Preview*.
   - o cron diário `0 6 * * *` (UTC) em `/api/cron/limpar-demos`. No plano
     Hobby, o cron roda 1x por dia em algum momento dentro daquela hora.
4. Teste: `https://SUA-API.vercel.app/api/health` deve responder `{"ok":true}`.

### 3. Front na Vercel (pasta `front/`)

1. Novo projeto no mesmo repositório com **Root Directory = `front`** (preset
   Vite).
2. Variável: `VITE_API_URL=https://SUA-API.vercel.app/api`. **Não** defina
   `VITE_ALLOW_REGISTRATION`.
3. Faça o deploy. O `front/vercel.json` reescreve todas as rotas para
   `index.html` (SPA).

### 4. Ligar os dois

1. No projeto da API, troque `FRONT_URL` pela URL do front (ex.:
   `https://meu-teto.vercel.app`; para aceitar também um domínio próprio,
   separe por vírgula) e faça **Redeploy**.
2. Abra o front, clique em "Experimentar o app" e confira o banner do modo
   demonstração.
3. (Opcional) Em **Settings → Cron Jobs** do projeto da API, use "Run" para
   testar a limpeza.

### Checklist de segurança

- `ALLOW_REGISTRATION` e `VITE_ALLOW_REGISTRATION` **não** existem em produção:
  `/api/auth/register` e `/api/auth/login` respondem 403.
- Segredos ficam só nas variáveis da Vercel, nunca no repositório (`.env` está
  no `.gitignore`).
- A API usa `helmet`, CORS restrito ao `FRONT_URL` e `trust proxy` só na Vercel,
  então o IP do rate limit não pode ser forjado localmente. O banco guarda
  apenas o HMAC do IP.
