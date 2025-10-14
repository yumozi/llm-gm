-- Create npcs table
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  personality TEXT,
  motivations TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_npcs_world_id ON npcs(world_id);
CREATE INDEX idx_npcs_aliases ON npcs USING GIN(aliases);
CREATE INDEX idx_npcs_embedding ON npcs USING ivfflat(embedding vector_cosine_ops);
