-- Complete the original sample preset's second question collection.
-- The Admin create-session flow scopes assets per question and rejects a pack
-- when any included question has no selectable memes.
INSERT INTO question_meme_assets (question_id, meme_asset_id, position)
SELECT
  '00000000-0000-4000-8000-000000000202',
  asset.id,
  ROW_NUMBER() OVER (ORDER BY asset.id) - 1
FROM meme_assets AS asset
WHERE asset.source_type = 'PLACEHOLDER'
  AND asset.status != 'ARCHIVED'
  AND NOT EXISTS (
    SELECT 1
    FROM question_meme_assets AS link
    WHERE link.question_id = '00000000-0000-4000-8000-000000000202'
      AND link.meme_asset_id = asset.id
  );
