-- Create story_edges table
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

-- Create indexes
CREATE INDEX idx_story_edges_world_id ON story_edges(world_id);
CREATE INDEX idx_story_edges_from_node ON story_edges(from_node_id);
CREATE INDEX idx_story_edges_to_node ON story_edges(to_node_id);
