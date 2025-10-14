-- Create taxonomies table
CREATE TABLE taxonomies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_taxonomies_world_id ON taxonomies(world_id);
CREATE INDEX idx_taxonomies_aliases ON taxonomies USING GIN(aliases);
CREATE INDEX idx_taxonomies_embedding ON taxonomies USING ivfflat(embedding vector_cosine_ops);
