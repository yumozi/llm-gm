/**
 * DM Response Generation Workflow
 *
 * This workflow orchestrates the DM response generation pipeline:
 *
 * Input → Retrieval → Assembly → Construction → Generation → Persistence → Field Update → Output
 *
 * Each node is a discrete step with clear inputs and outputs.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Import nodes
import { validateInput, InputValidationInput } from './nodes/1-input-validation'
import { retrieveData } from './nodes/2-data-retrieval'
import { assembleContext } from './nodes/3-context-assembly'
import { constructPrompt } from './nodes/4-prompt-construction'
import { generateResponse } from './nodes/5-llm-generation'
import { persistOutput } from './nodes/6-output-persistence'
import { analyzeDynamicFieldUpdates } from './nodes/7-dynamic-field-update'

export type WorkflowInput = {
  sessionId: string | undefined
  playerMessage: string | undefined
  supabase: SupabaseClient
  openai: OpenAI
}

export type WorkflowOutput = {
  dmResponse: string
  messageId: string | null
}

/**
 * Executes the complete DM response generation workflow
 *
 * Pipeline:
 * 1. Validate Input → Ensure request has required fields
 * 2. Retrieve Data → Fetch world, player, and message data
 * 3. Assemble Context → Build context sections from data
 * 4. Construct Prompt → Create final LLM prompt
 * 5. Generate Response → Call LLM to generate DM response
 * 6. Persist Output → Save response to database
 * 7. Dynamic Field Update → Analyze response and update player fields if needed
 */
export async function executeDMResponseWorkflow(
  input: WorkflowInput
): Promise<WorkflowOutput> {
  const { sessionId, playerMessage, supabase, openai } = input

  // ============================================================================
  // NODE 1: Input Validation
  // ============================================================================
  const validatedInput = await validateInput({
    sessionId,
    playerMessage,
  })

  // ============================================================================
  // NODE 2: Data Retrieval
  // ============================================================================
  const retrievedData = await retrieveData({
    sessionId: validatedInput.sessionId,
    supabase,
  })

  // ============================================================================
  // NODE 3: Context Assembly
  // ============================================================================
  const contextSections = await assembleContext(retrievedData)

  // ============================================================================
  // NODE 4: Prompt Construction
  // ============================================================================
  const { userPrompt } = await constructPrompt({
    contextSections,
    playerMessage: validatedInput.playerMessage,
  })

  // ============================================================================
  // NODE 5: LLM Generation
  // ============================================================================
  const { dmResponse } = await generateResponse({
    userPrompt,
    openai,
  })

  // ============================================================================
  // NODE 6: Output Persistence
  // ============================================================================
  const output = await persistOutput({
    sessionId: validatedInput.sessionId,
    dmResponse,
    supabase,
  })

  // ============================================================================
  // NODE 7: Dynamic Field Update
  // ============================================================================
  await analyzeDynamicFieldUpdates({
    sessionId: validatedInput.sessionId,
    dmResponse,
    playerMessage: validatedInput.playerMessage,
    openai,
    supabase,
  })

  return output
}
