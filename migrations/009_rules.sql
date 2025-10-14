-- Create rules table
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  priority BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rules_world_id ON rules(world_id);
CREATE INDEX idx_rules_aliases ON rules USING GIN(aliases);
CREATE INDEX idx_rules_embedding ON rules USING ivfflat(embedding vector_cosine_ops);
