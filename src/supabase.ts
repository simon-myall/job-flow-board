import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────────────────
// SQL — run this once in your Supabase project's SQL Editor
// (Dashboard → SQL Editor → New Query → paste → Run)
// ─────────────────────────────────────────────────────────────────────────────
//
// -- Jobs: each row is one application, stored as a JSONB blob
// create table jobs (
//   id         text        primary key,
//   user_id    uuid        references auth.users on delete cascade not null,
//   data       jsonb       not null,
//   updated_at timestamptz default now()
// );
// alter table jobs enable row level security;
// create policy "Users manage their own jobs"
//   on jobs for all
//   using  (auth.uid() = user_id)
//   with check (auth.uid() = user_id);
//
// -- User profiles: API key, base CV, recruiter list
// create table user_profiles (
//   user_id        uuid    primary key references auth.users on delete cascade,
//   claude_api_key text    default '',
//   base_cv        text    default '',
//   recruiters     text[]  default '{}'
// );
// alter table user_profiles enable row level security;
// create policy "Users manage their own profile"
//   on user_profiles for all
//   using  (auth.uid() = user_id)
//   with check (auth.uid() = user_id);
// ─────────────────────────────────────────────────────────────────────────────
