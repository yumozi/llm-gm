/**
 * NODE 7: Dynamic Field Update Analysis
 * Analyzes the DM response and determines if player fields need updating
 */

import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { FIELD_UPDATE_SYSTEM_PROMPT } from '../prompts'

export type DynamicFieldUpdateInput = {
  sessionId: string
  dmResponse: string
  playerMessage: string
  openai: OpenAI
  supabase: SupabaseClient
}

export type FieldUpdate = {
  field_name: string
  new_value: string | number | boolean
  reason?: string
}

export type DynamicFieldUpdateOutput = {
  fieldsUpdated: boolean
  updates: FieldUpdate[]
}

/**
 * Tool definition for updating player fields
 */
const UPDATE_FIELDS_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'update_player_fields',
    description: 'Update one or more player dynamic fields based on what happened in the game',
    parameters: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Array of field updates to apply',
          items: {
            type: 'object',
            properties: {
              field_name: {
                type: 'string',
                description: 'The exact name of the field to update',
              },
              new_value: {
                type: ['string', 'number', 'boolean'],
                description: 'The new value for the field',
              },
              reason: {
                type: 'string',
                description: 'Brief explanation of why this field is being updated',
              },
            },
            required: ['field_name', 'new_value'],
          },
        },
      },
      required: ['updates'],
    },
  },
}

/**
 * Applies field updates to the player in the database
 */
async function applyFieldUpdates(
  supabase: SupabaseClient,
  sessionId: string,
  updates: FieldUpdate[]
): Promise<void> {
  // Get the player
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !player) {
    console.error('Failed to fetch player for field updates:', fetchError)
    return
  }

  // Apply updates to dynamic_fields
  const updatedFields = { ...(player.dynamic_fields as Record<string, unknown> || {}) }

  updates.forEach(update => {
    updatedFields[update.field_name] = update.new_value
  })

  // Save back to database
  const { error: updateError } = await supabase
    .from('players')
    .update({
      dynamic_fields: updatedFields,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  if (updateError) {
    console.error('Failed to update player fields:', updateError)
  }
}

/**
 * Analyzes DM response and updates player fields if needed
 */
export async function analyzeDynamicFieldUpdates(
  input: DynamicFieldUpdateInput
): Promise<DynamicFieldUpdateOutput> {
  const { sessionId, dmResponse, playerMessage, openai, supabase } = input

  try {
    // Fetch current player state and field definitions
    const [
      { data: player },
      { data: session },
    ] = await Promise.all([
      supabase.from('players').select('*').eq('session_id', sessionId).single(),
      supabase.from('sessions').select('world_id').eq('id', sessionId).single(),
    ])

    if (!player || !session) {
      return { fieldsUpdated: false, updates: [] }
    }

    // Fetch player field definitions
    const { data: playerFields } = await supabase
      .from('world_player_fields')
      .select('*')
      .eq('world_id', session.world_id)
      .order('display_order')

    if (!playerFields || playerFields.length === 0) {
      return { fieldsUpdated: false, updates: [] }
    }

    // Build context about current fields
    const currentFieldsContext = playerFields
      .map(field => {
        const currentValue = (player.dynamic_fields as Record<string, unknown>)?.[field.field_name]
        return `- ${field.field_name} (${field.field_type}): ${currentValue ?? field.default_value}`
      })
      .join('\n')

    const fieldDescriptions = playerFields
      .map(field => `- ${field.field_name} (${field.field_type}): ${field.description || 'No description'}`)
      .join('\n')

    // Call LLM to determine if fields should be updated
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: FIELD_UPDATE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this game interaction and determine if any player fields should be updated.

PLAYER FIELDS AVAILABLE:
${fieldDescriptions}

CURRENT FIELD VALUES:
${currentFieldsContext}

PLAYER ACTION:
${playerMessage}

DM RESPONSE:
${dmResponse}

Based on what happened in this interaction, should any player fields be updated? If yes, call the update_player_fields function with the appropriate changes. If no changes are needed, do not call any function.`,
        },
      ],
      tools: [UPDATE_FIELDS_TOOL],
      tool_choice: 'auto',
      temperature: 0.3, // Lower temperature for more consistent field updates
    })

    const message = completion.choices[0]?.message

    // Check if LLM called the tool
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]

      if (toolCall.function.name === 'update_player_fields') {
        const args = JSON.parse(toolCall.function.arguments)
        const updates: FieldUpdate[] = args.updates || []

        if (updates.length > 0) {
          // Apply the updates to the database
          await applyFieldUpdates(supabase, sessionId, updates)

          console.log(`Updated ${updates.length} player field(s):`, updates)

          return {
            fieldsUpdated: true,
            updates,
          }
        }
      }
    }

    // No updates needed
    return { fieldsUpdated: false, updates: [] }

  } catch (error) {
    console.error('Error analyzing dynamic field updates:', error)
    return { fieldsUpdated: false, updates: [] }
  }
}
