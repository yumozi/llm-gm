/**
 * NODE 4: Prompt Construction
 * Constructs the final prompt from context sections
 */

import { ContextAssemblyOutput } from './3-context-assembly'
import { DM_GUIDELINES } from '../prompts'

export type PromptConstructionInput = {
  contextSections: ContextAssemblyOutput
  playerMessage: string
}

export type PromptConstructionOutput = {
  userPrompt: string
}

/**
 * Constructs the final user prompt from all context sections
 */
export async function constructPrompt(
  input: PromptConstructionInput
): Promise<PromptConstructionOutput> {
  const { contextSections, playerMessage } = input

  const {
    worldSettingContext,
    itemsContext,
    locationsContext,
    abilitiesContext,
    organizationsContext,
    taxonomiesContext,
    rulesContext,
    npcsContext,
    playerFieldsContext,
    playerContext,
    conversationalContext,
  } = contextSections

  // Assemble the user prompt by concatenating all context sections
  const userPrompt = `You are the Dungeon Master for a TTRPG game. Here is the world background and context:

${worldSettingContext}${itemsContext}${locationsContext}${abilitiesContext}${organizationsContext}${taxonomiesContext}${rulesContext}${npcsContext}${playerFieldsContext}${playerContext}${conversationalContext}
${DM_GUIDELINES}

Player Action: "${playerMessage}"

DM Response:`

  return {
    userPrompt,
  }
}
