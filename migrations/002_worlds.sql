-- Create worlds table
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tone TEXT,
  setting TEXT NOT NULL,
  description TEXT NOT NULL,
  starter TEXT,
  embedding VECTOR(1536),
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_worlds_embedding ON worlds USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_worlds_created_by ON worlds(created_by);
