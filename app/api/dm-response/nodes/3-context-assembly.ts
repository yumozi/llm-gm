/**
 * NODE 3: Context Assembly
 * Builds context sections from retrieved data
 */

import {
  DataRetrievalOutput,
  World,
  Item,
  Location,
  Ability,
  Organization,
  Taxonomy,
  Rule,
  NPC,
  PlayerField,
  Player,
  Message,
} from './2-data-retrieval'
import {
  WORLD_SETTING_HEADER,
  ITEMS_HEADER,
  LOCATIONS_HEADER,
  ABILITIES_HEADER,
  ORGANIZATIONS_HEADER,
  TAXONOMIES_HEADER,
  RULES_HEADER,
  NPCS_HEADER,
  PLAYER_FIELDS_HEADER,
  CURRENT_PLAYER_HEADER,
  CHAT_HISTORY_HEADER,
} from '../prompts'

export type ContextAssemblyInput = DataRetrievalOutput

export type ContextAssemblyOutput = {
  worldSettingContext: string
  itemsContext: string
  locationsContext: string
  abilitiesContext: string
  organizationsContext: string
  taxonomiesContext: string
  rulesContext: string
  npcsContext: string
  playerFieldsContext: string
  playerContext: string
  conversationalContext: string
}

// ============================================================================
// Context Builder Functions
// ============================================================================

function buildWorldSettingContext(world: World): string {
  return `${WORLD_SETTING_HEADER}
Name: ${world.name}
Tone: ${world.tone || 'Not specified'}
Description: ${world.description}
Setting Details: ${world.setting}

`
}

function buildItemsContext(items: Item[] | null): string {
  if (!items || items.length === 0) {
    return ''
  }

  let context = `\n${ITEMS_HEADER}\n`
  items.forEach(item => {
    const aliases = item.aliases?.length ? ` (also known as: ${item.aliases.join(', ')})` : ''
    const unique = item.is_unique ? ' [UNIQUE ITEM]' : ''
    context += `- ${item.name}${aliases}: ${item.description}${unique}\n`
  })
  return context
}

function buildLocationsContext(locations: Location[] | null): string {
  if (!locations || locations.length === 0) {
    return ''
  }

  let context = `\n${LOCATIONS_HEADER}\n`
  locations.forEach(location => {
    const aliases = location.aliases?.length ? ` (also known as: ${location.aliases.join(', ')})` : ''
    context += `- ${location.name}${aliases}: ${location.description}\n`
  })
  return context
}

function buildAbilitiesContext(abilities: Ability[] | null): string {
  if (!abilities || abilities.length === 0) {
    return ''
  }

  let context = `\n${ABILITIES_HEADER}\n`
  abilities.forEach(ability => {
    const aliases = ability.aliases?.length ? ` (also known as: ${ability.aliases.join(', ')})` : ''
    context += `- ${ability.name}${aliases}: ${ability.description}\n`
  })
  return context
}

function buildOrganizationsContext(organizations: Organization[] | null): string {
  if (!organizations || organizations.length === 0) {
    return ''
  }

  let context = `\n${ORGANIZATIONS_HEADER}\n`
  organizations.forEach(org => {
    const aliases = org.aliases?.length ? ` (also known as: ${org.aliases.join(', ')})` : ''
    context += `- ${org.name}${aliases}: ${org.description}\n`
  })
  return context
}

function buildTaxonomiesContext(taxonomies: Taxonomy[] | null): string {
  if (!taxonomies || taxonomies.length === 0) {
    return ''
  }

  let context = `\n${TAXONOMIES_HEADER}\n`
  taxonomies.forEach(tax => {
    const aliases = tax.aliases?.length ? ` (also known as: ${tax.aliases.join(', ')})` : ''
    context += `- ${tax.name}${aliases}: ${tax.description}\n`
  })
  return context
}

function buildRulesContext(rules: Rule[] | null): string {
  if (!rules || rules.length === 0) {
    return ''
  }

  let context = `\n${RULES_HEADER}\n`
  rules.forEach(rule => {
    const aliases = rule.aliases?.length ? ` (also known as: ${rule.aliases.join(', ')})` : ''
    const priority = rule.priority ? ' [HIGH PRIORITY]' : ''
    context += `- ${rule.name}${aliases}: ${rule.description}${priority}\n`
  })
  return context
}

function buildNPCsContext(npcs: NPC[] | null): string {
  if (!npcs || npcs.length === 0) {
    return ''
  }

  let context = `\n${NPCS_HEADER}\n`
  npcs.forEach(npc => {
    const aliases = npc.aliases?.length ? ` (also known as: ${npc.aliases.join(', ')})` : ''
    context += `- ${npc.name}${aliases}: ${npc.description}`
    if (npc.personality) context += ` Personality: ${npc.personality}`
    if (npc.motivations) context += ` Motivations: ${npc.motivations}`
    context += `\n`
  })
  return context
}

function buildPlayerFieldsContext(playerFields: PlayerField[] | null): string {
  if (!playerFields || playerFields.length === 0) {
    return ''
  }

  let context = `\n${PLAYER_FIELDS_HEADER}\n`
  playerFields.forEach(field => {
    const hidden = field.is_hidden ? ' [HIDDEN FROM PLAYER]' : ''
    context += `- ${field.field_name} (${field.field_type})${hidden}\n`
  })
  return context
}

function buildPlayerContext(player: Player | null): string {
  if (!player) {
    return ''
  }

  let context = `\n${CURRENT_PLAYER_HEADER}\n`
  context += `Name: ${player.name}\n`
  context += `Appearance: ${player.appearance}\n`
  if (player.state) context += `Current State: ${player.state}\n`

  if (player.dynamic_fields && Object.keys(player.dynamic_fields).length > 0) {
    context += `Custom Fields:\n`
    Object.entries(player.dynamic_fields).forEach(([key, value]) => {
      context += `- ${key}: ${value}\n`
    })
  }
  return context
}

function buildConversationalContext(messages: Message[] | null): string {
  if (!messages || messages.length === 0) {
    return ''
  }

  let context = `\n${CHAT_HISTORY_HEADER}\n`
  // Reverse to show chronological order (oldest first)
  const chronologicalMessages = [...messages].reverse()
  chronologicalMessages.forEach(message => {
    const author = message.author === 'player' ? 'Player' : 'DM'
    context += `${author}: ${message.content}\n`
  })
  return context
}

// ============================================================================
// Main Assembly Function
// ============================================================================

/**
 * Assembles all context sections from retrieved data
 */
export async function assembleContext(
  input: ContextAssemblyInput
): Promise<ContextAssemblyOutput> {
  const {
    world,
    items,
    locations,
    abilities,
    organizations,
    taxonomies,
    rules,
    npcs,
    playerFields,
    player,
    messageHistory,
  } = input

  return {
    worldSettingContext: buildWorldSettingContext(world),
    itemsContext: buildItemsContext(items),
    locationsContext: buildLocationsContext(locations),
    abilitiesContext: buildAbilitiesContext(abilities),
    organizationsContext: buildOrganizationsContext(organizations),
    taxonomiesContext: buildTaxonomiesContext(taxonomies),
    rulesContext: buildRulesContext(rules),
    npcsContext: buildNPCsContext(npcs),
    playerFieldsContext: buildPlayerFieldsContext(playerFields),
    playerContext: buildPlayerContext(player),
    conversationalContext: buildConversationalContext(messageHistory),
  }
}
