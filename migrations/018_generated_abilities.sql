-- Create generated_abilities table
CREATE TABLE generated_abilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  state TEXT,
  origin_context TEXT,
  source_ability_id UUID REFERENCES abilities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_abilities_session_id ON generated_abilities(session_id);
CREATE INDEX idx_generated_abilities_world_id ON generated_abilities(world_id);
CREATE INDEX idx_generated_abilities_aliases ON generated_abilities USING GIN(aliases);
CREATE INDEX idx_generated_abilities_embedding ON generated_abilities USING ivfflat(embedding vector_cosine_ops);
