setTimeout(() => {
  const ed = document.querySelectorAll("#v-editor .versao");
  const olA = ed[0].querySelector("[data-topicos]");
  olA.querySelector("li [data-acao=descer]").click();
  const ordem = [...olA.querySelectorAll("li")].map((li) => li.querySelector("[data-n]").textContent + ":" + li.querySelector("input").value.slice(0, 12));
  olA.querySelector("li:last-child [data-acao=remover]").click();
  ed[0].querySelector("[data-acao=adicionar]").click();
  const total = ed[0].querySelector("[data-total]").textContent;
  ed[3].querySelector('[data-aula="6"] > button').click();
  const painel = ed[3].querySelector("[data-d-pos]").textContent + " | " + ed[3].querySelector("[data-d-titulo]").textContent;
  ed[3].querySelector('[data-d-nav="1"]').click();
  const prox = ed[3].querySelector("[data-d-pos]").textContent;
  document.body.dataset.r = JSON.stringify({ ordem: ordem.slice(0, 2), total, painel, prox });
}, 500);
