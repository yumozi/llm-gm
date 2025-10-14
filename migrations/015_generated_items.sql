-- Create generated_items table
CREATE TABLE generated_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  state TEXT,
  origin_context TEXT,
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  source_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_items_session_id ON generated_items(session_id);
CREATE INDEX idx_generated_items_world_id ON generated_items(world_id);
CREATE INDEX idx_generated_items_aliases ON generated_items USING GIN(aliases);
CREATE INDEX idx_generated_items_embedding ON generated_items USING ivfflat(embedding vector_cosine_ops);
