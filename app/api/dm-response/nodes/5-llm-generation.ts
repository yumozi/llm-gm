/**
 * NODE 5: LLM Generation
 * Calls the LLM to generate the DM response
 */

import OpenAI from 'openai'
import { SYSTEM_PROMPT } from '../prompts'

export type LLMGenerationInput = {
  userPrompt: string
  openai: OpenAI
}

export type LLMGenerationOutput = {
  dmResponse: string
}

/**
 * Generates DM response using OpenAI
 */
export async function generateResponse(
  input: LLMGenerationInput
): Promise<LLMGenerationOutput> {
  const { userPrompt, openai } = input

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    max_tokens: 1000,
    temperature: 0.8,
  })

  const dmResponse = completion.choices[0]?.message?.content

  if (!dmResponse) {
    throw new Error('Failed to generate DM response')
  }

  return {
    dmResponse,
  }
}
