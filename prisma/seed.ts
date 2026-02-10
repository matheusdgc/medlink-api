import { PrismaClient, TipoUsuario, Sexo, StatusReceita } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  await prisma.dispensacao.deleteMany();
  await prisma.itemReceita.deleteMany();
  await prisma.receita.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.medico.deleteMany();
  await prisma.farmacia.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.unidadeSaude.deleteMany();

  const senhaHash = await bcrypt.hash("123456", 10);

  // ==================== MÉDICO ====================
  const usuarioMedico = await prisma.usuario.create({
    data: {
      email: "medico@medlink.com",
      senha: senhaHash,
      tipo: TipoUsuario.MEDICO,
      nome: "Dra. Ana Carolina Silva",
      medico: {
        create: {
          crm: "123456",
          ufCrm: "SP",
          especialidade: "Clínica Geral",
          telefone: "(11) 99999-1111",
          nomeClinica: "Clínica Saúde Integral Ltda.",
          enderecoClinica: "Rua da Paz, 123 - Centro, São Paulo - SP",
          telefoneClinica: "(11) 3333-4444",
        },
      },
    },
    include: { medico: true },
  });

  console.log("✅ Médico criado:", usuarioMedico.email);

  // ==================== FARMÁCIA ====================
  const usuarioFarmacia = await prisma.usuario.create({
    data: {
      email: "farmacia@medlink.com",
      senha: senhaHash,
      tipo: TipoUsuario.FARMACIA,
      nome: "Farmácia Popular Centro",
      farmacia: {
        create: {
          cnpj: "12.345.678/0001-90",
          crf: "12345",
          ufCrf: "SP",
          razaoSocial: "Farmácia Popular Centro Ltda.",
          nomeFantasia: "Farmácia Popular",
          telefone: "(11) 3333-5555",
          endereco: "Av. Brasil, 500 - Centro",
          cidade: "São Paulo",
          estado: "SP",
          cep: "01310-100",
        },
      },
    },
    include: { farmacia: true },
  });

  console.log("✅ Farmácia criada:", usuarioFarmacia.email);

  // ==================== PACIENTES ====================
  const pacientes = [
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
      nome: "José da Silva Oliveira",
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

  for (const pacienteData of pacientes) {
    const usuario = await prisma.usuario.create({
      data: {
        email: pacienteData.email,
        senha: senhaHash,
        tipo: TipoUsuario.PACIENTE,
        nome: pacienteData.nome,
        paciente: {
          create: {
            cpf: pacienteData.cpf,
            cartaoSus: pacienteData.cartaoSus,
            dataNascimento: pacienteData.dataNascimento,
            sexo: pacienteData.sexo,
            telefone: pacienteData.telefone,
          },
        },
      },
      include: { paciente: true },
    });
    pacientesCriados.push(usuario);
    console.log("✅ Paciente criado:", usuario.email);
  }

  // ==================== RECEITAS ====================
  const medicoId = usuarioMedico.medico!.id;

  const receita1 = await prisma.receita.create({
    data: {
      pacienteId: pacientesCriados[0].paciente!.id,
      medicoId: medicoId,
      status: StatusReceita.ATIVA,
      validadeAte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      observacoes: "Paciente com quadro de infecção respiratória.",
      diagnostico: "Amigdalite bacteriana",
      itens: {
        create: [
          {
            medicamento: "Amoxicilina",
            principioAtivo: "Amoxicilina tri-hidratada",
            dosagem: "500mg",
            formaFarmaceutica: "Cápsula",
            quantidade: 21,
            posologia: "Tomar 1 cápsula a cada 8 horas por 7 dias",
          },
          {
            medicamento: "Ibuprofeno",
            principioAtivo: "Ibuprofeno",
            dosagem: "600mg",
            formaFarmaceutica: "Comprimido",
            quantidade: 10,
            posologia:
              "Tomar 1 comprimido a cada 8 horas em caso de dor ou febre",
          },
        ],
      },
    },
  });

  console.log("Receita ativa criada:", receita1.codigo);

  const receita2 = await prisma.receita.create({
    data: {
      pacienteId: pacientesCriados[0].paciente!.id,
      medicoId: medicoId,
      status: StatusReceita.DISPENSADA,
      criadaEm: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 dias atrás
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

  console.log("Receita dispensada criada:", receita2.codigo);

  const receita3 = await prisma.receita.create({
    data: {
      pacienteId: pacientesCriados[0].paciente!.id,
      medicoId: medicoId,
      status: StatusReceita.VENCIDA,
      criadaEm: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 dias atrás
      validadeAte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // vencida há 30 dias
      diagnostico: "Gastrite",
      itens: {
        create: [
          {
            medicamento: "Omeprazol",
            principioAtivo: "Omeprazol",
            dosagem: "20mg",
            formaFarmaceutica: "Cápsula",
            quantidade: 30,
            posologia: "Tomar 1 cápsula pela manhã em jejum",
          },
        ],
      },
    },
  });

  console.log("Receita vencida criada:", receita3.codigo);

  const receita4 = await prisma.receita.create({
    data: {
      pacienteId: pacientesCriados[1].paciente!.id,
      medicoId: medicoId,
      status: StatusReceita.ATIVA,
      validadeAte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      diagnostico: "Hipertensão",
      itens: {
        create: [
          {
            medicamento: "Losartana Potássica",
            principioAtivo: "Losartana potássica",
            dosagem: "50mg",
            formaFarmaceutica: "Comprimido",
            quantidade: 30,
            posologia: "Tomar 1 comprimido pela manhã",
          },
        ],
      },
    },
  });

  console.log("✅ Receita criada para segundo paciente:", receita4.codigo);

  // ==================== UNIDADES DE SAÚDE ====================
  const unidades = [
    {
      nome: "UBS Vila Aparecida",
      tipo: "UBS",
      endereco: "Praça Tito Lívio Cerioni, s/n – Vila Aparecida",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3224)",
    },
    {
      nome: "ESF Jardim Brasil",
      tipo: "ESF",
      endereco: "Rua Leoni Gomes Carvalho, s/n – Jardim Brasil",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3212)",
    },
    {
      nome: "ESF Vila Santa Maria",
      tipo: "ESF",
      endereco: "Rua Alessandro Góis Santos, s/n – Jd. Bonfiglioli",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3227)",
    },
    {
      nome: "ESF Vila Taquari",
      tipo: "ESF",
      endereco: "Rua Eurico Monteiro de Almeida, 578 – Vila Taquari",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3176)",
    },
    {
      nome: "UBS Morada do Bosque",
      tipo: "UBS",
      endereco: "Av. Benedito Wilton Kuntz Cardozo, 71",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3218)",
    },
    {
      nome: "ESF Vila São Benedito",
      tipo: "ESF",
      endereco: "Rua Santo Antônio de Catigeró, s/n – Vl. São Benedito",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3170)",
    },
    {
      nome: "UBS Vila Isabel",
      tipo: "UBS",
      endereco: "Rua Cláudio Alessandro do Melo Amaral, 253",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3167)",
    },
    {
      nome: "ESF Jardim Bela Vista",
      tipo: "ESF",
      endereco: "Rua João Perreti, 240 – Jardim Bela Vista",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3152)",
    },
    {
      nome: "ESF Vila Camargo",
      tipo: "ESF",
      endereco: "Rua Próspero José Perreti, 45 – Vila Camargo",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3521-1223",
    },
    {
      nome: "ESF Vila São Camilo",
      tipo: "ESF",
      endereco: "Rua Josino Celestino dos Santos, s/n – Vl. São Camilo",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3173)",
    },
    {
      nome: "UBS Parque São Jorge",
      tipo: "UBS",
      endereco: "Rua Antônio Aidino dos Santos, s/n – Pq. São Jorge",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552",
    },
    {
      nome: "ESF Cimentolândia",
      tipo: "ESF",
      endereco: "Rua Stefano Simonini, 115 – Vila Dom Bosco",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3155)",
    },
    {
      nome: "UBS Tancredo Neves",
      tipo: "UBS",
      endereco: "Rua Alberto M. Saponga de Oliveira, 57 – Conj. Tancredo",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3230)",
    },
    {
      nome: "UBS Jardim Maringá",
      tipo: "UBS",
      endereco: "Rua Euclides de Campos, 215 – Jardim Maringá",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552",
    },
    {
      nome: "ESF Vila Bom Jesus",
      tipo: "ESF",
      endereco: "Rua Itapetininga, s/n – Vila Bom Jesus",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552",
    },
    {
      nome: "UBS Jardim Grajaú",
      tipo: "UBS",
      endereco: "Rua Norberto T. V. Veiga, s/n – Jardim Grajaú",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552",
    },
    {
      nome: "ESF Jardim Virgínia",
      tipo: "ESF",
      endereco: "Rua Ernesto de Moura, s/n – Jardim Virgínia",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552",
    },
    {
      nome: "ESF Guarizinho",
      tipo: "ESF",
      endereco: "Rua José Gonçalves de Almeida, 55 – Dist. Guarizinho",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3252)",
    },
    {
      nome: "ESF São Roque",
      tipo: "ESF",
      endereco: "Rua Pedro Claudino, s/n – Bairro Areia Branca",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 99606-8890",
    },
    {
      nome: "ESF São Miguel",
      tipo: "ESF",
      endereco: "Rua Cotia, s/n – Bairro São Miguel",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3521-6361",
    },
    {
      nome: "ESF Alto da Brancal",
      tipo: "ESF",
      endereco: "Rua Pedro Vaz dos Santos, 57 – Alto da Brancal",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3526-7299",
    },
    {
      nome: "ESF Pacova",
      tipo: "ESF",
      endereco: "Bairro Pacova (Zona Rural)",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3237)",
    },
    {
      nome: "ESF Agrovila",
      tipo: "ESF",
      endereco: "Bairro Agrovila I (Zona Rural)",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3255)",
    },
    {
      nome: "ESF Caputera",
      tipo: "ESF",
      endereco: "Bairro Caputera (Zona Rural)",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3249)",
    },
    {
      nome: "ESF Jaó",
      tipo: "ESF",
      endereco: "Bairro do Jaó (Extensão da unidade Guari)",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3246)",
    },
    {
      nome: "UPA 24h Itapeva",
      tipo: "UPA",
      endereco: "Praça Espiridião Lúcio Martins, 144 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3100)",
    },
    {
      nome: "Farmácia Municipal",
      tipo: "Farmácia",
      endereco: "Rua Josino Brisola, 547 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3522-0043",
    },
    {
      nome: "Centro Materno Infantil",
      tipo: "Clínica",
      endereco: "Rua Josino Brisola, 726 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3185)",
    },
    {
      nome: "Casa do Adolescente",
      tipo: "Clínica",
      endereco: "Av. Paulo Leite de Oliveira, 330 – Conj. Tancredo Neves",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3521-2890",
    },
    {
      nome: "CAPS II (Saúde Mental)",
      tipo: "CAPS",
      endereco: "Rua Olívia Marques, 227 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3136)",
    },
    {
      nome: "CAPS AD (Álcool e Drogas)",
      tipo: "CAPS",
      endereco: "Rua Celso Magalhães de Araújo, 348 – Vl. Dom Bosco",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3140)",
    },
    {
      nome: "CRI (Ref. do Idoso)",
      tipo: "Clínica",
      endereco: "Praça Tito Lívio Cerioni, 167 – Vila Aparecida",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3130)",
    },
    {
      nome: "CEO II (Odontologia)",
      tipo: "Clínica",
      endereco: "Av. Mário Covas, s/n – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3522-1025",
    },
    {
      nome: "SAE (Infectologia)",
      tipo: "Clínica",
      endereco: "Rua Espiridião Lúcio Martins, 144 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3113)",
    },
    {
      nome: "CEREST (Trabalhador)",
      tipo: "Clínica",
      endereco: "Rua Ivo Simeão da Silva, 33 – Conj. Tancredo Neves",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3119)",
    },
    {
      nome: "Academia da Saúde",
      tipo: "Clínica",
      endereco: "Rua João Perreti (Praça Esp. J. Loureiro) – Jd. Bela Vista",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3146)",
    },
    {
      nome: "CDI (Diagnóstico)",
      tipo: "Clínica",
      endereco: "Praça Espiridião Lúcio Martins, s/n (Junto à UPA)",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3526-8024",
    },
    {
      nome: "Central de Regulação",
      tipo: "Clínica",
      endereco: "Rua Olívia Marques, 227 – Centro",
      cidade: "Itapeva",
      estado: "SP",
      cep: "18400-000",
      telefone: "(15) 3199-1552 (R. 3010)",
    },
  ];

  for (const unidade of unidades) {
    await prisma.unidadeSaude.create({ data: unidade });
  }

  console.log("✅ Unidades de saúde criadas");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📋 Credenciais de acesso:");
  console.log("   Médico: medico@medlink.com / 123456");
  console.log("   Farmácia: farmacia@medlink.com / 123456");
  console.log("   Paciente: maria.silva@email.com / 123456");
  console.log("   Paciente: jose.oliveira@email.com / 123456");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
