-- Private pilot: owner role, invitations, consent records, pilot usability feedback.

-- Founder / super-administrator role ("owner"), above admin.
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (role IN ('journalist','editor','moderator','admin','owner'));

ALTER TABLE moderation_action DROP CONSTRAINT IF EXISTS moderation_action_action_check;
ALTER TABLE moderation_action ADD CONSTRAINT moderation_action_action_check CHECK (action IN (
  'dismiss','educational_notice','warning','remove_comment','restore_comment','approve_comment','restrict','suspend','escalate','lift_restriction',
  'grant_staff','revoke_staff','create_invite','revoke_invite','bootstrap_owner'));

-- Invitations. Only a SHA-256 hash of the token is stored; the link is shown (or emailed) once.
CREATE TABLE IF NOT EXISTS invite (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  text NOT NULL UNIQUE,
  purpose     text NOT NULL CHECK (purpose IN ('founder','staff','pilot')),
  role        text CHECK (role IS NULL OR role IN ('journalist','editor','moderator','admin','owner')),
  title       text CHECK (title IS NULL OR char_length(title) <= 80),
  email       text CHECK (email IS NULL OR char_length(email) <= 254),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  max_uses    integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 50),
  uses        integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  created_by  text REFERENCES "user"(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  CHECK (uses <= max_uses)
);

CREATE TABLE IF NOT EXISTS invite_use (
  invite_id uuid NOT NULL REFERENCES invite(id),
  user_id   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  used_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, user_id)
);

-- Consent records (what was accepted, and when).
ALTER TABLE profile ADD COLUMN IF NOT EXISTS privacy_version text;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS privacy_at timestamptz;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS pilot_consent_at timestamptz;

-- Pilot usability questionnaire: one response per member (editable).
CREATE TABLE IF NOT EXISTS pilot_feedback (
  user_id    text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  ratings    jsonb NOT NULL,
  quiz       jsonb NOT NULL,
  tasks      text[] NOT NULL DEFAULT '{}',
  confusing  text CHECK (confusing IS NULL OR char_length(confusing) <= 2000),
  suggestion text CHECK (suggestion IS NULL OR char_length(suggestion) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
