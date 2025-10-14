-- Create session_canon_state table
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

-- Create indexes
CREATE INDEX idx_session_canon_state_session ON session_canon_state(session_id);
CREATE INDEX idx_session_canon_state_entity ON session_canon_state(entity_type, entity_id);
