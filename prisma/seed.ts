import { PrismaClient, TipoUsuario, Sexo, StatusReceita } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  const senhaHash = await bcrypt.hash("123456", 10);

  // ==================== ADMIN MASTER ====================
  // Usuario com todas as permissoes do sistema.
  // Pode acessar funcionalidades de medico, farmacia e paciente,
  // alem de deletar receitas permanentemente.
  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: "admin@medlink.com" },
    update: {
      nome: "Administrador MedLink",
      senha: senhaHash,
    },
    create: {
      email: "admin@medlink.com",
      senha: senhaHash,
      tipo: TipoUsuario.ADMIN,
      nome: "Administrador MedLink",
    },
  });

  console.log("[seed] Admin processado:", usuarioAdmin.email);

  // ==================== MEDICO ====================
  // upsert: se o email ja existir, atualiza; senao, cria.
  // Isso torna o seed seguro para rodar multiplas vezes sem duplicar dados.
  const usuarioMedico = await prisma.usuario.upsert({
    where: { email: "medico@medlink.com" },
    update: {
      nome: "Dra. Ana Carolina Silva",
      senha: senhaHash,
    },
    create: {
      email: "medico@medlink.com",
      senha: senhaHash,
      tipo: TipoUsuario.MEDICO,
      nome: "Dra. Ana Carolina Silva",
      medico: {
        create: {
          crm: "123456",
          ufCrm: "SP",
          especialidade: "Clinica Geral",
          telefone: "(11) 99999-1111",
          nomeClinica: "Clinica Saude Integral Ltda.",
          enderecoClinica: "Rua da Paz, 123 - Centro, Sao Paulo - SP",
          telefoneClinica: "(11) 3333-4444",
        },
      },
    },
    include: { medico: true },
  });

  console.log("[seed] Medico processado:", usuarioMedico.email);

  // ==================== FARMACIA ====================
  const usuarioFarmacia = await prisma.usuario.upsert({
    where: { email: "farmacia@medlink.com" },
    update: {
      nome: "Farmacia Popular Centro",
      senha: senhaHash,
    },
    create: {
      email: "farmacia@medlink.com",
      senha: senhaHash,
      tipo: TipoUsuario.FARMACIA,
      nome: "Farmacia Popular Centro",
      farmacia: {
        create: {
          cnpj: "12.345.678/0001-90",
          crf: "12345",
          ufCrf: "SP",
          razaoSocial: "Farmacia Popular Centro Ltda.",
          nomeFantasia: "Farmacia Popular",
          telefone: "(11) 3333-5555",
          endereco: "Av. Brasil, 500 - Centro",
          cidade: "Sao Paulo",
          estado: "SP",
          cep: "01310-100",
        },
      },
    },
    include: { farmacia: true },
  });

  console.log("[seed] Farmacia processada:", usuarioFarmacia.email);

  // ==================== PACIENTES ====================
  const pacientesData = [
    {
      email: "maria.silva@email.com",
      nome: "Maria de Souza Silva",
      cpf: "12345678900",
      cartaoSus: "1234567891011",
      dataNascimento: new Date("1988-05-15"),
      sexo: Sexo.FEMININO,
      telefone: "(11) 98888-1111",
    },
    {
      email: "jose.oliveira@email.com",
      nome: "Jose da Silva Oliveira",
      cpf: "98765432100",
      cartaoSus: "9876543210123",
      dataNascimento: new Date("1985-08-31"),
      sexo: Sexo.MASCULINO,
      telefone: "(11) 98888-2222",
    },
    {
      email: "ana.santos@email.com",
      nome: "Ana Paula Santos",
      cpf: "45678912300",
      cartaoSus: "4567891234567",
      dataNascimento: new Date("1992-12-10"),
      sexo: Sexo.FEMININO,
      telefone: "(11) 98888-3333",
    },
  ];

  const pacientesCriados = [];

  for (const p of pacientesData) {
    const usuario = await prisma.usuario.upsert({
      where: { email: p.email },
      update: {
        nome: p.nome,
        senha: senhaHash,
      },
      create: {
        email: p.email,
        senha: senhaHash,
        tipo: TipoUsuario.PACIENTE,
        nome: p.nome,
        paciente: {
          create: {
            cpf: p.cpf,
            cartaoSus: p.cartaoSus,
            dataNascimento: p.dataNascimento,
            sexo: p.sexo,
            telefone: p.telefone,
          },
        },
      },
      include: { paciente: true },
    });
    pacientesCriados.push(usuario);
    console.log("[seed] Paciente processado:", usuario.email);
  }

  // ==================== RECEITAS ====================
  // Receitas so sao criadas se o medico tem perfil vinculado e se nao existem receitas
  // anteriores para evitar duplicatas em re-execucoes do seed.
  const medicoId = usuarioMedico.medico?.id;

  if (medicoId) {
    const receitasExistentes = await prisma.receita.count({
      where: { medicoId },
    });

    if (receitasExistentes === 0) {
      console.log("[seed] Criando receitas de exemplo...");

      const receita1 = await prisma.receita.create({
        data: {
          pacienteId: pacientesCriados[0].paciente!.id,
          medicoId: medicoId,
          status: StatusReceita.ATIVA,
          validadeAte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          observacoes: "Paciente com quadro de infeccao respiratoria.",
          diagnostico: "Amigdalite bacteriana",
          itens: {
            create: [
              {
                medicamento: "Amoxicilina",
                principioAtivo: "Amoxicilina tri-hidratada",
                dosagem: "500mg",
                formaFarmaceutica: "Capsula",
                quantidade: 21,
                posologia: "Tomar 1 capsula a cada 8 horas por 7 dias",
              },
              {
                medicamento: "Ibuprofeno",
                principioAtivo: "Ibuprofeno",
                dosagem: "600mg",
                formaFarmaceutica: "Comprimido",
                quantidade: 10,
                posologia: "Tomar 1 comprimido a cada 8 horas em caso de dor ou febre",
              },
            ],
          },
        },
      });

      console.log("[seed] Receita ativa criada:", receita1.codigo);

      const receita2 = await prisma.receita.create({
        data: {
          pacienteId: pacientesCriados[0].paciente!.id,
          medicoId: medicoId,
          status: StatusReceita.DISPENSADA,
          criadaEm: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          validadeAte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          diagnostico: "Dor muscular",
          itens: {
            create: [
              {
                medicamento: "Dipirona Sódica",
                principioAtivo: "Dipirona monoidratada",
                dosagem: "500mg",
                formaFarmaceutica: "Comprimido",
                quantidade: 20,
                posologia: "Tomar 1 comprimido a cada 6 horas se dor",
              },
            ],
          },
        },
      });

      await prisma.dispensacao.create({
        data: {
          receitaId: receita2.id,
          farmaciaId: usuarioFarmacia.farmacia!.id,
          dataHora: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      });

      console.log("[seed] Receita dispensada criada:", receita2.codigo);

      const receita3 = await prisma.receita.create({
        data: {
          pacienteId: pacientesCriados[0].paciente!.id,
          medicoId: medicoId,
          status: StatusReceita.VENCIDA,
          criadaEm: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          validadeAte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          diagnostico: "Gastrite",
          itens: {
            create: [
              {
                medicamento: "Omeprazol",
                principioAtivo: "Omeprazol",
                dosagem: "20mg",
                formaFarmaceutica: "Capsula",
                quantidade: 30,
                posologia: "Tomar 1 capsula pela manha em jejum",
              },
            ],
          },
        },
      });

      console.log("[seed] Receita vencida criada:", receita3.codigo);

      const receita4 = await prisma.receita.create({
        data: {
          pacienteId: pacientesCriados[1].paciente!.id,
          medicoId: medicoId,
          status: StatusReceita.ATIVA,
          validadeAte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          diagnostico: "Hipertensao",
          itens: {
            create: [
              {
                medicamento: "Losartana Potassica",
                principioAtivo: "Losartana potassica",
                dosagem: "50mg",
                formaFarmaceutica: "Comprimido",
                quantidade: 30,
                posologia: "Tomar 1 comprimido pela manha",
              },
            ],
          },
        },
      });

      console.log("[seed] Receita criada para segundo paciente:", receita4.codigo);
    } else {
      console.log("[seed] Receitas ja existem, pulando criacao de receitas de exemplo.");
    }
  }

  // ==================== UNIDADES DE SAUDE ====================
  const unidades = [
    { nome: "UBS Vila Aparecida", tipo: "UBS", endereco: "Praca Tito Livio Cerioni, s/n - Vila Aparecida", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3224)" },
    { nome: "ESF Jardim Brasil", tipo: "ESF", endereco: "Rua Leoni Gomes Carvalho, s/n - Jardim Brasil", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3212)" },
    { nome: "ESF Vila Santa Maria", tipo: "ESF", endereco: "Rua Alessandro Gois Santos, s/n - Jd. Bonfiglioli", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3227)" },
    { nome: "ESF Vila Taquari", tipo: "ESF", endereco: "Rua Eurico Monteiro de Almeida, 578 - Vila Taquari", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3176)" },
    { nome: "UBS Morada do Bosque", tipo: "UBS", endereco: "Av. Benedito Wilton Kuntz Cardozo, 71", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3218)" },
    { nome: "ESF Vila Sao Benedito", tipo: "ESF", endereco: "Rua Santo Antonio de Catigero, s/n - Vl. Sao Benedito", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3170)" },
    { nome: "UBS Vila Isabel", tipo: "UBS", endereco: "Rua Claudio Alessandro do Melo Amaral, 253", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3167)" },
    { nome: "ESF Jardim Bela Vista", tipo: "ESF", endereco: "Rua Joao Perreti, 240 - Jardim Bela Vista", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3152)" },
    { nome: "ESF Vila Camargo", tipo: "ESF", endereco: "Rua Prospero Jose Perreti, 45 - Vila Camargo", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3521-1223" },
    { nome: "ESF Vila Sao Camilo", tipo: "ESF", endereco: "Rua Josino Celestino dos Santos, s/n - Vl. Sao Camilo", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3173)" },
    { nome: "UBS Parque Sao Jorge", tipo: "UBS", endereco: "Rua Antonio Aidino dos Santos, s/n - Pq. Sao Jorge", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552" },
    { nome: "ESF Cimentolandia", tipo: "ESF", endereco: "Rua Stefano Simonini, 115 - Vila Dom Bosco", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3155)" },
    { nome: "UBS Tancredo Neves", tipo: "UBS", endereco: "Rua Alberto M. Saponga de Oliveira, 57 - Conj. Tancredo", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3230)" },
    { nome: "UBS Jardim Maringa", tipo: "UBS", endereco: "Rua Euclides de Campos, 215 - Jardim Maringa", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552" },
    { nome: "ESF Vila Bom Jesus", tipo: "ESF", endereco: "Rua Itapetininga, s/n - Vila Bom Jesus", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552" },
    { nome: "UBS Jardim Grajau", tipo: "UBS", endereco: "Rua Norberto T. V. Veiga, s/n - Jardim Grajau", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552" },
    { nome: "ESF Jardim Virginia", tipo: "ESF", endereco: "Rua Ernesto de Moura, s/n - Jardim Virginia", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552" },
    { nome: "ESF Guarizinho", tipo: "ESF", endereco: "Rua Jose Goncalves de Almeida, 55 - Dist. Guarizinho", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3252)" },
    { nome: "ESF Sao Roque", tipo: "ESF", endereco: "Rua Pedro Claudino, s/n - Bairro Areia Branca", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 99606-8890" },
    { nome: "ESF Sao Miguel", tipo: "ESF", endereco: "Rua Cotia, s/n - Bairro Sao Miguel", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3521-6361" },
    { nome: "ESF Alto da Brancal", tipo: "ESF", endereco: "Rua Pedro Vaz dos Santos, 57 - Alto da Brancal", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3526-7299" },
    { nome: "ESF Pacova", tipo: "ESF", endereco: "Bairro Pacova (Zona Rural)", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3237)" },
    { nome: "ESF Agrovila", tipo: "ESF", endereco: "Bairro Agrovila I (Zona Rural)", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3255)" },
    { nome: "ESF Caputera", tipo: "ESF", endereco: "Bairro Caputera (Zona Rural)", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3249)" },
    { nome: "ESF Jao", tipo: "ESF", endereco: "Bairro do Jao (Extensao da unidade Guari)", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3246)" },
    { nome: "UPA 24h Itapeva", tipo: "UPA", endereco: "Praca Espiridiao Lucio Martins, 144 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3100)" },
    { nome: "Farmacia Municipal", tipo: "Farmacia", endereco: "Rua Josino Brisola, 547 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3522-0043" },
    { nome: "Centro Materno Infantil", tipo: "Clinica", endereco: "Rua Josino Brisola, 726 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3185)" },
    { nome: "Casa do Adolescente", tipo: "Clinica", endereco: "Av. Paulo Leite de Oliveira, 330 - Conj. Tancredo Neves", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3521-2890" },
    { nome: "CAPS II (Saude Mental)", tipo: "CAPS", endereco: "Rua Olivia Marques, 227 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3136)" },
    { nome: "CAPS AD (Alcool e Drogas)", tipo: "CAPS", endereco: "Rua Celso Magalhaes de Araujo, 348 - Vl. Dom Bosco", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3140)" },
    { nome: "CRI (Ref. do Idoso)", tipo: "Clinica", endereco: "Praca Tito Livio Cerioni, 167 - Vila Aparecida", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3130)" },
    { nome: "CEO II (Odontologia)", tipo: "Clinica", endereco: "Av. Mario Covas, s/n - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3522-1025" },
    { nome: "SAE (Infectologia)", tipo: "Clinica", endereco: "Rua Espiridiao Lucio Martins, 144 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3113)" },
    { nome: "CEREST (Trabalhador)", tipo: "Clinica", endereco: "Rua Ivo Simeao da Silva, 33 - Conj. Tancredo Neves", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3119)" },
    { nome: "Academia da Saude", tipo: "Clinica", endereco: "Rua Joao Perreti (Praca Esp. J. Loureiro) - Jd. Bela Vista", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3146)" },
    { nome: "CDI (Diagnostico)", tipo: "Clinica", endereco: "Praca Espiridiao Lucio Martins, s/n (Junto a UPA)", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3526-8024" },
    { nome: "Central de Regulacao", tipo: "Clinica", endereco: "Rua Olivia Marques, 227 - Centro", cidade: "Itapeva", estado: "SP", cep: "18400-000", telefone: "(15) 3199-1552 (R. 3010)" },
  ];

  // Para unidades de saude, usamos upsert baseado no nome + cidade como identificador unico
  for (const unidade of unidades) {
    const existente = await prisma.unidadeSaude.findFirst({
      where: { nome: unidade.nome, cidade: unidade.cidade },
    });

    if (existente) {
      await prisma.unidadeSaude.update({
        where: { id: existente.id },
        data: unidade,
      });
    } else {
      await prisma.unidadeSaude.create({ data: unidade });
    }
  }

  console.log("[seed] Unidades de saude processadas");

  console.log("\n[seed] Seed concluido com sucesso!");
  console.log("\n[seed] Credenciais de acesso:");
  console.log("   Medico: medico@medlink.com / 123456");
  console.log("   Farmacia: farmacia@medlink.com / 123456");
  console.log("   Paciente (Maria): CPF 12345678900 / Nascimento 1988-05-15");
  console.log("   Paciente (Jose): CPF 98765432100 / Nascimento 1985-08-31");
  console.log("   Paciente (Ana): CPF 45678912300 / Nascimento 1992-12-10");
}

main()
  .catch((e) => {
    console.error("[seed] Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
