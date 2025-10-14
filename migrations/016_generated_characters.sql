-- Create generated_characters table
CREATE TABLE generated_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  state TEXT,
  origin_context TEXT,
  personality TEXT,
  motivations TEXT,
  image_url TEXT,
  source_npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_characters_session_id ON generated_characters(session_id);
CREATE INDEX idx_generated_characters_world_id ON generated_characters(world_id);
CREATE INDEX idx_generated_characters_aliases ON generated_characters USING GIN(aliases);
CREATE INDEX idx_generated_characters_embedding ON generated_characters USING ivfflat(embedding vector_cosine_ops);
