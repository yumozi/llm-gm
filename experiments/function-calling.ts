/**
 * Standalone experiment script to test Function Calling vs SQL Generation
 *
 * This script simulates the dm-response workflow with a hardcoded scenario
 * to compare the performance and output of both approaches.
 *
 * Run with: npm run experiment [numTrials]
 * Example: npm run experiment 5
 */

import OpenAI from 'openai'
import { SYSTEM_PROMPT, DM_GUIDELINES, FIELD_UPDATE_SYSTEM_PROMPT } from '../app/api/dm-response/prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Static test scenario
const SCENARIO = {
  worldSetting: 'A dark fantasy world where magic comes at a cost',
  ability: {
    name: 'Blood Gun',
    description: 'Shoots the user\'s blood out to deal 10 damage to opponent. User takes 1 damage from drawing the blood.',
  },
  playerField: {
    name: 'Health Points',
    type: 'number',
    currentValue: 10,
  },
  playerAction: 'I want to use Blood Gun on the monster',
  encounter: 'You encounter a hostile monster blocking your path',
}

// Tool definition for function calling
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
 * Build the context prompt for DM response generation
 */
function buildDMPrompt(): string {
  return `${DM_GUIDELINES}

WORLD SETTING:
${SCENARIO.worldSetting}

ABILITIES IN THIS WORLD:
- ${SCENARIO.ability.name}: ${SCENARIO.ability.description}

PLAYER CUSTOM FIELDS:
- ${SCENARIO.playerField.name} (${SCENARIO.playerField.type}): ${SCENARIO.playerField.currentValue}

CURRENT PLAYER CHARACTER:
Health Points: ${SCENARIO.playerField.currentValue}

CURRENT SITUATION:
${SCENARIO.encounter}

PLAYER ACTION:
${SCENARIO.playerAction}

Provide your DM response:`
}

/**
 * Build the prompt for field update analysis
 */
function buildFieldUpdatePrompt(dmResponse: string): string {
  return `Analyze this game interaction and determine if any player fields should be updated.

PLAYER FIELDS AVAILABLE:
- ${SCENARIO.playerField.name} (${SCENARIO.playerField.type}): Track player's health

CURRENT FIELD VALUES:
- ${SCENARIO.playerField.name} (${SCENARIO.playerField.type}): ${SCENARIO.playerField.currentValue}

PLAYER ACTION:
${SCENARIO.playerAction}

DM RESPONSE:
${dmResponse}

Based on what happened in this interaction, should any player fields be updated? If yes, call the update_player_fields function with the appropriate changes. If no changes are needed, do not call any function. Only update existing fields, do not create new fields.`
}

/**
 * Build the SQL generation prompt
 */
function buildSQLPrompt(dmResponse: string, updates: any[]): string {
  return `Analyze this game interaction and generate a SQL query to apply the necessary field updates.

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
Session ID: test-session-id

PLAYER FIELDS AVAILABLE:
- ${SCENARIO.playerField.name} (${SCENARIO.playerField.type}): Track player's health

CURRENT FIELD VALUES:
- ${SCENARIO.playerField.name} (${SCENARIO.playerField.type}): ${SCENARIO.playerField.currentValue}

PLAYER ACTION:
${SCENARIO.playerAction}

DM RESPONSE:
${dmResponse}

Generate a SQL statement that applies the field updates to the dynamic_fields JSONB column for the player in this session. The query should:
1. Update the dynamic_fields JSONB column using jsonb_set or similar operations
2. Update the updated_at timestamp to the current time
3. Filter by session_id = 'test-session-id'
4. Only update existing fields, do not create new fields

Return ONLY the SQL query, no explanations.`
}

/**
 * Run a single trial of the experiment
 */
