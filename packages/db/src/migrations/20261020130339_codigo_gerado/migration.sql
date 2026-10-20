-- Dá código ao curso que não tem, pela regra de siglaDaCategoria e codigoLivre
-- (packages/api/src/dominio/codigo-do-curso.ts): a sigla da categoria e o menor
-- número livre dela, de 001 em diante, na ordem de criação. O curso que já tem
-- código fica com o dele. codigo-gerado.integration.test.ts confere os dois lados.
DO $$
DECLARE
  c record;
  palavras text[];
  sigla text;
  n int;
  novo text;
BEGIN
  FOR c IN
    SELECT curso.id, categoria.nome
    FROM curso
    JOIN categoria ON categoria.id = curso.categoria_id
    WHERE curso.codigo IS NULL
    ORDER BY curso.criado_em, curso.id
  LOOP
    palavras := array(
      SELECT p
      FROM unnest(string_to_array(upper(trim(regexp_replace(
        regexp_replace(normalize(c.nome, NFD), '[̀-ͯ]', '', 'g'),
        '[^A-Za-z0-9]+', ' ', 'g'
      ))), ' ')) WITH ORDINALITY AS t(p, i)
      WHERE p <> ''
        AND p NOT IN ('A', 'AS', 'COM', 'DA', 'DAS', 'DE', 'DO', 'DOS', 'E', 'EM', 'O', 'OS', 'PARA')
      ORDER BY i
    );
    IF cardinality(palavras) = 0 THEN
      sigla := 'CUR';
    ELSIF cardinality(palavras) = 1 THEN
      sigla := left(palavras[1], 3);
    ELSE
      SELECT string_agg(left(p, 1), '' ORDER BY i) INTO sigla
      FROM unnest(palavras[1:4]) WITH ORDINALITY AS t(p, i);
    END IF;
    n := 1;
    LOOP
      novo := sigla || '-' || lpad(n::text, greatest(3, length(n::text)), '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM curso WHERE curso.codigo = novo);
      n := n + 1;
    END LOOP;
    UPDATE curso SET codigo = novo WHERE curso.id = c.id;
  END LOOP;
END $$;
