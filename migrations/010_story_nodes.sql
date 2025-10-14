-- Create story_nodes table
CREATE TABLE story_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_story_nodes_world_id ON story_nodes(world_id);
CREATE INDEX idx_story_nodes_aliases ON story_nodes USING GIN(aliases);
CREATE INDEX idx_story_nodes_embedding ON story_nodes USING ivfflat(embedding vector_cosine_ops);
