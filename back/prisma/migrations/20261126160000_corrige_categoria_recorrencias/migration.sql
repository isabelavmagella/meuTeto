-- Antes desta correção, mover uma subcategoria para outra categoria atualizava
-- as transações, mas não as recorrências: elas ficavam com a categoria antiga
-- e uma subcategoria da nova. Alinha a categoria à da subcategoria.
UPDATE "TransacaoRecorrente" r
SET "categoryId" = s."categoryId"
FROM "Subcategory" s
WHERE s.id = r."subcategoryId"
  AND s."userId" = r."userId"
  AND r."categoryId" IS DISTINCT FROM s."categoryId";
