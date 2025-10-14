-- NOTE: Before running this, enable these extensions in Supabase Dashboard:
-- Go to Database > Extensions and enable:
-- 1. pgvector
-- 2. ltree
-- 3. pg_trgm
-- (pgcrypto should already be enabled by default)
--
-- Also ensure you have the storage bucket and policies set up by running:
-- migrations/021_storage_setup.sql

-- ============================================================================
-- WORLDS TABLE
-- ============================================================================
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tone TEXT,
  setting TEXT NOT NULL,
  description TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worlds_aliases ON worlds USING GIN(aliases);
CREATE INDEX idx_worlds_embedding ON worlds USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_worlds_created_by ON worlds(created_by);

-- ============================================================================
-- ABILITIES TABLE
-- ============================================================================
CREATE TABLE abilities (
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

CREATE INDEX idx_abilities_world_id ON abilities(world_id);
CREATE INDEX idx_abilities_aliases ON abilities USING GIN(aliases);
CREATE INDEX idx_abilities_embedding ON abilities USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  embedding VECTOR(1536),
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_world_id ON items(world_id);
CREATE INDEX idx_items_aliases ON items USING GIN(aliases);
CREATE INDEX idx_items_embedding ON items USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
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

CREATE INDEX idx_organizations_world_id ON organizations(world_id);
CREATE INDEX idx_organizations_aliases ON organizations USING GIN(aliases);
CREATE INDEX idx_organizations_embedding ON organizations USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- TAXONOMIES TABLE
-- ============================================================================
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

CREATE INDEX idx_taxonomies_world_id ON taxonomies(world_id);
CREATE INDEX idx_taxonomies_aliases ON taxonomies USING GIN(aliases);
CREATE INDEX idx_taxonomies_embedding ON taxonomies USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================
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

CREATE INDEX idx_locations_world_id ON locations(world_id);
CREATE INDEX idx_locations_aliases ON locations USING GIN(aliases);
CREATE INDEX idx_locations_embedding ON locations USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_locations_path ON locations USING GIST(path);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);

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

-- ============================================================================
-- NPCS TABLE
-- ============================================================================
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

CREATE INDEX idx_npcs_world_id ON npcs(world_id);
CREATE INDEX idx_npcs_aliases ON npcs USING GIN(aliases);
CREATE INDEX idx_npcs_embedding ON npcs USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- RULES TABLE
-- ============================================================================
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

CREATE INDEX idx_rules_world_id ON rules(world_id);
CREATE INDEX idx_rules_aliases ON rules USING GIN(aliases);
CREATE INDEX idx_rules_embedding ON rules USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- STORY NODES TABLE
-- ============================================================================
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

CREATE INDEX idx_story_nodes_world_id ON story_nodes(world_id);
CREATE INDEX idx_story_nodes_aliases ON story_nodes USING GIN(aliases);
CREATE INDEX idx_story_nodes_embedding ON story_nodes USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- STORY EDGES TABLE
-- ============================================================================
CREATE TABLE story_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  label TEXT,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_story_edges_world_id ON story_edges(world_id);
CREATE INDEX idx_story_edges_from_node ON story_edges(from_node_id);
CREATE INDEX idx_story_edges_to_node ON story_edges(to_node_id);

-- ============================================================================
-- WORLD PLAYER FIELDS TABLE
-- ============================================================================
CREATE TABLE world_player_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('number', 'text')),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_world_player_fields_world_id ON world_player_fields(world_id);
CREATE INDEX idx_world_player_fields_display_order ON world_player_fields(world_id, display_order);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  current_story_node_id UUID REFERENCES story_nodes(id) ON DELETE SET NULL,
  story_state TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_world_id ON sessions(world_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

-- ============================================================================
-- PLAYERS TABLE
-- ============================================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  appearance TEXT NOT NULL,
  state TEXT,
  dynamic_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_session_id ON players(session_id);

-- ============================================================================
-- GENERATED ITEMS TABLE
-- ============================================================================
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

CREATE INDEX idx_generated_items_session_id ON generated_items(session_id);
CREATE INDEX idx_generated_items_world_id ON generated_items(world_id);
CREATE INDEX idx_generated_items_aliases ON generated_items USING GIN(aliases);
CREATE INDEX idx_generated_items_embedding ON generated_items USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- GENERATED CHARACTERS TABLE
-- ============================================================================
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

CREATE INDEX idx_generated_characters_session_id ON generated_characters(session_id);
CREATE INDEX idx_generated_characters_world_id ON generated_characters(world_id);
CREATE INDEX idx_generated_characters_aliases ON generated_characters USING GIN(aliases);
CREATE INDEX idx_generated_characters_embedding ON generated_characters USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- GENERATED LOCATIONS TABLE
-- ============================================================================
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

CREATE INDEX idx_generated_locations_session_id ON generated_locations(session_id);
CREATE INDEX idx_generated_locations_world_id ON generated_locations(world_id);
CREATE INDEX idx_generated_locations_aliases ON generated_locations USING GIN(aliases);
CREATE INDEX idx_generated_locations_embedding ON generated_locations USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_generated_locations_path ON generated_locations USING GIST(path);

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

-- ============================================================================
-- GENERATED ABILITIES TABLE
-- ============================================================================
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

CREATE INDEX idx_generated_abilities_session_id ON generated_abilities(session_id);
CREATE INDEX idx_generated_abilities_world_id ON generated_abilities(world_id);
CREATE INDEX idx_generated_abilities_aliases ON generated_abilities USING GIN(aliases);
CREATE INDEX idx_generated_abilities_embedding ON generated_abilities USING ivfflat(embedding vector_cosine_ops);

-- ============================================================================
-- SESSION MESSAGES TABLE
-- ============================================================================
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_messages_session_created ON session_messages(session_id, created_at);

-- ============================================================================
-- SESSION CANON STATE TABLE
-- ============================================================================
CREATE TABLE session_canon_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('world', 'ability', 'item', 'organization', 'taxonomy', 'location', 'npc', 'rule', 'story_node')),
  entity_id UUID NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, entity_type, entity_id)
);

CREATE INDEX idx_session_canon_state_session ON session_canon_state(session_id);
CREATE INDEX idx_session_canon_state_entity ON session_canon_state(entity_type, entity_id);
