# MedLink Backend API

API REST para o sistema MedLink - Sistema de Gestao de Receitas Medicas Digitais.

## Sumario

- [Tecnologias](#tecnologias)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao](#instalacao)
- [Endpoints da API](#endpoints-da-api)
- [Autenticacao](#autenticacao)
- [Rate Limiting](#rate-limiting)
- [Usuarios de Teste](#usuarios-de-teste)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Scripts](#scripts)

## Tecnologias

| Tecnologia         | Versao | Descricao                   |
| ------------------ | ------ | --------------------------- |
| Node.js            | 18+    | Runtime JavaScript          |
| Express            | 4.x    | Framework web               |
| TypeScript         | 5.x    | Tipagem estatica            |
| Prisma             | 5.x    | ORM para banco de dados     |
| PostgreSQL         | 14+    | Banco de dados relacional   |
| JWT                | -      | Autenticacao via tokens     |
| bcryptjs           | -      | Hash de senhas              |
| Zod                | 3.x    | Validacao de schemas        |
| express-rate-limit | -      | Protecao contra forca bruta |

## Pre-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- npm ou yarn

## Instalacao

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variaveis de ambiente

Crie o arquivo `.env` baseado no exemplo:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configuracoes:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/medlink?schema=public"
DIRECT_URL="postgresql://postgres:SUA_SENHA@localhost:5432/medlink?schema=public"

JWT_SECRET="sua-chave-secreta-segura-minimo-32-caracteres"
JWT_REFRESH_SECRET="sua-chave-refresh-segura-minimo-32-caracteres"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="30d"

FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3333
```

### 3. Criar o banco de dados

```sql
CREATE DATABASE medlink;
```

### 4. Aplicar o schema no banco

```bash
npm run db:push
```

### 5. Popular o banco com dados de teste

```bash
npm run db:seed
```

### 6. Iniciar o servidor

```bash
npm run dev
```

O servidor estara disponivel em `http://localhost:3333`

## Endpoints da API

### Autenticacao

| Metodo | Rota                           | Descricao                                    | Rate Limit |
| ------ | ------------------------------ | -------------------------------------------- | ---------- |
| POST   | `/api/auth/login/profissional` | Login para medicos e farmacias               | 5/15min    |
| POST   | `/api/auth/login/paciente`     | Login para pacientes (CPF + Data Nascimento) | 5/15min    |
| POST   | `/api/auth/register/medico`    | Cadastro de medico                           | 3/hora     |
| POST   | `/api/auth/register/farmacia`  | Cadastro de farmacia                         | 3/hora     |
| POST   | `/api/auth/register/paciente`  | Cadastro de paciente                         | 3/hora     |
| POST   | `/api/auth/refresh`            | Renovar access token                         | -          |
| POST   | `/api/auth/logout`             | Logout e invalidacao do refresh token        | -          |
| GET    | `/api/auth/me`                 | Perfil do usuario autenticado                | -          |
| PUT    | `/api/auth/perfil/medico`      | Atualizar perfil do medico                   | -          |
| PUT    | `/api/auth/perfil/farmacia`    | Atualizar perfil da farmacia                 | -          |

### Pacientes

| Metodo | Rota                            | Descricao                         | Permissao               |
| ------ | ------------------------------- | --------------------------------- | ----------------------- |
| GET    | `/api/pacientes`                | Listar pacientes                  | Medico, Farmacia        |
| GET    | `/api/pacientes/me`             | Perfil do paciente logado         | Paciente                |
| GET    | `/api/pacientes/:id`            | Buscar paciente por ID            | Todos (com verificacao) |
| GET    | `/api/pacientes/documento/:doc` | Buscar por CPF ou Cartao SUS      | Medico, Farmacia        |
| GET    | `/api/pacientes/:id/receitas`   | Historico de receitas do paciente | Todos (com verificacao) |
| PUT    | `/api/pacientes/:id`            | Atualizar dados do paciente       | Proprio paciente        |

### Receitas

| Metodo | Rota                                   | Descricao                 | Permissao                 |
| ------ | -------------------------------------- | ------------------------- | ------------------------- |
| GET    | `/api/receitas`                        | Listar receitas           | Todos (filtrado por tipo) |
| GET    | `/api/receitas/:id`                    | Buscar receita por ID     | Todos (com verificacao)   |
| GET    | `/api/receitas/codigo/:codigo`         | Buscar receita por codigo | Medico, Farmacia          |
| GET    | `/api/receitas/historico-dispensacoes` | Historico de dispensacoes | Farmacia                  |
| POST   | `/api/receitas`                        | Criar nova receita        | Medico                    |
| PUT    | `/api/receitas/:id`                    | Atualizar receita         | Medico (proprias)         |
| DELETE | `/api/receitas/:id`                    | Cancelar receita          | Medico (proprias)         |
| POST   | `/api/receitas/:id/dispensar`          | Dispensar receita         | Farmacia                  |
| POST   | `/api/receitas/:id/renovar`            | Renovar receita           | Medico (proprias)         |

### Unidades de Saude

| Metodo | Rota                                      | Descricao                  |
| ------ | ----------------------------------------- | -------------------------- |
| GET    | `/api/unidades-saude`                     | Listar unidades de saude   |
| GET    | `/api/unidades-saude/cidades`             | Listar cidades disponiveis |
| GET    | `/api/unidades-saude/tipos`               | Listar tipos de unidades   |
| GET    | `/api/unidades-saude/buscar-por-cep/:cep` | Buscar unidades por CEP    |
| GET    | `/api/unidades-saude/:id`                 | Buscar unidade por ID      |
| POST   | `/api/unidades-saude`                     | Criar unidade de saude     |
| PUT    | `/api/unidades-saude/:id`                 | Atualizar unidade          |
| DELETE | `/api/unidades-saude/:id`                 | Excluir unidade            |

### Bulas

| Metodo | Rota                                | Descricao                     |
| ------ | ----------------------------------- | ----------------------------- |
| GET    | `/api/bulas/consultar/:medicamento` | Consultar bula de medicamento |
| GET    | `/api/bulas/sugestoes/:termo`       | Sugestoes de medicamentos     |

## Autenticacao

### Tokens JWT

O sistema utiliza autenticacao baseada em JWT com dois tipos de tokens:

- **Access Token**: Validade de 1 dia, usado para autenticar requisicoes
- **Refresh Token**: Validade de 30 dias, usado para renovar o access token

### Header de Autenticacao

Todas as rotas protegidas requerem o header:

```
Authorization: Bearer <access_token>
```

### Login de Pacientes

Pacientes fazem login utilizando CPF (ou Cartao SUS) combinado com a data de nascimento como segundo fator de autenticacao:

```json
{
  "cpfOuCartaoSus": "12345678900",
  "dataNascimento": "1988-05-15"
}
```

## Rate Limiting

O sistema implementa protecao contra ataques de forca bruta:

| Tipo                | Limite          | Janela     | Aplicacao                |
| ------------------- | --------------- | ---------- | ------------------------ |
| Global              | 100 requisicoes | 15 minutos | Todas as rotas           |
| Autenticacao        | 5 tentativas    | 15 minutos | Rotas de login           |
| Criacao de conta    | 3 contas        | 1 hora     | Rotas de registro        |
| Operacoes sensiveis | 30 operacoes    | 15 minutos | Criar/dispensar receitas |

Ao atingir o limite, a API retorna status 429 com mensagem de erro.

## Usuarios de Teste

Apos executar o seed, os seguintes usuarios estarao disponiveis:

### Profissionais (Login por email e senha)

| Tipo     | Email                | Senha  |
| -------- | -------------------- | ------ |
| Medico   | medico@medlink.com   | 123456 |
| Farmacia | farmacia@medlink.com | 123456 |

### Pacientes (Login por CPF + Data de Nascimento)

| Nome                   | CPF         | Data Nascimento |
| ---------------------- | ----------- | --------------- |
| Maria de Souza Silva   | 12345678900 | 1988-05-15      |
| Jose da Silva Oliveira | 98765432100 | 1985-08-31      |
| Ana Paula Santos       | 45678912300 | 1992-12-10      |

## Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma          # Modelo de dados
│   ├── seed.ts                # Dados iniciais para teste
│   └── migrations/            # Historico de migrations
├── src/
│   ├── config/
│   │   ├── database.ts        # Conexao com Prisma
│   │   └── env.ts             # Variaveis de ambiente
│   ├── middleware/
│   │   ├── auth.ts            # Middleware JWT
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   └── errorHandler.ts    # Tratamento de erros
│   ├── modules/
│   │   ├── auth/              # Autenticacao e registro
│   │   ├── pacientes/         # CRUD de pacientes
│   │   ├── receitas/          # CRUD de receitas
│   │   ├── bulas/             # Consulta de bulas
│   │   └── unidades-saude/    # CRUD de unidades
│   ├── types/
│   │   └── index.ts           # Tipos TypeScript
│   └── index.ts               # Entry point
├── .env                       # Variaveis de ambiente (nao versionado)
├── .env.example               # Exemplo de configuracao
├── package.json
└── tsconfig.json
```

### Organizacao dos Modulos

Cada modulo segue a estrutura:

```
modulo/
├── modulo.controller.ts    # Handlers das rotas
├── modulo.service.ts       # Logica de negocio
├── modulo.routes.ts        # Definicao de rotas
└── modulo.schemas.ts       # Schemas de validacao Zod
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

### Codigos de Status

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
