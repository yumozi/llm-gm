# Database Migrations

This folder contains SQL migration files for the LLM GM database.

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
21. `021_storage_setup.sql` - Create storage bucket and policies for image uploads
22. `022_rag_vector_search.sql` - **[RAG]** Create vector search functions for semantic retrieval

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
- Embeddings use vector(1536) for RAG semantic search
- Locations use ltree for hierarchical paths
- RLS policies should be configured separately for multi-tenant access control

## RAG System (Migration 022)

Migration `022_rag_vector_search.sql` is **critical** for the RAG (Retrieval-Augmented Generation) system to work:

**What it creates:**
- 7 PostgreSQL functions for vector similarity search:
  - `match_items()` - Search items by semantic similarity
  - `match_abilities()` - Search abilities by semantic similarity
  - `match_locations()` - Search locations by semantic similarity
  - `match_npcs()` - Search NPCs by semantic similarity
  - `match_organizations()` - Search organizations by semantic similarity
  - `match_taxonomies()` - Search taxonomies by semantic similarity
  - `match_rules()` - Search rules by semantic similarity

**What it does:**
- Uses pgvector's `<=>` operator for cosine distance calculation
- Creates IVFFlat indexes on embedding columns for fast search
- Returns top K most similar entities above a similarity threshold

**Prerequisites:**
- `pgvector` extension must be enabled (done in migration 001)
- All entity tables must have `embedding VECTOR(1536)` column (done in respective migrations)

**Without this migration:**
- RAG retrieval will fail with "function does not exist" errors
- System will not be able to perform semantic search
- Context assembly will not work properly

For more details, see [RAG_IMPLEMENTATION.md](../RAG_IMPLEMENTATION.md).
