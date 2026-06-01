import { config } from "dotenv";
config({ path: ".env.local" });
config();
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { prepare: false });

  console.log("Enabling pgvector extension...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  console.log("Creating enums...");
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE item_type AS ENUM ('NOTE', 'URL', 'PDF');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE item_status AS ENUM ('PROCESSING', 'READY', 'ERROR');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE message_role AS ENUM ('USER', 'ASSISTANT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  console.log("Creating users table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT,
      image TEXT,
      email_verified TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Creating items table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type item_type NOT NULL,
      status item_status NOT NULL DEFAULT 'PROCESSING',
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      summary TEXT,
      source_url TEXT,
      file_name TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS items_user_idx ON items(user_id);
    CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
    CREATE INDEX IF NOT EXISTS items_created_idx ON items(created_at);
  `);

  console.log("Creating tags table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_idx ON tags(user_id, name);
  `);

  console.log("Creating item_tags table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, tag_id)
    );
  `);

  console.log("Creating chunks table with vector embeddings...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      embedding vector(768),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS chunks_item_idx ON chunks(item_id);
    CREATE INDEX IF NOT EXISTS chunks_user_idx ON chunks(user_id);
  `);

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);
  `).catch(() => {});

  console.log("Creating chats table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS chats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS chats_user_idx ON chats(user_id);
    CREATE INDEX IF NOT EXISTS chats_updated_idx ON chats(updated_at);
  `);

  console.log("Creating messages table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role message_role NOT NULL,
      content TEXT NOT NULL,
      sources JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id);
  `);

  console.log("\n✓ Database setup complete!");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
