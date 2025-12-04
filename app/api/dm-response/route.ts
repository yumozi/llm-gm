import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { executeDMResponseWorkflow } from './workflow'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST /api/dm-response
 *
 * Generates a DM response for a player action in a TTRPG session.
 *
 * This endpoint orchestrates the DM response generation workflow:
 * 1. Input Validation
 * 2. Data Retrieval (session, world, player, NPCs, items, etc.)
 * 3. Context Assembly (build context sections)
 * 4. Prompt Construction (assemble final LLM prompt)
 * 5. LLM Generation (generate DM response)
 * 6. Output Persistence (save to database)
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerMessage } = await request.json()
    const supabase = await createClient()

    // Execute the workflow
    const { dmResponse, messageId } = await executeDMResponseWorkflow({
      sessionId,
      playerMessage,
      supabase,
      openai,
    })

    return NextResponse.json({
      response: dmResponse,
      messageId,
    })
  } catch (error) {
    console.error('Error in DM response API:', error)

    if (error instanceof Error) {
      // Handle known errors
      if (error.message === 'Missing sessionId or playerMessage') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message === 'Session not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Failed to generate DM response') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
