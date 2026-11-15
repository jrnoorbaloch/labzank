-- ═══════════════════════════════════════════════════════════════════════
-- Labzank — Balochi Dictionary module (PostgreSQL 15+)
-- Migration 0002_dictionary. Shares users / roles / media_library with the
-- platform schema (0001). Designed for 500k+ entries:
--   * every searchable form stored twice: as written + normalised (*_norm)
--   * pg_trgm GIN indexes for prefix / fuzzy search in both scripts
--   * keyset pagination on (alpha_key, headword_norm, id)
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE dict_status AS ENUM ('draft','imported','pending_review','verified','published','rejected');
CREATE TYPE dict_relation AS ENUM ('derived','synonym','antonym','see_also','variant');
CREATE TYPE word_type AS ENUM ('simple','derived','compound','phrase','loan');

-- ── sources & licences (every entry and example points here) ──
CREATE TABLE dict_sources (
  id            text PRIMARY KEY,                       -- 'labzank-editorial', 'labzganj' …
  name          text NOT NULL,
  publisher     text,
  licence       text NOT NULL,                          -- e.g. 'CC BY-SA 4.0', 'Written permission 2026-12-01'
  attribution   text NOT NULL,                          -- shown on every word page
  url           text,
  terms_doc_id  bigint REFERENCES media_library(id),    -- signed permission letter / licence PDF
  is_third_party boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dict_roots (
  id         bigserial PRIMARY KEY,
  form_arab  text NOT NULL UNIQUE,
  form_latn  text,
  notes      text
);

-- ── entries (headwords) ──
CREATE TABLE dict_entries (
  id                 bigserial PRIMARY KEY,
  public_id          text NOT NULL UNIQUE,              -- 'bal-000142' (stable, citeable)
  slug               text NOT NULL UNIQUE,
  headword_arab      text NOT NULL,                     -- original, never overwritten by conversion
  headword_latn      text,
  headword_latn_src  text NOT NULL DEFAULT 'editor' CHECK (headword_latn_src IN ('editor','machine')),
  headword_norm      text NOT NULL,                     -- normArab(headword_arab)
  headword_latn_norm text,                              -- normLatn(headword_latn)
  alpha_key          smallint NOT NULL,                 -- position of first letter in the Balochi alphabet
  word_type          word_type NOT NULL DEFAULT 'simple',
  root_id            bigint REFERENCES dict_roots(id),
  status             dict_status NOT NULL DEFAULT 'draft',
  source_id          text NOT NULL REFERENCES dict_sources(id),
  image_media_id     bigint REFERENCES media_library(id),
  editor_notes       text,
  frequency          integer,                           -- from corpus counts, for ranking
  import_batch_id    bigint,                            -- FK added below
  version            integer NOT NULL DEFAULT 1,
  created_by         bigint REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  published_at       timestamptz
);
CREATE INDEX dict_entries_norm_trgm      ON dict_entries USING gin (headword_norm gin_trgm_ops);
CREATE INDEX dict_entries_latn_trgm      ON dict_entries USING gin (headword_latn_norm gin_trgm_ops);
CREATE INDEX dict_entries_alpha          ON dict_entries (alpha_key, headword_norm, id);
CREATE INDEX dict_entries_status         ON dict_entries (status) WHERE status <> 'published';
CREATE INDEX dict_entries_recent         ON dict_entries (published_at DESC) WHERE status = 'published';
CREATE INDEX dict_entries_root           ON dict_entries (root_id);

-- ── senses (one entry → many meanings) ──
CREATE TABLE dict_senses (
  id        bigserial PRIMARY KEY,
  entry_id  bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  n         smallint NOT NULL,
  pos       text NOT NULL,                              -- noun, verb, adjective … (lookup table in 0003)
  register  text,                                       -- formal, poetic, colloquial
  domain    text,                                       -- botany, kinship …
  dialect   text,                                       -- eastern, southern, western
  UNIQUE (entry_id, n)
);

-- ── glosses: meaning per language; open-ended (bal, en, ur, brh, sd …) ──
CREATE TABLE dict_glosses (
  id         bigserial PRIMARY KEY,
  sense_id   bigint NOT NULL REFERENCES dict_senses(id) ON DELETE CASCADE,
  lang       text NOT NULL,                             -- ISO 639: bal, en, ur, brh
  text       text NOT NULL,
  text_norm  text NOT NULL,
  status     dict_status NOT NULL DEFAULT 'draft',      -- translations are reviewed separately
  source_id  text REFERENCES dict_sources(id),
  UNIQUE (sense_id, lang)
);
CREATE INDEX dict_glosses_trgm ON dict_glosses USING gin (text_norm gin_trgm_ops);
CREATE INDEX dict_glosses_en_fts ON dict_glosses USING gin (to_tsvector('english', text)) WHERE lang = 'en';

CREATE TABLE dict_examples (
  id         bigserial PRIMARY KEY,
  sense_id   bigint NOT NULL REFERENCES dict_senses(id) ON DELETE CASCADE,
  text_arab  text NOT NULL,
  text_latn  text,
  source_id  text REFERENCES dict_sources(id)
);
CREATE TABLE dict_example_translations (
  example_id bigint NOT NULL REFERENCES dict_examples(id) ON DELETE CASCADE,
  lang       text NOT NULL,
  text       text NOT NULL,
  PRIMARY KEY (example_id, lang)
);

CREATE TABLE dict_pronunciations (
  id             bigserial PRIMARY KEY,
  entry_id       bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  ipa            text,
  syllables      text[],
  respelling     text,
  audio_media_id bigint REFERENCES media_library(id),
  dialect        text
);

CREATE TABLE dict_relations (
  from_entry bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  to_entry   bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  type       dict_relation NOT NULL,
  PRIMARY KEY (from_entry, to_entry, type)
);
CREATE INDEX dict_relations_to ON dict_relations (to_entry);

CREATE TABLE dict_entry_sources (                       -- provenance when entries merge
  entry_id     bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  source_id    text NOT NULL REFERENCES dict_sources(id),
  external_ref text,                                    -- id in the source dataset
  PRIMARY KEY (entry_id, source_id)
);

-- ── editorial workflow ──
CREATE TABLE dict_revisions (
  id         bigserial PRIMARY KEY,
  entity     text NOT NULL,                             -- 'entry','sense','gloss','example'
  entity_id  bigint NOT NULL,
  diff       jsonb NOT NULL,
  user_id    bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dict_revisions_entity ON dict_revisions (entity, entity_id, created_at DESC);

CREATE TABLE dict_reviews (
  id          bigserial PRIMARY KEY,
  entry_id    bigint NOT NULL REFERENCES dict_entries(id) ON DELETE CASCADE,
  reviewer_id bigint NOT NULL REFERENCES users(id),
  stage       text NOT NULL CHECK (stage IN ('linguistic','translation','publish')),
  decision    text NOT NULL CHECK (decision IN ('approve','reject','request_changes')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dict_word_of_day (
  day              date PRIMARY KEY,
  entry_id         bigint NOT NULL REFERENCES dict_entries(id),
  featured_on_home boolean NOT NULL DEFAULT true,
  note             text,
  scheduled_by     bigint REFERENCES users(id)
);

-- ── bulk import ──
CREATE TABLE dict_import_batches (
  id            bigserial PRIMARY KEY,
  source_id     text NOT NULL REFERENCES dict_sources(id),
  file_media_id bigint REFERENCES media_library(id),
  format        text NOT NULL CHECK (format IN ('csv','xlsx','json','api')),
  mapping       jsonb NOT NULL,
  counts        jsonb NOT NULL DEFAULT '{}',            -- {total, imported, skipped, warnings}
  status        text NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed','imported','rolled_back')),
  permission_confirmed boolean NOT NULL,
  created_by    bigint REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dict_entries ADD CONSTRAINT dict_entries_batch_fk FOREIGN KEY (import_batch_id) REFERENCES dict_import_batches(id);

CREATE TABLE dict_import_rows (
  batch_id  bigint NOT NULL REFERENCES dict_import_batches(id) ON DELETE CASCADE,
  row_no    integer NOT NULL,
  raw       jsonb NOT NULL,
  entry_id  bigint REFERENCES dict_entries(id),
  outcome   text NOT NULL CHECK (outcome IN ('imported','merged','skipped')),
  errors    jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY (batch_id, row_no)
);

-- rollback: remove rows of a batch that nobody has touched since import
-- DELETE FROM dict_entries WHERE import_batch_id = $1 AND status = 'imported';
-- UPDATE dict_import_batches SET status = 'rolled_back' WHERE id = $1;

-- ── search analytics (popular / recent searches) ──
CREATE TABLE dict_search_log (
  id         bigserial PRIMARY KEY,
  query_norm text NOT NULL,
  script     text NOT NULL CHECK (script IN ('arab','latn','mixed')),
  hits       integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dict_search_log_recent ON dict_search_log (created_at DESC);

-- ── roles (added to the platform's roles table) ──
INSERT INTO roles (key, name) VALUES
  ('dict_admin',      'Dictionary Administrator'),
  ('dict_linguist',   'Linguistic Editor'),
  ('dict_translator', 'Translator'),
  ('dict_reviewer',   'Reviewer')
ON CONFLICT (key) DO NOTHING;

-- ── example search (prefix in either script + gloss match) ──
-- SELECT e.*, greatest(similarity(e.headword_norm, $1), similarity(coalesce(e.headword_latn_norm,''), $1)) AS score
-- FROM dict_entries e
-- WHERE e.status = 'published' AND (e.headword_norm % $1 OR e.headword_latn_norm % $1 OR e.headword_norm LIKE $1 || '%')
-- ORDER BY score DESC, e.frequency DESC NULLS LAST LIMIT 20;
