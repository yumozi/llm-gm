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
 * Only updates existing fields - does not create new fields
 */
async function applyFieldUpdates(
  supabase: SupabaseClient,
  sessionId: string,
  updates: FieldUpdate[],
  validFieldNames: string[]
): Promise<FieldUpdate[]> {
  // Get the player
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (fetchError || !player) {
    console.error('Failed to fetch player for field updates:', fetchError)
    return []
  }

  // Filter updates to only include valid fields
  const validUpdates: FieldUpdate[] = []
  const invalidUpdates: FieldUpdate[] = []

  updates.forEach(update => {
    if (validFieldNames.includes(update.field_name)) {
      validUpdates.push(update)
    } else {
      invalidUpdates.push(update)
    }
  })

  // Log warning if LLM tried to update non-existent fields
  if (invalidUpdates.length > 0) {
    console.warn('⚠️  LLM attempted to update non-existent fields (ignored):')
    invalidUpdates.forEach(update => {
      console.warn(`   - ${update.field_name} = ${update.new_value}`)
    })
  }

  // Apply only valid updates to dynamic_fields
  const updatedFields = { ...(player.dynamic_fields as Record<string, unknown> || {}) }

  validUpdates.forEach(update => {
    updatedFields[update.field_name] = update.new_value
  })

  // Only save if there are valid updates
  if (validUpdates.length > 0) {
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

  return validUpdates
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
    // Track timing and token usage for function calling approach
    const functionCallingUserPrompt = `Analyze this game interaction and determine if any player fields should be updated.

PLAYER FIELDS AVAILABLE:
${fieldDescriptions}

CURRENT FIELD VALUES:
${currentFieldsContext}

PLAYER ACTION:
${playerMessage}

DM RESPONSE:
${dmResponse}

Based on what happened in this interaction, should any player fields be updated? If yes, call the update_player_fields function with the appropriate changes. If no changes are needed, do not call any function. Only update existing fields, do not create new fields.`

    const functionCallingStartTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: FIELD_UPDATE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: functionCallingUserPrompt,
        },
      ],
      tools: [UPDATE_FIELDS_TOOL],
      tool_choice: 'auto',
      temperature: 0.3, // Lower temperature for more consistent field updates
    })
    const functionCallingEndTime = Date.now()
    const functionCallingDuration = functionCallingEndTime - functionCallingStartTime
    const functionCallingTokens = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const message = completion.choices[0]?.message

    // Check if LLM called the tool
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]

      if (toolCall.function.name === 'update_player_fields') {
        const args = JSON.parse(toolCall.function.arguments)
        const requestedUpdates: FieldUpdate[] = args.updates || []

        if (requestedUpdates.length > 0) {
          // ======================================================================
          // EXPERIMENT: SQL Generation Comparison
          // ======================================================================
          // Call LLM to generate equivalent SQL query for comparison
          try {
            const sqlPrompt = `Analyze this game interaction and generate a SQL UPDATE query to apply the necessary field updates.

DATABASE SCHEMA:
Table: players
Columns:
- id (UUID, primary key)
- session_id (UUID, references sessions)
- name (TEXT)
- appearance (TEXT)
- state (TEXT)
- dynamic_fields (JSONB) - stores player custom fields as JSON
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

CURRENT CONTEXT:
Session ID: ${sessionId}

PLAYER FIELDS AVAILABLE:
${fieldDescriptions}

CURRENT FIELD VALUES:
${currentFieldsContext}

PLAYER ACTION:
${playerMessage}

DM RESPONSE:
${dmResponse}

Generate a SQL UPDATE statement that applies the field updates to the dynamic_fields JSONB column for the player in this session. The query should:
1. Update the dynamic_fields JSONB column using jsonb_set or similar operations
2. Update the updated_at timestamp to the current time
3. Filter by session_id = '${sessionId}'
4. Only update existing fields, do not create new fields

Return ONLY the SQL query, no explanations.`

            // Track timing and token usage for SQL generation approach
            const sqlStartTime = Date.now()
            const sqlCompletion = await openai.chat.completions.create({
              model: 'gpt-4.1',
              messages: [
                {
                  role: 'system',
                  content: FIELD_UPDATE_SYSTEM_PROMPT + '\n\nInstead of calling a function, generate a SQL UPDATE query to apply the necessary field updates.',
                },
                {
                  role: 'user',
                  content: sqlPrompt,
                },
              ],
              temperature: 0.3, // Same temperature as function calling for fair comparison
            })
            const sqlEndTime = Date.now()
            const sqlDuration = sqlEndTime - sqlStartTime
            const sqlTokens = sqlCompletion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

            const generatedSQL = sqlCompletion.choices[0]?.message?.content?.trim() || ''

            // Log the comparison with performance metrics
            console.log('\n========================================')
            console.log('EXPERIMENT: Function Calling vs SQL Generation')
            console.log('========================================')

            console.log('\n1. FUNCTION CALL INPUT')
            console.log('---')
            console.log('System Prompt:')
            console.log(FIELD_UPDATE_SYSTEM_PROMPT)
            console.log('\nUser Prompt:')
            console.log(functionCallingUserPrompt)
            console.log('\nTool Definition:')
            console.log(JSON.stringify(UPDATE_FIELDS_TOOL, null, 2))
            console.log('---')

            console.log('\n1. FUNCTION CALL OUTPUT')
            console.log('---')
            console.log('Tool Called: update_player_fields')
            console.log('Arguments:')
            console.log(JSON.stringify(requestedUpdates, null, 2))
            console.log('---')

            console.log('\n2. SQL CALL INPUT')
            console.log('---')
            console.log('System Prompt:')
            console.log(FIELD_UPDATE_SYSTEM_PROMPT + '\n\nInstead of calling a function, generate a SQL UPDATE query to apply the necessary field updates.')
            console.log('\nUser Prompt:')
            console.log(sqlPrompt)
            console.log('---')

            console.log('\n2. SQL CALL OUTPUT')
            console.log('---')
            console.log(generatedSQL)
            console.log('---')

            console.log('\n3. STATISTICS')
            console.log('---')
            console.log('Function Call:')
            console.log(`  Duration: ${functionCallingDuration}ms`)
            console.log(`  Total tokens: ${functionCallingTokens.total_tokens}`)
            console.log('\nSQL Generation:')
            console.log(`  Duration: ${sqlDuration}ms`)
            console.log(`  Total tokens: ${sqlTokens.total_tokens}`)
            console.log('---')
            console.log('\n========================================\n')
          } catch (sqlError) {
            console.error('Error generating SQL for comparison:', sqlError)
          }

          // ======================================================================
          // Apply updates to database (with validation)
          // ======================================================================
          // TEMPORARILY DISABLED FOR EXPERIMENT - NOT APPLYING DATABASE UPDATES
          // Get valid field names from playerFields
          // const validFieldNames = playerFields.map(f => f.field_name)

          // Apply the updates to the database (only valid fields)
          // const appliedUpdates = await applyFieldUpdates(supabase, sessionId, requestedUpdates, validFieldNames)

          // console.log(`Updated ${appliedUpdates.length} player field(s):`, appliedUpdates)

          console.log('⚠️  DATABASE UPDATE DISABLED FOR EXPERIMENT')
          console.log(`Would have updated ${requestedUpdates.length} field(s):`, requestedUpdates)

          return {
            fieldsUpdated: false, // Not actually updating during experiment
            updates: requestedUpdates,
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
