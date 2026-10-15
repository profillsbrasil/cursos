const erros = [];
window.addEventListener("error", (e) => erros.push(e.message));
setTimeout(() => {
  const r = {};
  const ver = (id) => document.querySelector(`[data-versao="${id}"]`);
  const clicar = (el) => { if (!el) throw new Error("sem elemento"); el.click(); };
  const texto = (el) => el?.textContent.replace(/\s+/g, " ").trim();
  try {
    const a = ver("v-cats-A");
    clicar(a.querySelector("[data-dica][aria-label='Apagar Vendas e negócios']"));
    r.apagarEmUso = a.querySelectorAll(".confirma").length === 0 ? "recusado" : "abriu confirmacao";
    a.querySelector("[data-c-campo=nova]").value = "Vendas e negócios";
    clicar(a.querySelector("[data-c=criar]"));
    r.duplicada = texto(a.querySelector(".msg-erro"));
    a.querySelector("[data-c-campo=nova]").value = "Manutenção de máquinas";
    clicar(a.querySelector("[data-c=criar]"));
    r.depoisDeCriar = texto(a.querySelector(".ed-cab p"));
    clicar(a.querySelector("[data-c=renomear][data-nome='Produção e montagem']"));
    a.querySelector("[data-c-campo=renomear]").value = "Montagem";
    clicar(a.querySelector("[data-c=salvar-nome]"));
    r.renomeada = [...a.querySelectorAll(".cats .t-bloco")].map(texto).join(" / ");
    clicar(a.querySelector("[data-c=apagar][data-nome='Manutenção de máquinas']"));
    r.confirmacao = texto(a.querySelector(".confirma p"));
    r.focoNaConfirmacao = document.activeElement?.dataset.c;

    const d = ver("v-cats-D");
    clicar(d.querySelector("[data-c=nova]"));
    d.querySelector("[data-c-campo=nova]").value = "Atendimento técnico";
    clicar(d.querySelector("[data-c=criar]"));
    r.selectD = texto(d.querySelector("[data-c=alternar]"));
    clicar(d.querySelector("[data-c=alternar]"));
    clicar(d.querySelector("[data-c=modo][data-modo=editar]"));
    r.modoEditarD = d.querySelectorAll(".ed-linha").length;

    const ea = ver("v-editor-A");
    clicar(ea.querySelector("[data-q=por-p]"));
    r.regraCom4 = texto(ea.querySelector(".regra b"));
    r.listaAula4 = texto(ea.querySelector('[data-aula="3"] .sub'));
    clicar(ea.querySelector('[data-q=certa][data-p="0"][data-a="3"]'));
    r.certaP1 = ea.querySelector('[data-q=certa][data-p="0"][aria-pressed=true]').dataset.a;
    clicar(ea.querySelector('[data-q=por-alt][data-p="0"]'));
    r.altsP1 = ea.querySelectorAll('[data-campo=alt][data-p="0"]').length;
    r.semMaisAlt = ea.querySelectorAll('[data-q=por-alt][data-p="0"]').length === 0;
    clicar(ea.querySelector('[data-q=aula][data-i="2"]'));
    r.aulaSemQuiz = texto(ea.querySelector(".q-vazio b"));
    clicar(ea.querySelector('[data-q=aula][data-i="3"]'));
    r.voltouAula4 = ea.querySelectorAll(".pergunta").length;

    const ed = ver("v-editor-D");
    const p3 = ed.querySelectorAll('[data-campo=alt][data-p="2"]').length;
    clicar(ed.querySelector('[data-q=tirar-alt][data-p="2"][data-a="0"]'));
    r.tirouAltD = `${p3} -> ${ed.querySelectorAll('[data-campo=alt][data-p="2"]').length}`;
    r.semXnoMinimo = ed.querySelectorAll('[data-q=tirar-alt][data-p="2"]').length;

    const ec = ver("v-editor-C");
    clicar(ec.querySelector('[data-q=p][data-p="1"]'));
    r.cPergunta = texto(ec.querySelector(".q-edicao .rotulo"));

    const al = ver("v-aluno-C");
    clicar(al.querySelector('[data-tab="aC-co"]'));
    r.abaConteudo = al.querySelector("#aC-co").hidden === false && al.querySelector("#aC-vg").hidden === true;
  } catch (e) { erros.push(String(e)); }
  r.erros = erros;
  document.body.dataset.r = JSON.stringify(r);
}, 800);
