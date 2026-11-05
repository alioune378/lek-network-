-- LËK Community schema. Runs after Better Auth's own migration (tables "user", "session", "account", "verification", "rateLimit").
-- All application queries are parameterised; constraints below enforce the rules the code relies on.

CREATE TABLE IF NOT EXISTS profile (
  user_id            text PRIMARY KEY REFERENCES "user"(id) ON DELETE RESTRICT,
  display_name       text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  bio                text CHECK (bio IS NULL OR char_length(bio) <= 280),
  region             text CHECK (region IS NULL OR char_length(region) <= 60),
  preferred_language text CHECK (preferred_language IS NULL OR preferred_language IN ('fr','en','wo','ar','es','pt','de','it','tr','zh')),
  interests          text[] NOT NULL DEFAULT '{}',
  show_history       boolean NOT NULL DEFAULT true,
  notify_replies     boolean NOT NULL DEFAULT false,
  guidelines_version text NOT NULL,
  guidelines_at      timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

-- Professional verification, separate from email verification.
CREATE TABLE IF NOT EXISTS staff (
  user_id     text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('journalist','editor','moderator','admin')),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  verified_by text REFERENCES "user"(id),
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article (
  slug          text PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{3,100}$'),
  kind          text NOT NULL CHECK (kind IN ('article','programme')),
  comments_open boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug    text NOT NULL REFERENCES article(slug),
  user_id         text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  parent_id       uuid REFERENCES comment(id),
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  body_hash       text NOT NULL,
  lang            text NOT NULL DEFAULT 'fr' CHECK (char_length(lang) BETWEEN 2 AND 5),
  status          text NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending','removed','deleted')),
  is_staff_note   boolean NOT NULL DEFAULT false,
  helpful_count   integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  removed_reason  text,
  idempotency_key text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz,
  deleted_at      timestamptz,
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS comment_article_idx ON comment (article_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS comment_parent_idx ON comment (parent_id);
CREATE INDEX IF NOT EXISTS comment_user_idx ON comment (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comment_hash_idx ON comment (body_hash, created_at DESC);

-- Replies: a parent must be a top-level comment on the same article (one level of nesting).
CREATE OR REPLACE FUNCTION comment_parent_check() RETURNS trigger AS $$
DECLARE p comment%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO p FROM comment WHERE id = NEW.parent_id;
  IF p.id IS NULL OR p.parent_id IS NOT NULL OR p.article_slug <> NEW.article_slug THEN
    RAISE EXCEPTION 'invalid_parent';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS comment_parent_check ON comment;
CREATE TRIGGER comment_parent_check BEFORE INSERT ON comment FOR EACH ROW EXECUTE FUNCTION comment_parent_check();

CREATE TABLE IF NOT EXISTS comment_revision (
  id         bigserial PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES comment(id),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reaction (
  comment_id uuid NOT NULL REFERENCES comment(id),
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind       text NOT NULL DEFAULT 'helpful' CHECK (kind = 'helpful'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, kind)
);

CREATE TABLE IF NOT EXISTS moderation_case (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id    uuid REFERENCES comment(id),
  subject_user  text REFERENCES "user"(id),
  source        text NOT NULL CHECK (source IN ('reader','automatic','staff')),
  reasons       text[] NOT NULL,
  context       jsonb NOT NULL DEFAULT '{}',
  severity      text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  reviewer_id   text REFERENCES "user"(id),
  action        text,
  decision_note text,
  decided_at    timestamptz,
  appeal_status text NOT NULL DEFAULT 'none' CHECK (appeal_status IN ('none','pending','upheld','overturned')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS case_open_per_comment ON moderation_case (comment_id) WHERE status = 'open' AND comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS case_status_idx ON moderation_case (status, created_at);

CREATE TABLE IF NOT EXISTS report (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid NOT NULL REFERENCES comment(id),
  reporter_id text REFERENCES "user"(id) ON DELETE SET NULL,
  case_id     uuid REFERENCES moderation_case(id),
  reason      text NOT NULL CHECK (reason IN ('spam','harassment','threat','private_info','impersonation','hate','off_topic','other')),
  details     text CHECK (details IS NULL OR char_length(details) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS moderation_action (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       text REFERENCES "user"(id),
  target_user_id text REFERENCES "user"(id),
  comment_id     uuid REFERENCES comment(id),
  case_id        uuid REFERENCES moderation_case(id),
  action         text NOT NULL CHECK (action IN ('dismiss','educational_notice','warning','remove_comment','restore_comment','approve_comment','restrict','suspend','escalate','lift_restriction','grant_staff','revoke_staff')),
  reason         text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  until          timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS action_target_idx ON moderation_action (target_user_id, created_at DESC);

-- The audit log is append-only.
CREATE OR REPLACE FUNCTION audit_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'moderation_action is append-only'; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS moderation_action_append_only ON moderation_action;
CREATE TRIGGER moderation_action_append_only BEFORE UPDATE OR DELETE ON moderation_action FOR EACH ROW EXECUTE FUNCTION audit_append_only();

CREATE TABLE IF NOT EXISTS restriction (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES "user"(id),
  kind       text NOT NULL CHECK (kind IN ('comment_restricted','suspended')),
  starts_at  timestamptz NOT NULL DEFAULT now(),
  ends_at    timestamptz,
  lifted_at  timestamptz,
  action_id  uuid NOT NULL REFERENCES moderation_action(id)
);
CREATE INDEX IF NOT EXISTS restriction_user_idx ON restriction (user_id);

CREATE TABLE IF NOT EXISTS appeal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid NOT NULL UNIQUE REFERENCES moderation_action(id),
  user_id       text NOT NULL REFERENCES "user"(id),
  message       text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','upheld','overturned')),
  reviewer_id   text REFERENCES "user"(id),
  decision_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz
);

CREATE TABLE IF NOT EXISTS notification (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('reply','moderation','appeal','feedback_reply','staff')),
  payload    jsonb NOT NULL DEFAULT '{}',
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_user_idx ON notification (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text REFERENCES "user"(id) ON DELETE SET NULL,
  category        text NOT NULL CHECK (category IN ('article_feedback','factual_error','story_idea','editorial_question','technical','private_concern')),
  article_slug    text,
  message         text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 6000),
  contact_email   text CHECK (contact_email IS NULL OR char_length(contact_email) <= 254),
  lang            text NOT NULL DEFAULT 'fr',
  status          text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','answered','closed')),
  assignee_id     text REFERENCES "user"(id),
  resolution_note text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status, created_at DESC);

CREATE TABLE IF NOT EXISTS feedback_reply (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES feedback(id),
  author_id   text NOT NULL REFERENCES "user"(id),
  body        text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 4000),
  channel     text NOT NULL CHECK (channel IN ('account','email','internal')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id          bigserial PRIMARY KEY,
  kind        text NOT NULL,
  status      text NOT NULL CHECK (status IN ('captured','accepted','failed','not_configured')),
  provider_id text,
  recipient   text,
  subject     text,
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_event (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_event_key_idx ON rate_event (key, created_at DESC);
