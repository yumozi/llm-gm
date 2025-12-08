/**
 * NODE 2: Data Retrieval
 * Fetches all necessary data from the database
 * Now uses RAG (Retrieval-Augmented Generation) for selective context retrieval
 */

import { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import {
  generateEmbedding,
  buildRAGQuery,
  retrieveRelevantItems,
  retrieveRelevantLocations,
  retrieveRelevantAbilities,
  retrieveRelevantNPCs,
  retrieveRelevantOrganizations,
  retrieveRelevantTaxonomies,
  retrieveRelevantRules,
} from './rag-retrieval'

export type DataRetrievalInput = {
  sessionId: string
  playerMessage: string
  supabase: SupabaseClient
  openai: OpenAI
}

export type World = {
  id: string
  name: string
  tone?: string
  description: string
  setting: string
}

export type Session = {
  id: string
  worlds: World
}

export type Item = {
  name: string
  description: string
  aliases?: string[]
  is_unique?: boolean
}

export type Location = {
  name: string
  description: string
  aliases?: string[]
}

export type Ability = {
  name: string
  description: string
  aliases?: string[]
}

export type Organization = {
  name: string
  description: string
  aliases?: string[]
}

export type Taxonomy = {
  name: string
  description: string
  aliases?: string[]
}

export type Rule = {
  name: string
  description: string
  aliases?: string[]
  priority?: boolean
}

export type NPC = {
  name: string
  description: string
  aliases?: string[]
  personality?: string
  motivations?: string
}

export type PlayerField = {
  field_name: string
  field_type: string
  is_hidden?: boolean
}

export type Player = {
  name: string
  appearance: string
  state?: string
  dynamic_fields?: Record<string, unknown>
}

export type Message = {
  author: string
  content: string
  created_at: string
}

export type DataRetrievalOutput = {
  world: World
  items: Item[] | null
  locations: Location[] | null
  abilities: Ability[] | null
  organizations: Organization[] | null
  taxonomies: Taxonomy[] | null
  rules: Rule[] | null
  playerFields: PlayerField[] | null
  npcs: NPC[] | null
  player: Player | null
  messageHistory: Message[] | null
}

/**
 * Retrieves all data needed for DM response generation
 * Uses RAG (vector similarity search) to retrieve only relevant entities
 */
export async function retrieveData(
  input: DataRetrievalInput
): Promise<DataRetrievalOutput> {
  const { sessionId, playerMessage, supabase, openai } = input

  // Get session and world data
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      worlds (*)
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Session not found')
  }

  const world = (session as Session).worlds

  // First, fetch message history (needed for building RAG query context)
  const { data: messageHistory } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Build RAG query from player message + recent conversation
  const ragQuery = buildRAGQuery(playerMessage, messageHistory || [])

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(ragQuery, openai)

  // Fetch data in parallel using RAG for entity retrieval
  const [
    items,
    locations,
    abilities,
    organizations,
    taxonomies,
    rules,
    npcs,
    { data: playerFields },
    { data: player },
  ] = await Promise.all([
    // RAG-based retrieval (only relevant entities)
    retrieveRelevantItems(supabase, world.id, queryEmbedding),
    retrieveRelevantLocations(supabase, world.id, queryEmbedding),
    retrieveRelevantAbilities(supabase, world.id, queryEmbedding),
    retrieveRelevantOrganizations(supabase, world.id, queryEmbedding),
    retrieveRelevantTaxonomies(supabase, world.id, queryEmbedding),
    retrieveRelevantRules(supabase, world.id, queryEmbedding),
    retrieveRelevantNPCs(supabase, world.id, queryEmbedding),

    // Non-RAG retrieval (these are small or always needed)
    supabase.from('world_player_fields').select('*').eq('world_id', world.id),
    supabase.from('players').select('*').eq('session_id', sessionId).single(),
  ])

  // 🔍 RAG Debug Output - Log retrieved entities to terminal
  console.log('\n' + '='.repeat(80))
  console.log('🔍 RAG RETRIEVAL RESULTS')
  console.log('='.repeat(80))
  console.log(`📝 Query: "${playerMessage}"`)
  console.log(`🌍 World: ${world.name}`)
  console.log('-'.repeat(80))

  console.log(`\n🗡️  ITEMS (${items.length} retrieved):`)
  items.forEach((item: any, i: number) => {
    console.log(`  ${i + 1}. ${item.name}${item.similarity ? ` (similarity: ${item.similarity.toFixed(3)})` : ''}`)
    console.log(`     └─ ${item.description.substring(0, 80)}...`)
  })

  console.log(`\n⚡ ABILITIES (${abilities.length} retrieved):`)
  abilities.forEach((ability: any, i: number) => {
    console.log(`  ${i + 1}. ${ability.name}${ability.similarity ? ` (similarity: ${ability.similarity.toFixed(3)})` : ''}`)
    console.log(`     └─ ${ability.description.substring(0, 80)}...`)
  })

  console.log(`\n🏰 LOCATIONS (${locations.length} retrieved):`)
  locations.forEach((location: any, i: number) => {
    console.log(`  ${i + 1}. ${location.name}${location.similarity ? ` (similarity: ${location.similarity.toFixed(3)})` : ''}`)
    console.log(`     └─ ${location.description.substring(0, 80)}...`)
  })

  console.log(`\n👥 NPCs (${npcs.length} retrieved):`)
  npcs.forEach((npc: any, i: number) => {
    console.log(`  ${i + 1}. ${npc.name}${npc.similarity ? ` (similarity: ${npc.similarity.toFixed(3)})` : ''}`)
    console.log(`     └─ ${npc.description.substring(0, 80)}...`)
  })

  console.log(`\n🏛️  ORGANIZATIONS (${organizations.length} retrieved):`)
  organizations.forEach((org: any, i: number) => {
    console.log(`  ${i + 1}. ${org.name}${org.similarity ? ` (similarity: ${org.similarity.toFixed(3)})` : ''}`)
  })

  console.log(`\n📚 TAXONOMIES (${taxonomies.length} retrieved):`)
  taxonomies.forEach((tax: any, i: number) => {
    console.log(`  ${i + 1}. ${tax.name}${tax.similarity ? ` (similarity: ${tax.similarity.toFixed(3)})` : ''}`)
  })

  console.log(`\n📜 RULES (${rules.length} retrieved):`)
  rules.forEach((rule: any, i: number) => {
    console.log(`  ${i + 1}. ${rule.name}${rule.similarity ? ` (similarity: ${rule.similarity.toFixed(3)})` : ''}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log(`✅ Total entities retrieved: ${items.length + abilities.length + locations.length + npcs.length + organizations.length + taxonomies.length + rules.length}`)
  console.log('='.repeat(80) + '\n')

  return {
    world,
    items,
    locations,
    abilities,
    organizations,
    taxonomies,
    rules,
    playerFields,
    npcs,
    player,
    messageHistory,
  }
}
