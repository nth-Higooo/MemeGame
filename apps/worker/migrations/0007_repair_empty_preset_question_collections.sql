-- A preset can acquire additional questions through content management.
-- Copy its existing, non-archived meme collection onto any linked question
-- whose collection is empty, so that one incomplete draft cannot block room
-- initialization. Existing question/meme links are preserved.
WITH preset_assets AS (
  SELECT DISTINCT qma.meme_asset_id
  FROM preset_questions AS pq
  JOIN question_meme_assets AS qma ON qma.question_id = pq.question_id
  JOIN meme_assets AS ma ON ma.id = qma.meme_asset_id
  WHERE pq.preset_id = '00000000-0000-4000-8000-000000000301'
    AND ma.status != 'ARCHIVED'
), empty_questions AS (
  SELECT pq.question_id
  FROM preset_questions AS pq
  WHERE pq.preset_id = '00000000-0000-4000-8000-000000000301'
    AND NOT EXISTS (
      SELECT 1
      FROM question_meme_assets AS qma
      JOIN meme_assets AS ma ON ma.id = qma.meme_asset_id
      WHERE qma.question_id = pq.question_id
        AND ma.status != 'ARCHIVED'
    )
)
INSERT INTO question_meme_assets (question_id, meme_asset_id, position)
SELECT
  empty_questions.question_id,
  preset_assets.meme_asset_id,
  COALESCE((
    SELECT MAX(existing.position)
    FROM question_meme_assets AS existing
    WHERE existing.question_id = empty_questions.question_id
  ), -1) + ROW_NUMBER() OVER (
    PARTITION BY empty_questions.question_id
    ORDER BY preset_assets.meme_asset_id
  )
FROM empty_questions
CROSS JOIN preset_assets
WHERE NOT EXISTS (
  SELECT 1
  FROM question_meme_assets AS existing
  WHERE existing.question_id = empty_questions.question_id
    AND existing.meme_asset_id = preset_assets.meme_asset_id
);