async function runTrial(trialNumber: number) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`TRIAL ${trialNumber}`)
  console.log('='.repeat(80))

  // Step 1: Generate DM Response
  console.log('\n[STEP 1] Generating DM response...')
  const dmPrompt = buildDMPrompt()

  const dmStartTime = Date.now()
  const dmCompletion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: dmPrompt },
    ],
    temperature: 0.7,
  })
  const dmEndTime = Date.now()

  const dmResponse = dmCompletion.choices[0]?.message?.content || ''
  const dmDuration = dmEndTime - dmStartTime
  const dmTokens = dmCompletion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  console.log('DM Response generated:')
  console.log(dmResponse)
  console.log(`\nDM Generation Stats: ${dmDuration}ms, ${dmTokens.total_tokens} tokens`)

  // Step 2: Function Calling Approach
  console.log('\n[STEP 2] Running Function Calling approach...')
  const fieldUpdatePrompt = buildFieldUpdatePrompt(dmResponse)

  const functionStartTime = Date.now()
  const functionCompletion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: FIELD_UPDATE_SYSTEM_PROMPT },
      { role: 'user', content: fieldUpdatePrompt },
    ],
    tools: [UPDATE_FIELDS_TOOL],
    tool_choice: 'auto',
    temperature: 0.3,
  })
  const functionEndTime = Date.now()

  const functionDuration = functionEndTime - functionStartTime
  const functionTokens = functionCompletion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

  const functionMessage = functionCompletion.choices[0]?.message
  let functionUpdates: any[] = []

  if (functionMessage?.tool_calls && functionMessage.tool_calls.length > 0) {
    const toolCall = functionMessage.tool_calls[0]
    if (toolCall.function.name === 'update_player_fields') {
      const args = JSON.parse(toolCall.function.arguments)
      functionUpdates = args.updates || []
    }
  }

  // Step 3: SQL Generation Approach
  console.log('\n[STEP 3] Running SQL Generation approach...')
  const sqlPrompt = buildSQLPrompt(dmResponse, functionUpdates)

  const sqlStartTime = Date.now()
  const sqlCompletion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: FIELD_UPDATE_SYSTEM_PROMPT + '\n\nInstead of calling a function, generate a SQL query to apply the necessary field updates.' },
      { role: 'user', content: sqlPrompt },
    ],
    temperature: 0.3, // Same temperature as function calling for fair comparison
  })
  const sqlEndTime = Date.now()

  const sqlDuration = sqlEndTime - sqlStartTime
  const sqlTokens = sqlCompletion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  const generatedSQL = sqlCompletion.choices[0]?.message?.content?.trim() || ''

  // Log experiment results
  console.log('\n' + '='.repeat(80))
  console.log('EXPERIMENT RESULTS')
  console.log('='.repeat(80))

  console.log('\n1. FUNCTION CALL INPUT')
  console.log('---')
  console.log('System Prompt:')
  console.log(FIELD_UPDATE_SYSTEM_PROMPT)
  console.log('\nUser Prompt:')
  console.log(fieldUpdatePrompt)
  console.log('\nTool Definition:')
  console.log(JSON.stringify(UPDATE_FIELDS_TOOL, null, 2))
  console.log('---')

  console.log('\n1. FUNCTION CALL OUTPUT')
  console.log('---')
  console.log('Tool Called: update_player_fields')
  console.log('Arguments:')
  console.log(JSON.stringify(functionUpdates, null, 2))
  console.log('---')

  console.log('\n2. SQL CALL INPUT')
  console.log('---')
  console.log('System Prompt:')
  console.log(FIELD_UPDATE_SYSTEM_PROMPT + '\n\nInstead of calling a function, generate a SQL query to apply the necessary field updates.')
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
  console.log(`  Duration: ${functionDuration}ms`)
  console.log(`  Total tokens: ${functionTokens.total_tokens}`)
  console.log('\nSQL Generation:')
  console.log(`  Duration: ${sqlDuration}ms`)
  console.log(`  Total tokens: ${sqlTokens.total_tokens}`)
  console.log('---')
  console.log('\n' + '='.repeat(80) + '\n')
}

/**
 * Main function to run the experiment
 */
async function main() {
  const numTrials = parseInt(process.argv[2] || '1', 10)

  console.log('Starting experiment...')
  console.log(`Number of trials: ${numTrials}`)
  console.log(`Scenario: ${SCENARIO.encounter}`)
  console.log(`Player Action: ${SCENARIO.playerAction}`)

  for (let i = 1; i <= numTrials; i++) {
    await runTrial(i)
  }

  console.log('Experiment complete!')
}

// Run the experiment
main().catch(console.error)
