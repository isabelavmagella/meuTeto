// Configuração lida das variáveis de ambiente (ver README). Os valores são
// lidos a cada uso, não na importação, para os testes poderem ajustá-los.

function numero(nome: string, padrao: number): number {
  const valor = Number(process.env[nome]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

export const config = {
  // Cadastro e login com e-mail/senha. Só "true" liga (uso local); no
  // ambiente público fica desligado e o acesso é só pelo modo demonstração.
  get permitirCadastro() {
    return process.env.ALLOW_REGISTRATION === "true";
  },

  get jwtSecret() {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) throw new Error("JWT_SECRET não definido");
    return segredo;
  },

  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },

  // Origens aceitas pelo CORS, separadas por vírgula.
  get origensFront() {
    return (process.env.FRONT_URL ?? "http://localhost:5173")
      .split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean);
  },

  demo: {
    get duracaoHoras() {
      return numero("DEMO_TTL_HORAS", 6);
    },
    get maxAtivos() {
      return numero("DEMO_MAX_ATIVOS", 100);
    },
    get criacoesPorHoraPorIp() {
      return numero("DEMO_RATE_LIMIT_POR_HORA", 5);
    },
    limites: {
      get transacoes() {
        return numero("DEMO_MAX_TRANSACOES", 300);
      },
      get recorrencias() {
        return numero("DEMO_MAX_RECORRENCIAS", 10);
      },
      get categorias() {
        return numero("DEMO_MAX_CATEGORIAS", 20);
      },
      get subcategorias() {
        return numero("DEMO_MAX_SUBCATEGORIAS", 40);
      },
      get formasPagamento() {
        return numero("DEMO_MAX_FORMAS_PAGAMENTO", 5);
      },
      get orcamentos() {
        return numero("DEMO_MAX_ORCAMENTOS", 30);
      },
      get tamanhoTexto() {
        return numero("DEMO_MAX_TAMANHO_TEXTO", 120);
      },
    },
  },
};
