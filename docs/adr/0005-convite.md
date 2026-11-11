# 0005. O convite mora no banco, e o Clerk só entrega o link

Data: 11 de novembro de 2026. Situação: aceita. Muda o item "Perfil do cadastro" da ADR 0003; o resto da 0003 e a 0004 continuam valendo.

## Contexto

A pessoa só aparecia em Pessoas depois de criar a conta sozinha. Ela entrava como Funcionário ou Público aberto pela regra do e-mail, e o admin ajustava o perfil, o papel e os cursos depois. O dono quer convidar por e-mail a partir do admin e definir, no convite, o perfil, o papel de admin e os cursos liberados, para a pessoa chegar com tudo pronto.

Três fatos do sistema decidem a forma. O perfil e as liberações moram no Postgres, sob a trava do aluno, e o papel mora no Clerk, fora de qualquer transação. O convite do Clerk só entrega metadata a quem usa o link, e o dono quer que o convite valha pelo e-mail, com ou sem o link. O Clerk não tem reenvio, não documenta o código do erro de e-mail repetido e limita os envios a 100 por hora.

## Decisão

- **O convite mora no Postgres.** A tabela `convite` é a única fonte do estado e do que o convite dá, e `convite_curso` guarda os cursos. O estado sai das colunas de data (`enviado_em`, `expira_em`, `aceito_em`, `cancelado_em`) por `estadoDoConvite`, em `packages/api/src/dominio/convite.ts`. Expirado não é coluna: sai de `expira_em` e do relógio.
- **O Clerk é só o carteiro.** O convite do Clerk vai sem `publicMetadata`, então o link, sozinho, só cria a conta. O app guarda o id dele em `clerk_convite_id` para revogar e nunca lê o status do convite no Clerk. Link órfão, duplicado ou não revogado não dá nada.
- **O convite vale pelo e-mail principal verificado.** Quem cria a conta sozinho, ou pelo Google, com o e-mail convidado também recebe o que o convite dá. E-mail não verificado não aplica convite.
- **O convite se aplica no primeiro acesso.** `perfilDe` trava o aluno e, numa transação, reivindica o convite vivo e não vencido do e-mail com um UPDATE condicional, grava a linha de `perfil_da_pessoa` com o perfil do convite e `definido_por` de quem convidou, dá o Bônus de funcionário se o perfil é Funcionário e libera cada curso como liberação de `admin`.
- **O papel de admin vai ao Clerk depois do commit.** A coluna `papel_aplicado_em` marca que o Clerk gravou. Enquanto ela está vazia num convite de admin aceito, todo pedido da pessoa tenta de novo. Mudar o papel dela na ficha encerra a pendência: a decisão na ficha vence o convite.
- **Um convite vivo por e-mail.** Convidar de novo um e-mail com convite vivo não muda o convite que existe. Para mudar o que ele dá, o admin cancela e convida de novo.
- **Cancelar vale no banco.** O cancelamento grava `cancelado_em` e depois revoga o link. A pessoa ainda cria a conta sozinha e entra pela regra do e-mail.
- **E-mail que já tem conta não se convida.** O envio recusa esse e-mail e aponta a ficha da pessoa.

## O que muda na ADR 0003

A ADR 0003 diz, no item "Perfil do cadastro": "Quem tem o e-mail principal verificado em `@profills.com` entra como funcionário, e todo o resto entra como público aberto."

Esta ADR contradiz esse item em dois pontos:

1. **O perfil do convite vence a regra do e-mail.** Quem foi convidado como Cliente e tem e-mail `@profills.com` entra como Cliente, e não como Funcionário. Quem foi convidado como Funcionário com e-mail de outro domínio entra como Funcionário. A regra do e-mail passa a valer só para quem chega sem convite vivo.
2. **A linha de `perfil_da_pessoa` pode nascer com `definido_por` preenchido.** Na 0003, `definido_por` ficava vazio até um admin mudar o perfil. Com o convite, a linha nasce com o admin que convidou, porque o perfil foi decisão dele.

O Bônus de funcionário segue a regra de antes: a linha que nasce Funcionário ganha o bônus, pelo e-mail ou pelo convite. O convidado como Cliente com e-mail `@profills.com` não nasce Funcionário e não ganha.

Vale reabrir a 0003 porque o convite é uma decisão explícita do admin sobre aquela pessoa, e a regra do e-mail é um palpite do sistema para quem ninguém decidiu.

## Consequências

- O admin convidado entra como aluno e vira admin quando o token renova, em até 60 s. Com o Clerk fora depois do commit, ele fica aluno até o próximo pedido dele. Toda falha tira poder, nunca dá.
- Todo pedido do aluno soma uma sonda `exists` no índice `convite_aceito_por_unico` à leitura do perfil.
- O primeiro acesso passa a rodar sob a trava do aluno (`ponto:<userId>`). Dois primeiros acessos juntos aplicam o convite uma vez: o segundo relê o perfil depois da trava.
- A liberação do convite tem origem `admin` e autor igual a quem convidou. Ela aparece e se revoga na tela Liberações como qualquer outra. A linha não diz que veio de convite; o vínculo fica em `convite.aceito_por` e em `convite_curso`.
- O curso apagado sai dos convites pendentes pelo `cascade` de `convite_curso`, e a chegada libera os outros.
- O convite continua valendo depois de quem convidou perder o papel, como uma liberação antiga dele continua valendo. Dar o papel de admin por convite pede o papel de verdade no momento do envio: o servidor relê o papel de quem convida no Clerk.
- Quem aceita o link e entra com outro e-mail chega pela regra do e-mail, e o convite fica pendente até vencer ou ser cancelado.
- As linhas canceladas e vencidas guardam o e-mail de quem não tem conta, sem prazo. Limpar essas linhas fica para depois.
- O texto e a marca do e-mail de convite são configuração do painel do Clerk.
