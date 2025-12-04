# Database Migrations

This folder contains SQL migration files for the Mugen AI world engine database.

## Migration Files

The migrations should be executed in numerical order:

1. `001_extensions.sql` - Enable required PostgreSQL extensions (vector, ltree, pg_trgm, pgcrypto)
2. `002_worlds.sql` - Create worlds table
3. `003_abilities.sql` - Create abilities table
4. `004_items.sql` - Create items table
5. `005_organizations.sql` - Create organizations table
6. `006_taxonomies.sql` - Create taxonomies table
7. `007_locations.sql` - Create locations table with hierarchical support
8. `008_npcs.sql` - Create NPCs table
9. `009_rules.sql` - Create rules table
10. `010_story_nodes.sql` - Create story nodes table
11. `011_story_edges.sql` - Create story edges table
12. `012_world_player_fields.sql` - Create world player fields table
13. `013_sessions.sql` - Create sessions table
14. `014_players.sql` - Create players table
15. `015_generated_items.sql` - Create generated items table
16. `016_generated_characters.sql` - Create generated characters table
17. `017_generated_locations.sql` - Create generated locations table
18. `018_generated_abilities.sql` - Create generated abilities table
19. `019_session_messages.sql` - Create session messages table
20. `020_session_canon_state.sql` - Create session canon state table

## How to Run

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file's content in order
4. Execute each migration

### Using Supabase CLI

```bash
# Run all migrations in order
for file in migrations/*.sql; do
  supabase db execute -f "$file"
done
```

## Database Schema

- **Canon Tables (World-scoped)**: worlds, abilities, items, organizations, taxonomies, locations, npcs, rules, story_nodes, story_edges, world_player_fields
- **Runtime Tables (Session-scoped)**: sessions, players, generated_items, generated_characters, generated_locations, generated_abilities, session_messages, session_canon_state

## Notes

- All tables use UUID primary keys
- Embeddings use vector(1536) for vector
- Locations use ltree for hierarchical paths
- RLS policies should be configured separately for multi-tenant access control
