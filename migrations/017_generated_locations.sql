-- Create generated_locations table
CREATE TABLE generated_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  state TEXT,
  origin_context TEXT,
  parent_generated_location_id UUID REFERENCES generated_locations(id) ON DELETE SET NULL,
  parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  path LTREE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_exactly_one_parent CHECK (
    (parent_generated_location_id IS NULL AND parent_location_id IS NULL) OR
    (parent_generated_location_id IS NOT NULL AND parent_location_id IS NULL) OR
    (parent_generated_location_id IS NULL AND parent_location_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_generated_locations_session_id ON generated_locations(session_id);
CREATE INDEX idx_generated_locations_world_id ON generated_locations(world_id);
CREATE INDEX idx_generated_locations_aliases ON generated_locations USING GIN(aliases);
CREATE INDEX idx_generated_locations_embedding ON generated_locations USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_generated_locations_path ON generated_locations USING GIST(path);

-- Trigger to maintain path on insert/update
CREATE OR REPLACE FUNCTION update_generated_location_path() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_generated_location_id IS NULL AND NEW.parent_location_id IS NULL THEN
    NEW.path = text2ltree(NEW.id::TEXT);
  ELSIF NEW.parent_generated_location_id IS NOT NULL THEN
    SELECT path || text2ltree(NEW.id::TEXT) INTO NEW.path
    FROM generated_locations WHERE id = NEW.parent_generated_location_id;
  ELSE
    SELECT path || text2ltree(NEW.id::TEXT) INTO NEW.path
    FROM locations WHERE id = NEW.parent_location_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_location_path
BEFORE INSERT OR UPDATE ON generated_locations
FOR EACH ROW EXECUTE FUNCTION update_generated_location_path();
