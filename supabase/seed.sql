-- Seed: insert the default ranking "Geral".
-- Run once after schema.sql.

INSERT INTO rankings (id, name)
VALUES ('d3b07384-d113-4ec5-a5d7-be96cf5910fa', 'Masculino B/C')
ON CONFLICT (id) DO NOTHING;
