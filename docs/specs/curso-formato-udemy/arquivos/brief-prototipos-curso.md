# Brief: 4 protótipos do curso no formato Udemy

SOMENTE LEITURA no repo `/home/othavio/.herdr/worktrees/cursos/curso-formato-udemy`. A única coisa que você escreve é o arquivo `docs/specs/curso-formato-udemy/arquivos/prototipos-curso.html`.

## O que o dono pediu

O curso fica como na Udemy. Quem cria o curso define:
- o banner, que é a capa que já existe;
- o título;
- uma descrição;
- tópicos, isto é, o "O que você vai aprender";
- uma categoria;
- as aulas, agrupadas em módulos (as seções). Cada aula tem vídeo, descrição e, num PR seguinte, um questionário.

O dono escolhe a interface entre 4 versões lado a lado. Faça 4 versões (A, B, C e D) de cada uma das duas telas abaixo. As 8 ficam visíveis ao mesmo tempo na mesma página, sem seletor nem aba que esconda uma versão. Cada versão tem um rótulo com a letra e uma linha que diz em que ela difere das outras. As 4 versões de cada tela precisam ser estruturalmente diferentes (hierarquia, ordem e composição), não a mesma tela com outra cor.

1. **A página do curso para o aluno**, em `/cursos/<slug>`. Hoje essa rota só mostra o fim do curso (`apps/web/src/app/(aluno)/cursos/[slug]/page.tsx`). A página nova mostra:
   - o banner, o título, a categoria e a descrição;
   - os tópicos;
   - o progresso e o botão principal: Começar, Continuar com a aula e o segundo, ou Fazer o questionário;
   - os módulos com as aulas: título, duração, descrição curta e se já foi assistida.

   Use dois estados nas versões. O curso "Profills School Comercial" está em andamento: 16 módulos, 90 aulas, 46 assistidas, "Agora: Módulo 8, Pilar Urgência". O curso "Fábrica e montagem" não foi iniciado: 3 módulos, 7 aulas. Pode mostrar um estado por versão ou os dois.
2. **O editor do curso no admin**, só a parte nova: os campos de descrição, de tópicos (uma lista que se acrescenta, reordena e remove) e de categoria, e a descrição de cada aula dentro do bloco do módulo. O editor de hoje é `apps/web/src/components/admin/editor-do-curso.tsx` e `modulos-do-curso.tsx`. As versões mostram o resto do editor só como contexto.

## Regras de visual

- Leia `apps/web/DESIGN.md`, `apps/web/PRODUCT.md`, `apps/web/src/index.css` e `packages/ui/src/styles/globals.css`. Use os tokens, as fontes, as formas e o tema escuro do app. As versões diferem em composição, não em sistema visual.
- Monte a casca do app em volta de cada tela: a sidebar do aluno para a página do curso e a do admin para o editor. Siga `apps/web/src/components/casca/`.
- O foco de teclado é o hover, sem anel e sem contorno, como diz o CLAUDE.md da raiz.
- Use conteúdo real do seed (`packages/db/src/seed/dados.ts`) e as capas de `apps/web/public/capas/`, embutidas como data URI em tamanho pequeno (até uns 60 KB cada). Escreva descrições e tópicos plausíveis para os dois cursos, em pt-BR.
- A página precisa abrir como Artifact do claude.ai. Isso significa HTML sem `<html>`, `<head>` nem `<body>`, com `<title>` e `<style>` no topo, CSS inline e fontes só do Google Fonts. Nada de script externo além do cdnjs. Mostre cada versão numa moldura de 1280 px reduzida por `transform: scale` para caber em duas colunas, e a página não pode rolar na horizontal. Defina as cores como tokens no `:root` e deixe o protótipo só no tema escuro, com `color-scheme: dark` e fundo explícito no `body`.
- Rode a skill `/impeccable` como guia de qualidade visual.

## Entrega

Devolva:
- o caminho do HTML;
- o tamanho do arquivo;
- uma tabela com as 8 versões e a ideia de cada uma;
- o que você inventou de conteúdo.
