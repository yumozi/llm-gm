/**
 * NODE 2: Data Retrieval
 * Fetches all necessary data from the database
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type DataRetrievalInput = {
  sessionId: string
  supabase: SupabaseClient
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
 */
export async function retrieveData(
  input: DataRetrievalInput
): Promise<DataRetrievalOutput> {
  const { sessionId, supabase } = input

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

  // Fetch all world data in parallel
  const [
    { data: items },
    { data: locations },
    { data: abilities },
    { data: organizations },
    { data: taxonomies },
    { data: rules },
    { data: playerFields },
    { data: npcs },
    { data: player },
    { data: messageHistory },
  ] = await Promise.all([
    supabase.from('items').select('*').eq('world_id', world.id),
    supabase.from('locations').select('*').eq('world_id', world.id),
    supabase.from('abilities').select('*').eq('world_id', world.id),
    supabase.from('organizations').select('*').eq('world_id', world.id),
    supabase.from('taxonomies').select('*').eq('world_id', world.id),
    supabase.from('rules').select('*').eq('world_id', world.id),
    supabase.from('world_player_fields').select('*').eq('world_id', world.id),
    supabase.from('npcs').select('*').eq('world_id', world.id),
    supabase.from('players').select('*').eq('session_id', sessionId).single(),
    supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

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
