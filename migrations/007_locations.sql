-- Create locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  path LTREE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_locations_world_id ON locations(world_id);
CREATE INDEX idx_locations_aliases ON locations USING GIN(aliases);
CREATE INDEX idx_locations_embedding ON locations USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_locations_path ON locations USING GIST(path);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);

-- Trigger to maintain path on insert/update
CREATE OR REPLACE FUNCTION update_location_path() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_location_id IS NULL THEN
    NEW.path = text2ltree(NEW.id::TEXT);
  ELSE
    SELECT path || text2ltree(NEW.id::TEXT) INTO NEW.path
    FROM locations WHERE id = NEW.parent_location_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_path
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION update_location_path();
