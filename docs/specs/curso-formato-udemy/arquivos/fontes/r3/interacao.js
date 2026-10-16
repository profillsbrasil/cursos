const erros = [];
window.addEventListener("error", (e) => erros.push(e.message));
setTimeout(() => {
  const r = {};
  const j = document.querySelector(".janela");
  const $ = (s) => j.querySelector(s);
  const $$ = (s) => [...j.querySelectorAll(s)];
  const clicar = (s) => {
    const el = typeof s === "string" ? $(s) : s;
    if (!el) throw new Error(`sem elemento: ${s}`);
    el.click();
  };
  const texto = (el) => el?.textContent.replace(/\s+/g, " ").trim() ?? null;
  const escrever = (s, valor) => {
    $(s)?.focus();
    const el = $(s);
    if (!el) throw new Error(`sem campo: ${s}`);
    el.value = valor;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  };
  const sair = () => document.activeElement?.blur();
  const tecla = (key) => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  const foco = () => document.activeElement?.dataset.k ?? document.activeElement?.tagName;
  try {
    r.inicio = { regra: texto($(".regra b")), aula: texto($(".d-cab h3")), perguntas: $$(".q-lista .qp").length, certa: texto($(".certa-linha")) };

    clicar("[data-q=por-p]");
    r.novaPergunta = { regra: texto($(".regra b")), foco: foco(), semCerta: texto($(".q-edicao .alts ~ .ajuda")), item: texto($('[data-k="qp-3"]')) };
    escrever('[data-k="enun-3"]', "Q");
    escrever('[data-k="enun-3"]', "");
    r.digitandoSemSair = { foco: foco(), erro: texto($(".q-edicao > .msg-erro")) };
    sair();
    r.saiuDoEnunciadoVazio = { erro: texto($(".q-edicao > .msg-erro")), lista: texto($('[data-k="qp-3"] .s')), aula: texto($('[data-aula="3"] .erros')), modulo: texto($("[data-cab8] .erros")) };

    clicar("[data-salvar]");
    r.salvarRecusado = { barra: texto($("[data-barra] p")), foco: foco(), erros: $$(".q-edicao .msg-erro").map(texto) };

    escrever('[data-k="enun-3"]', "Quem cuida da obra no local da máquina?");
    escrever('[data-k="alt-3-0"]', "A Profills");
    escrever('[data-k="alt-3-1"]', "O cliente");
    r.semCertaAinda = $$(".q-edicao .msg-erro").map(texto);
    clicar('[data-k="certa-3-1"]');
    r.marcouB = { certa: texto($(".certa-linha")), foco: foco(), checked: $$(".letra[aria-checked=true]").map((b) => b.dataset.a), tabindex: $$(".letra").map((b) => b.tabIndex).join("") };
    tecla("ArrowUp");
    r.setaParaCima = { certa: texto($(".certa-linha")), foco: foco() };
    tecla("ArrowDown");
    r.barraDepoisDeCorrigir = texto($("[data-barra] p"));

    clicar("[data-q=por-alt]");
    r.alternativaNova = { foco: foco(), qtd: $$("[data-campo=alt]").length };
    sair();
    r.alternativaVaziaSaiu = texto($(".alt .msg-erro"));
    clicar("[data-q=por-alt]");
    clicar("[data-q=por-alt]");
    r.cinco = { qtd: $$("[data-campo=alt]").length, semBotao: $$("[data-q=por-alt]").length === 0, contagem: texto($(".mais .ajuda")) };
    clicar('[data-k="tirar-alt-3-4"]');
    clicar('[data-k="tirar-alt-3-3"]');
    clicar('[data-k="tirar-alt-3-2"]');
    r.duas = { qtd: $$("[data-campo=alt]").length, xDesligado: $$("[data-q=tirar-alt]").every((b) => b.getAttribute("aria-disabled") === "true") };
    clicar('[data-k="tirar-alt-3-0"]');
    r.xNoMinimoNaoTira = $$("[data-campo=alt]").length;

    clicar('[data-k="qp-1"]');
    clicar("[data-q=tirar-p]");
    r.tirou = { lista: $$(".q-lista .qp").length, tirada: texto($(".tirada span")), foco: foco(), regra: texto($(".regra b")), posicao: $(".tirada")?.previousElementSibling?.dataset.k };
    clicar("[data-q=desfazer]");
    r.desfez = { lista: $$(".q-lista .qp").length, editando: texto($(".p-cab .rotulo")), foco: foco(), enunciado: $('[data-k="enun-1"]')?.value.slice(0, 30) };

    clicar('[data-q=aula][data-i="2"]');
    r.aulaSemQuiz = { titulo: texto($(".d-cab h3")), vazio: texto($(".q-vazio b")), foco: foco() };
    clicar("[data-q=por-p]");
    r.criouQuestionario = { regra: texto($(".regra b")), exp: texto($(".regra .exp")) };
    clicar("[data-q=tirar-p]");
    r.tirouAUnica = { vazio: texto($(".q-vazio b")), tirada: texto($(".tirada span")) };
    clicar("[data-q=desfazer]");
    clicar("[data-q=tirar-p]");
    clicar('[data-q=aula][data-i="3"]');
    r.voltouAula4 = { perguntas: $$(".q-lista .qp").length, tiradaSumiu: !$(".tirada") };

    escrever("[data-vitrine=titulo]", "Comercial: método Profills");
    r.slug = texto($("[data-slug]"));
    escrever("[data-vitrine=titulo]", "  ");
    r.slugVazio = texto($("[data-slug]"));
    escrever("[data-vitrine=titulo]", "Profills School Comercial");

    r.enterNaAlternativa = (() => {
      const alt = $('[data-k="alt-0-0"]');
      alt.focus();
      const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
      alt.dispatchEvent(ev);
      return ev.defaultPrevented ? "bloqueado" : "passou";
    })();

    clicar("[data-salvar]");
    r.salvou = { barra: texto($("[data-barra] p")), botao: $("[data-barra] button")?.getAttribute("aria-disabled") };

    const aula = $(".detalhe");
    const s = aula.closest(".escala").clientWidth / 1280;
    let largo = null;
    aula.querySelectorAll("*").forEach((x) => {
      const w = x.getBoundingClientRect().width / s;
      if (w > aula.clientWidth + 1 && !largo) largo = `${x.className}/${Math.round(w)}`;
    });
    r.transbordaNoPainel = largo;
    r.listaCortaTitulo = $$(".lista .nome").filter((n) => n.scrollHeight > n.clientHeight + 1).map(texto);

    document.querySelector("[data-estado=vazio]").click();
    r.estadoVazio = texto($(".q-vazio b"));
    document.querySelector("[data-estado=erro]").click();
    r.estadoErro = { barra: texto($("[data-barra] p")), erros: $$(".q-edicao .msg-erro").map(texto) };
    document.querySelector("[data-estado=inicio]").click();
    r.estadoInicio = { barra: texto($("[data-barra] p")), perguntas: $$(".q-lista .qp").length };

    r.rotulosDasLetras = $$(".letra").map((b) => b.getAttribute("aria-label"));
  } catch (e) {
    erros.push(String(e.stack ?? e));
  }
  r.erros = erros;
  document.body.dataset.r = JSON.stringify(r);
}, 800);
