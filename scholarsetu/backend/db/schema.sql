CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text UNIQUE, password_hash text, role text NOT NULL DEFAULT 'student',
  otr_id text, digilocker_id text UNIQUE, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS consents (
  id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id), source text, purpose text, granted_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS applications (
  id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id), scheme text, stage text DEFAULT 'submitted',
  confidence int, created_at timestamptz DEFAULT now());
