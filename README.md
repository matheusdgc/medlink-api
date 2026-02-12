# MedLink API

API REST para o sistema **MedLink** — Sistema de Gestao de Receitas Medicas Digitais.

## Sumario

- [Tecnologias](#tecnologias)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao](#instalacao)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Endpoints da API](#endpoints-da-api)
- [Autenticacao](#autenticacao)
- [Rate Limiting](#rate-limiting)
- [Modelo de Dados](#modelo-de-dados)
- [Usuarios de Teste](#usuarios-de-teste)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Scripts](#scripts)
- [Tratamento de Erros](#tratamento-de-erros)

## Tecnologias

| Tecnologia              | Versao | Descricao                                    |
| ----------------------- | ------ | -------------------------------------------- |
| Node.js                 | 18+    | Runtime JavaScript                           |
| Express                 | 4.x    | Framework web                                |
| TypeScript              | 5.x    | Tipagem estatica                             |
| Prisma + Accelerate     | 5.x    | ORM com connection pooling e cache           |
| PostgreSQL              | 14+    | Banco de dados relacional                    |
| JWT                     | -      | Autenticacao via access + refresh tokens     |
| bcryptjs                | -      | Hash de senhas                               |
| Zod                     | 3.x    | Validacao de schemas de entrada              |
| express-rate-limit      | 8.x    | Protecao contra forca bruta                  |
| Axios                   | 1.x    | Cliente HTTP (consulta de bulas)             |

## Pre-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- npm

## Instalacao

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variaveis de ambiente
cp .env.example .env
# Edite o .env com suas configuracoes (ver secao abaixo)

# 3. Aplicar o schema no banco
npm run db:push

# 4. Gerar o cliente Prisma
npm run db:generate

# 5. Popular o banco com dados de teste
npm run db:seed

# 6. Iniciar o servidor
npm run dev
```

O servidor estara disponivel em `http://localhost:3333`.

## Variaveis de Ambiente

| Variavel                 | Obrigatoria | Default                    | Descricao                                  |
| ------------------------ | ----------- | -------------------------- | ------------------------------------------ |
| `DATABASE_URL`           | Sim         | -                          | URL de conexao PostgreSQL (Prisma)         |
| `DIRECT_URL`             | Sim         | -                          | URL direta do banco (para migrations)      |
| `JWT_SECRET`             | Sim         | `"default-secret"`         | Chave secreta para assinar access tokens   |
| `JWT_REFRESH_SECRET`     | Sim         | `"default-refresh-secret"` | Chave secreta para assinar refresh tokens  |
| `JWT_EXPIRES_IN`         | Nao         | `"7d"`                     | Validade do access token                   |
| `JWT_REFRESH_EXPIRES_IN` | Nao         | `"30d"`                    | Validade do refresh token                  |
| `PORT`                   | Nao         | `3333`                     | Porta do servidor                          |
| `NODE_ENV`               | Nao         | `"development"`            | Ambiente (development / production / test) |
| `FRONTEND_URL`           | Nao         | `"http://localhost:5173"`  | URL do frontend (CORS)                     |
| `GEMINI_API_KEY`         | Nao         | -                          | Chave da API Gemini                        |

Exemplo de `.env`:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/medlink?schema=public"
DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/medlink?schema=public"
JWT_SECRET="sua-chave-secreta-segura-minimo-32-caracteres"
JWT_REFRESH_SECRET="sua-chave-refresh-segura-minimo-32-caracteres"
```

## Endpoints da API

Base URL: `http://localhost:3333`

### Health Check

| Metodo | Rota      | Descricao              |
| ------ | --------- | ---------------------- |
| GET    | `/health` | Status do servidor     |

### Autenticacao (`/api/auth`)

| Metodo | Rota                   | Descricao                                    | Auth | Rate Limit  |
| ------ | ---------------------- | -------------------------------------------- | ---- | ----------- |
| POST   | `/login/profissional`  | Login para medicos e farmacias               | Nao  | 5/15min     |
| POST   | `/login/paciente`      | Login para pacientes (CPF + Data Nascimento) | Nao  | 5/15min     |
| POST   | `/register/medico`     | Cadastro de medico                           | Nao  | 10/hora     |
| POST   | `/register/farmacia`   | Cadastro de farmacia                         | Nao  | 10/hora     |
| POST   | `/register/paciente`   | Cadastro de paciente                         | Nao  | 10/hora     |
| POST   | `/refresh`             | Renovar access token                         | Nao  | -           |
| POST   | `/logout`              | Invalidar refresh token                      | Nao  | -           |
| GET    | `/me`                  | Perfil do usuario autenticado                | Sim  | -           |
| PUT    | `/perfil/medico`       | Atualizar perfil do medico                   | Sim  | -           |
| PUT    | `/perfil/farmacia`     | Atualizar perfil da farmacia                 | Sim  | -           |

### Pacientes (`/api/pacientes`)

Todas as rotas requerem autenticacao.

| Metodo | Rota                    | Descricao                         | Permissao        |
| ------ | ----------------------- | --------------------------------- | ---------------- |
| GET    | `/me`                   | Perfil do paciente logado         | Paciente         |
| GET    | `/`                     | Listar pacientes                  | Medico, Farmacia |
| GET    | `/documento/:documento` | Buscar por CPF ou Cartao SUS      | Medico, Farmacia |
| GET    | `/:id`                  | Buscar paciente por ID            | Autenticado      |
| GET    | `/:id/receitas`         | Historico de receitas do paciente | Autenticado      |
| PUT    | `/:id`                  | Atualizar dados do paciente       | Autenticado      |

### Receitas (`/api/receitas`)

Todas as rotas requerem autenticacao.

| Metodo | Rota                       | Descricao                 | Permissao        | Rate Limit |
| ------ | -------------------------- | ------------------------- | ---------------- | ---------- |
| GET    | `/`                        | Listar receitas           | Autenticado      | -          |
| GET    | `/historico-dispensacoes`   | Historico de dispensacoes  | Farmacia         | -          |
| GET    | `/codigo/:codigo`          | Buscar receita por codigo | Medico, Farmacia | -          |
| GET    | `/:id`                     | Buscar receita por ID     | Autenticado      | -          |
| POST   | `/`                        | Criar nova receita        | Medico           | 30/15min   |
| PUT    | `/:id`                     | Atualizar receita         | Medico           | -          |
| DELETE | `/:id`                     | Cancelar receita          | Medico           | -          |
| POST   | `/:id/dispensar`           | Dispensar receita         | Farmacia         | 30/15min   |
| POST   | `/:id/renovar`             | Renovar receita           | Medico           | -          |

### Unidades de Saude (`/api/unidades-saude`)

| Metodo | Rota                    | Descricao                  | Auth | Permissao        |
| ------ | ----------------------- | -------------------------- | ---- | ---------------- |
| GET    | `/`                     | Listar unidades de saude   | Nao  | Publica          |
| GET    | `/cidades`              | Listar cidades disponiveis | Nao  | Publica          |
| GET    | `/tipos`                | Listar tipos de unidades   | Nao  | Publica          |
| GET    | `/buscar-por-cep/:cep`  | Buscar unidades por CEP    | Nao  | Publica          |
| GET    | `/:id`                  | Buscar unidade por ID      | Nao  | Publica          |
| POST   | `/`                     | Criar unidade de saude     | Sim  | Medico, Farmacia |
| PUT    | `/:id`                  | Atualizar unidade          | Sim  | Medico, Farmacia |
| DELETE | `/:id`                  | Excluir unidade            | Sim  | Medico, Farmacia |

### Bulas (`/api/bulas`)

Todas as rotas requerem autenticacao (Medico, Farmacia ou Paciente).

| Metodo | Rota                        | Descricao                     |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/consultar/:medicamento`   | Consultar bula de medicamento |
| GET    | `/sugestoes/:termo`         | Sugestoes de medicamentos     |

## Autenticacao

O sistema utiliza **JWT** com dois tipos de tokens:

- **Access Token** — Validade configuravel (padrao 7 dias), usado no header `Authorization: Bearer <token>`
- **Refresh Token** — Validade de 30 dias, armazenado no banco de dados, usado para renovar o access token

O payload do JWT contem: `userId`, `email`, `tipo` (PACIENTE | MEDICO | FARMACIA).

### Login de Profissionais (Medico/Farmacia)

```json
POST /api/auth/login/profissional
{ "email": "medico@medlink.com", "senha": "123456" }
```

### Login de Pacientes

Pacientes fazem login com CPF (ou Cartao SUS) + data de nascimento:

```json
POST /api/auth/login/paciente
{ "cpfOuCartaoSus": "12345678900", "dataNascimento": "1988-05-15" }
```

### Controle de Acesso

O middleware `roleGuard` restringe rotas por tipo de usuario:

| Funcao                    | Descricao                                                        |
| ------------------------- | ---------------------------------------------------------------- |
| `authMiddleware`          | Verifica e decodifica o JWT; anexa `req.user`                    |
| `roleGuard(...tipos)`     | Verifica se `req.user.tipo` esta entre os tipos permitidos       |
| `optionalAuth`            | Tenta autenticar mas prossegue silenciosamente se nao houver JWT |

## Rate Limiting

| Limitador           | Limite           | Janela     | Aplicacao                                    |
| ------------------- | ---------------- | ---------- | -------------------------------------------- |
| Global              | 100 requisicoes  | 15 minutos | Todas as rotas                               |
| Autenticacao        | 5 tentativas     | 15 minutos | Rotas de login (skip em sucesso)             |
| Criacao de conta    | 10 contas        | 1 hora     | Rotas de registro                            |
| Operacoes sensiveis | 30 operacoes     | 15 minutos | Criar receita, dispensar receita             |

Ao atingir o limite, a API retorna status `429 Too Many Requests`.

## Modelo de Dados

### Entidades Principais

```
Usuario (usuarios)
├── Paciente (pacientes)      — CPF, cartao SUS, dados pessoais
├── Medico (medicos)          — CRM, UF, especialidade, dados da clinica
└── Farmacia (farmacias)      — CNPJ, CRF, razao social

Receita (receitas)
├── ItemReceita (itens_receita) — medicamento, dosagem, posologia, quantidade
└── Dispensacao (dispensacoes)   — farmacia que dispensou, data/hora

UnidadeSaude (unidades_saude) — nome, tipo, endereco, coordenadas

RefreshToken (refresh_tokens) — tokens de refresh ativos
```

### Enums

| Enum            | Valores                               |
| --------------- | ------------------------------------- |
| `TipoUsuario`  | PACIENTE, MEDICO, FARMACIA            |
| `StatusReceita` | ATIVA, DISPENSADA, VENCIDA, CANCELADA |
| `Sexo`          | MASCULINO, FEMININO, OUTRO            |

## Usuarios de Teste

Apos executar `npm run db:seed`, os seguintes usuarios estarao disponiveis (senha: `123456`):

### Profissionais (Login por email e senha)

| Tipo     | Email                  | Detalhes                                          |
| -------- | ---------------------- | ------------------------------------------------- |
| Medico   | `medico@medlink.com`   | Dra. Ana Carolina Silva, CRM 123456/SP            |
| Farmacia | `farmacia@medlink.com` | Farmacia Popular Centro, CNPJ 12.345.678/0001-90  |

### Pacientes (Login por CPF + Data de Nascimento)

| Nome                   | CPF           | Data Nascimento |
| ---------------------- | ------------- | --------------- |
| Maria de Souza Silva   | 12345678900   | 1988-05-15      |
| Jose da Silva Oliveira | 98765432100   | 1985-08-31      |
| Ana Paula Santos       | 45678912300   | 1992-12-10      |

### Dados Pre-populados

- **4 receitas** com diferentes status (ATIVA, DISPENSADA, VENCIDA)
- **38 unidades de saude** em Itapeva-SP (UBS, ESF, UPA, CAPS, etc.)

## Estrutura do Projeto

```
medlink-api/
├── prisma/
│   ├── schema.prisma            # Modelo de dados (Prisma)
│   └── seed.ts                  # Dados iniciais para teste
├── src/
│   ├── index.ts                 # Entry point — Express app
│   ├── config/
│   │   ├── database.ts          # Singleton PrismaClient + Accelerate
│   │   └── env.ts               # Variaveis de ambiente tipadas
│   ├── middleware/
│   │   ├── auth.ts              # authMiddleware, roleGuard, optionalAuth
│   │   ├── rateLimiter.ts       # Rate limiters (global, auth, account, sensitive)
│   │   └── errorHandler.ts      # Tratamento centralizado de erros
│   ├── modules/
│   │   ├── auth/                # Autenticacao e registro
│   │   ├── pacientes/           # Gestao de pacientes
│   │   ├── receitas/            # Receitas medicas e dispensacao
│   │   ├── bulas/               # Consulta de bulas de medicamentos
│   │   └── unidades-saude/      # Unidades de saude
│   └── types/
│       └── index.ts             # Tipos, interfaces e classes de erro
├── package.json
└── tsconfig.json
```

### Organizacao dos Modulos

Cada modulo segue o padrao:

```
modulo/
├── modulo.routes.ts        # Definicao de rotas e middleware
├── modulo.controller.ts    # Handlers das rotas (req/res)
├── modulo.service.ts       # Logica de negocio e acesso ao banco
└── modulo.schemas.ts       # Schemas de validacao (Zod) — quando aplicavel
```

## Scripts

| Comando               | Descricao                                                |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Inicia o servidor em modo desenvolvimento com hot-reload |
| `npm run build`       | Compila o TypeScript para JavaScript                     |
| `npm run start`       | Inicia o build de producao                               |
| `npm run db:generate` | Gera o cliente Prisma                                    |
| `npm run db:push`     | Aplica o schema no banco de dados                        |
| `npm run db:migrate`  | Cria uma nova migration                                  |
| `npm run db:studio`   | Abre o Prisma Studio para visualizar dados               |
| `npm run db:seed`     | Popula o banco com dados de teste                        |

## Tratamento de Erros

A API retorna erros no formato padronizado:

```json
{
  "status": "error",
  "message": "Descricao do erro"
}
```

Erros de validacao (Zod) incluem detalhes por campo:

```json
{
  "status": "error",
  "message": "Erro de validação",
  "errors": [
    { "campo": "email", "mensagem": "Email invalido" }
  ]
}
```

### Classes de Erro

| Classe             | Status | Uso                        |
| ------------------ | ------ | -------------------------- |
| `AppError`         | 400    | Erro generico da aplicacao |
| `UnauthorizedError`| 401    | Token ausente ou invalido  |
| `ForbiddenError`   | 403    | Sem permissao de acesso    |
| `NotFoundError`    | 404    | Recurso nao encontrado     |
| `ConflictError`    | 409    | Registro duplicado         |
| `ValidationError`  | 422    | Falha na validacao         |

### Codigos de Status HTTP

| Codigo | Descricao                      |
| ------ | ------------------------------ |
| 200    | Sucesso                        |
| 201    | Criado com sucesso             |
| 400    | Requisicao invalida            |
| 401    | Nao autenticado                |
| 403    | Sem permissao                  |
| 404    | Recurso nao encontrado         |
| 409    | Conflito (registro duplicado)  |
| 422    | Erro de validacao              |
| 429    | Limite de requisicoes excedido |
| 500    | Erro interno do servidor       |
