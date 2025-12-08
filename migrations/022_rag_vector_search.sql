-- RAG Vector Search Functions
-- This migration adds functions for semantic search using pgvector

-- ============================================================================
-- Generic Vector Similarity Search Function
-- ============================================================================

/**
 * match_entities_by_embedding
 *
 * Generic function to search for entities by vector similarity
 *
 * @param query_embedding - The embedding vector to search for (1536 dimensions)
 * @param match_table - Table name to search in (e.g., 'items', 'abilities')
 * @param match_world_id - UUID of the world to filter by
 * @param match_count - Maximum number of results to return
 * @param match_threshold - Minimum similarity score (0-1, higher = more similar)
 *
 * @returns Table with id, name, description, aliases, and similarity score
 */
CREATE OR REPLACE FUNCTION match_entities_by_embedding(
  query_embedding VECTOR(1536),
  match_table TEXT,
  match_world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use EXECUTE to dynamically query the specified table
  RETURN QUERY EXECUTE format(
    'SELECT
      id,
      name,
      description,
      COALESCE(aliases, ARRAY[]::TEXT[]) as aliases,
      1 - (embedding <=> $1) AS similarity
    FROM %I
    WHERE world_id = $2
      AND embedding IS NOT NULL
      AND 1 - (embedding <=> $1) >= $3
    ORDER BY embedding <=> $1
    LIMIT $4',
    match_table
  )
  USING query_embedding, match_world_id, match_threshold, match_count;
END;
$$;

-- ============================================================================
-- Table-Specific Search Functions (Optional - for better performance)
-- ============================================================================

-- Items search
CREATE OR REPLACE FUNCTION match_items(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  is_unique BOOLEAN,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.name,
    items.description,
    COALESCE(items.aliases, ARRAY[]::TEXT[]) as aliases,
    items.is_unique,
    1 - (items.embedding <=> query_embedding) AS similarity
  FROM items
  WHERE items.world_id = match_items.world_id
    AND items.embedding IS NOT NULL
    AND 1 - (items.embedding <=> query_embedding) >= match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Abilities search
CREATE OR REPLACE FUNCTION match_abilities(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    abilities.id,
    abilities.name,
    abilities.description,
    COALESCE(abilities.aliases, ARRAY[]::TEXT[]) as aliases,
    1 - (abilities.embedding <=> query_embedding) AS similarity
  FROM abilities
  WHERE abilities.world_id = match_abilities.world_id
    AND abilities.embedding IS NOT NULL
    AND 1 - (abilities.embedding <=> query_embedding) >= match_threshold
  ORDER BY abilities.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Locations search
CREATE OR REPLACE FUNCTION match_locations(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    locations.id,
    locations.name,
    locations.description,
    COALESCE(locations.aliases, ARRAY[]::TEXT[]) as aliases,
    1 - (locations.embedding <=> query_embedding) AS similarity
  FROM locations
  WHERE locations.world_id = match_locations.world_id
    AND locations.embedding IS NOT NULL
    AND 1 - (locations.embedding <=> query_embedding) >= match_threshold
  ORDER BY locations.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- NPCs search
CREATE OR REPLACE FUNCTION match_npcs(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  personality TEXT,
  motivations TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    npcs.id,
    npcs.name,
    npcs.description,
    COALESCE(npcs.aliases, ARRAY[]::TEXT[]) as aliases,
    npcs.personality,
    npcs.motivations,
    1 - (npcs.embedding <=> query_embedding) AS similarity
  FROM npcs
  WHERE npcs.world_id = match_npcs.world_id
    AND npcs.embedding IS NOT NULL
    AND 1 - (npcs.embedding <=> query_embedding) >= match_threshold
  ORDER BY npcs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Organizations search
CREATE OR REPLACE FUNCTION match_organizations(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    organizations.id,
    organizations.name,
    organizations.description,
    COALESCE(organizations.aliases, ARRAY[]::TEXT[]) as aliases,
    1 - (organizations.embedding <=> query_embedding) AS similarity
  FROM organizations
  WHERE organizations.world_id = match_organizations.world_id
    AND organizations.embedding IS NOT NULL
    AND 1 - (organizations.embedding <=> query_embedding) >= match_threshold
  ORDER BY organizations.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Taxonomies search
CREATE OR REPLACE FUNCTION match_taxonomies(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    taxonomies.id,
    taxonomies.name,
    taxonomies.description,
    COALESCE(taxonomies.aliases, ARRAY[]::TEXT[]) as aliases,
    1 - (taxonomies.embedding <=> query_embedding) AS similarity
  FROM taxonomies
  WHERE taxonomies.world_id = match_taxonomies.world_id
    AND taxonomies.embedding IS NOT NULL
    AND 1 - (taxonomies.embedding <=> query_embedding) >= match_threshold
  ORDER BY taxonomies.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Rules search
CREATE OR REPLACE FUNCTION match_rules(
  query_embedding VECTOR(1536),
  world_id UUID,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  aliases TEXT[],
  priority BOOLEAN,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rules.id,
    rules.name,
    rules.description,
    COALESCE(rules.aliases, ARRAY[]::TEXT[]) as aliases,
    rules.priority,
    1 - (rules.embedding <=> query_embedding) AS similarity
  FROM rules
  WHERE rules.world_id = match_rules.world_id
    AND rules.embedding IS NOT NULL
    AND 1 - (rules.embedding <=> query_embedding) >= match_threshold
  ORDER BY rules.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_entities_by_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION match_items TO authenticated;
GRANT EXECUTE ON FUNCTION match_abilities TO authenticated;
GRANT EXECUTE ON FUNCTION match_locations TO authenticated;
GRANT EXECUTE ON FUNCTION match_npcs TO authenticated;
GRANT EXECUTE ON FUNCTION match_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION match_taxonomies TO authenticated;
GRANT EXECUTE ON FUNCTION match_rules TO authenticated;
