# MedLink API

Backend do sistema **MedLink** — plataforma de receitas médicas digitais com emissão, validação e dispensação de receitas via QR Code.

## Visão Geral

O MedLink API é uma REST API construída com **Node.js + Express + Prisma**, responsável por toda a lógica de negócio do sistema: autenticação, controle de acesso por tipo de usuário, gerenciamento de receitas, dispensações, unidades de saúde, bulas de medicamentos e relatórios analíticos.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| ORM | Prisma 6 + Prisma Accelerate |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT (access token 1h + refresh token 30d) |
| Validação | Zod |
| Segurança | bcryptjs, express-rate-limit, CORS |
| Inteligência Artificial | Google Gemini API (geração de bulas) |
| Linguagem | TypeScript |

## Tipos de Usuário

O sistema possui quatro perfis, controlados pelo enum `TipoUsuario`:

| Tipo | Descrição | Acesso |
|---|---|---|
| `MEDICO` | Prescreve receitas, gerencia pacientes e unidades de saúde | Dashboard médico, emissão de receitas, perfil |
| `FARMACIA` | Valida e dispensa receitas via código ou QR Code | Dashboard farmácia, validação, histórico |
| `PACIENTE` | Visualiza suas receitas e exporta em PDF | Dashboard paciente, receitas, perfil |
| `ADMIN` | Acesso total ao sistema, incluindo deleção permanente de receitas | Todos os módulos + gerenciamento global |

## Módulos da API

### Autenticação (`/api/auth`)
- `POST /registro` — cadastro de médicos e farmácias
- `POST /login` — login com e-mail e senha, retorna access + refresh tokens
- `POST /login/paciente` — login do paciente com CPF
- `POST /refresh` — renovação do access token
- `POST /logout` — invalidação do refresh token
- `GET /me` — dados do usuário autenticado

### Receitas (`/api/receitas`)
- `POST /` — criação de nova receita (médico)
- `GET /` — listagem de receitas do médico autenticado
- `GET /:id` — detalhes de uma receita
- `PUT /:id` — atualização de receita
- `DELETE /:id` — cancelamento lógico de receita
- `GET /validar/:codigo` — validação pública de receita por código (farmácia/scan QR)
- `POST /:id/dispensar` — dispensação de receita (farmácia)
- `GET /paciente/:pacienteId` — receitas de um paciente específico

### Pacientes (`/api/pacientes`)
- `GET /` — busca de pacientes por nome ou CPF
- `GET /:id` — perfil completo do paciente
- `POST /` — cadastro de novo paciente
- `PUT /:id` — atualização de dados do paciente
- `GET /minhas-receitas` — receitas do paciente autenticado

### Unidades de Saúde (`/api/unidades-saude`)
- `GET /` — listagem pública de unidades
- `POST /` — cadastro de unidade (médico/admin)
- `PUT /:id` — atualização de unidade
- `DELETE /:id` — remoção de unidade

### Bulas (`/api/bulas`)
- `GET /` — listagem de bulas cadastradas
- `GET /:id` — detalhes de uma bula
- `POST /gerar` — geração automática de bula via Google Gemini AI
- `POST /` — cadastro manual de bula

### Estatísticas (`/api/estatisticas`)
- `GET /visao-geral` — totais do sistema (filtráveis por mês/ano)
- `GET /medicamentos` — ranking dos medicamentos mais prescritos
- `GET /diagnosticos` — diagnósticos mais frequentes
- `GET /status` — distribuição de receitas por status

### Admin (`/api/admin`) — exclusivo para ADMIN
- `GET /resumo` — resumo geral do sistema (total de usuários, receitas por status)
- `GET /receitas` — listagem de todas as receitas com filtros e paginação
- `DELETE /receitas/:id` — deleção **permanente** de uma receita

## Fluxo de uma Receita

```
MEDICO cria receita → status ATIVA
    ↓
FARMACIA valida código → status mantido ATIVA
    ↓
FARMACIA dispensa → status DISPENSADA
    ↓ (automático)
Após data de validade → status VENCIDA
    ↓ (médico ou admin)
Cancelamento → status CANCELADA
    ↓ (apenas admin)
Deleção permanente → registro removido do banco
```

## Estrutura de Pastas

```
medlink-api/
├── prisma/
│   ├── schema.prisma       # Modelos de dados e enums
│   └── seed.ts             # Dados iniciais (usuários de teste)
├── src/
│   ├── config/             # Variáveis de ambiente e conexão DB
│   ├── middleware/         # Auth JWT, roleGuard, rate limiter, erros
│   ├── modules/
│   │   ├── admin/          # Gerenciamento global (ADMIN)
│   │   ├── auth/           # Autenticação e registro
│   │   ├── bulas/          # Bulas com geração via IA
│   │   ├── estatisticas/   # Dados analíticos e relatórios
│   │   ├── pacientes/      # Gestão de pacientes
│   │   ├── receitas/       # Núcleo do sistema
│   │   └── unidades-saude/ # Clínicas e farmácias
│   ├── types/              # Tipos globais TypeScript
│   └── index.ts            # Entry point, configuração Express
└── package.json
```

## Instalação e Configuração

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL rodando (local ou em nuvem — o projeto usa Prisma Accelerate para produção)

### 2. Clonar e instalar

```bash
git clone https://github.com/matheusdgc/medlink-api
cd medlink-api
npm install
```

### 3. Variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

Variáveis necessárias no `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/medlink?schema=public"
JWT_SECRET="sua-chave-secreta-aqui"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="sua-chave-refresh-aqui"
JWT_REFRESH_EXPIRES_IN="30d"
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
GEMINI_API_KEY="sua-chave-gemini-aqui"
```

### 4. Banco de dados

```bash
# Sincronizar schema com o banco (sem migrations)
npx prisma db push

# Popular o banco com dados de teste
npx prisma db seed
```

### 5. Executar

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm run build
npm start
```

A API estará disponível em `http://localhost:3000`.

## Usuários de Teste (após seed)

| Tipo | E-mail | Senha | CPF |
|---|---|---|---|
| Médico | medico@medlink.com | 123456 | — |
| Farmácia | farmacia@medlink.com | 123456 | — |
| Paciente | — | — | 000.000.000-00 |
| Admin | admin@medlink.com | 123456 | — |

## Controle de Acesso

O middleware `roleGuard(tipo)` protege as rotas por tipo de usuário. O tipo `ADMIN` bypassa automaticamente todos os guards, tendo acesso a qualquer rota do sistema. Isso é implementado em `src/middleware/auth.ts`:

```typescript
if ((req.user.tipo as string) === "ADMIN") {
  return next(); // ADMIN passa em qualquer roleGuard
}
```

## Observações Técnicas

- **Prisma enum ADMIN**: o tipo `ADMIN` foi adicionado ao enum `TipoUsuario` no schema. Se o cliente Prisma não foi regenerado localmente, use `"ADMIN" as TipoUsuario` nos módulos admin e `(req.user.tipo as string) === "ADMIN"` no middleware como workaround.

- **Deleção de receita**: a tabela `Dispensacao` não possui cascade automático com `Receita`. Por isso, `admin.service.ts` deleta a dispensação antes da receita. Os `ItemReceita` possuem cascade e são removidos automaticamente.

- **Rate Limiting**: configurado globalmente via `express-rate-limit` para prevenir abuso da API.
