import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerMessage } = await request.json()

    if (!sessionId || !playerMessage) {
      return NextResponse.json({ error: 'Missing sessionId or playerMessage' }, { status: 400 })
    }

    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const world = session.worlds

    // Get all world data
    const [
      { data: items },
      { data: locations },
      { data: abilities },
      { data: organizations },
      { data: taxonomies },
      { data: rules },
      { data: playerFields },
      { data: npcs }
    ] = await Promise.all([
      supabase.from('items').select('*').eq('world_id', world.id),
      supabase.from('locations').select('*').eq('world_id', world.id),
      supabase.from('abilities').select('*').eq('world_id', world.id),
      supabase.from('organizations').select('*').eq('world_id', world.id),
      supabase.from('taxonomies').select('*').eq('world_id', world.id),
      supabase.from('rules').select('*').eq('world_id', world.id),
      supabase.from('world_player_fields').select('*').eq('world_id', world.id),
      supabase.from('npcs').select('*').eq('world_id', world.id)
    ])

    // Get player data
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    // Get recent chat history (last 5 interactions)
    const { data: recentMessages } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Build the context prompt
    let contextPrompt = `You are the Dungeon Master for a TTRPG game. Here is the world background and context:

WORLD SETTING:
Name: ${world.name}
Tone: ${world.tone || 'Not specified'}
Description: ${world.description}
Setting Details: ${world.setting}

`

    if (items && items.length > 0) {
      contextPrompt += `\nITEMS IN THIS WORLD:\n`
      items.forEach(item => {
        contextPrompt += `- ${item.name}${item.aliases?.length ? ` (also known as: ${item.aliases.join(', ')})` : ''}: ${item.description}${item.is_unique ? ' [UNIQUE ITEM]' : ''}\n`
      })
    }

    if (locations && locations.length > 0) {
      contextPrompt += `\nLOCATIONS IN THIS WORLD:\n`
      locations.forEach(location => {
        contextPrompt += `- ${location.name}${location.aliases?.length ? ` (also known as: ${location.aliases.join(', ')})` : ''}: ${location.description}\n`
      })
    }

    if (abilities && abilities.length > 0) {
      contextPrompt += `\nABILITIES IN THIS WORLD:\n`
      abilities.forEach(ability => {
        contextPrompt += `- ${ability.name}${ability.aliases?.length ? ` (also known as: ${ability.aliases.join(', ')})` : ''}: ${ability.description}\n`
      })
    }

    if (organizations && organizations.length > 0) {
      contextPrompt += `\nORGANIZATIONS IN THIS WORLD:\n`
      organizations.forEach(org => {
        contextPrompt += `- ${org.name}${org.aliases?.length ? ` (also known as: ${org.aliases.join(', ')})` : ''}: ${org.description}\n`
      })
    }

    if (taxonomies && taxonomies.length > 0) {
      contextPrompt += `\nTAXONOMIES/CATEGORIES IN THIS WORLD:\n`
      taxonomies.forEach(tax => {
        contextPrompt += `- ${tax.name}${tax.aliases?.length ? ` (also known as: ${tax.aliases.join(', ')})` : ''}: ${tax.description}\n`
      })
    }

    if (rules && rules.length > 0) {
      contextPrompt += `\nSPECIAL RULES FOR THIS WORLD:\n`
      rules.forEach(rule => {
        contextPrompt += `- ${rule.name}${rule.aliases?.length ? ` (also known as: ${rule.aliases.join(', ')})` : ''}: ${rule.description}${rule.priority ? ' [HIGH PRIORITY]' : ''}\n`
      })
    }

    if (npcs && npcs.length > 0) {
      contextPrompt += `\nNOTABLE NPCs IN THIS WORLD:\n`
      npcs.forEach(npc => {
        contextPrompt += `- ${npc.name}${npc.aliases?.length ? ` (also known as: ${npc.aliases.join(', ')})` : ''}: ${npc.description}`
        if (npc.personality) contextPrompt += ` Personality: ${npc.personality}`
        if (npc.motivations) contextPrompt += ` Motivations: ${npc.motivations}`
        contextPrompt += `\n`
      })
    }

    if (playerFields && playerFields.length > 0) {
      contextPrompt += `\nPLAYER CUSTOM FIELDS:\n`
      playerFields.forEach(field => {
        contextPrompt += `- ${field.field_name} (${field.field_type})${field.is_hidden ? ' [HIDDEN FROM PLAYER]' : ''}\n`
      })
    }

    if (player) {
      contextPrompt += `\nCURRENT PLAYER CHARACTER:\n`
      contextPrompt += `Name: ${player.name}\n`
      contextPrompt += `Appearance: ${player.appearance}\n`
      if (player.state) contextPrompt += `Current State: ${player.state}\n`
      if (player.dynamic_fields && Object.keys(player.dynamic_fields).length > 0) {
        contextPrompt += `Custom Fields:\n`
        Object.entries(player.dynamic_fields).forEach(([key, value]) => {
          contextPrompt += `- ${key}: ${value}\n`
        })
      }
    }

    // Add recent chat history if available
    if (recentMessages && recentMessages.length > 0) {
      contextPrompt += `\nRECENT CHAT HISTORY (most recent first):\n`
      // Reverse to show chronological order (oldest first)
      recentMessages.reverse().forEach(message => {
        const author = message.author === 'player' ? 'Player' : 'DM'
        contextPrompt += `${author}: ${message.content}\n`
      })
    }

    contextPrompt += `\nGiven this world context and the player's action below, provide an appropriate DM response.

Every part of your response should be for at least one (or more) of the following:

1. Acknowledge and give a logical and objective response to the player's action and intent. You are not to purposefully help nor hinder the player. Try to make a realistic judgement on the consequences of the player's action.
2. Help immerse the player in the world through vivid descriptions.
3. Introduce subtle choices, clues, or hooks for the player to follow up on next. You should NEVER say something can be done, but you will incorporate these hints into your description of the consequence, the situation, or the environment. You should also NEVER suggest to the player that they should be doing something or aiming to do something. Give player agency. Again, the only guidance is the description you give, and it is COMPLETELY up to the player to decide what to do with the information.

You are also responsible for telling a long story over many interactions. This means you will not be giving away everything in one go. Based on existing interactions (if any), slowly reveal more information or have more things happen.

- Do not describe what the player might feel (unless it is explicitly caused by some environment that everyone will feel) e.g. Don't ever say "As you contemplate your choices, you feel a sense of dread".But when in a cold area, it is okay to say "You feel a chill in the air".
- Do not put superficial "engagement" pharses like "You know you must go on.", "You want to explore deeper.", "You feel a sense of uncertainty.", etc. Remove all these.
- Do not include any kind of "conclusion" pharses in your response. If you are NOT describing the environment, NOR describing an event happening, you are probably saying something wrong. If you are saying things you've said before, you are also saying something wrong.
- You need to assume the player knows NOTHING of the world, not the characters, not the items, not the locations, etc. Unless in the past interactions, it is clear that they now know something, you need to assume they know nothing. In your objective narration, don't spoil anything they don't know. You should refer to characters, items, locations, abilities, purely through description rather than names if they don't know them.
- Your response must only include OBJECTIVE DESCRIPTION of the environment, the event, the characters, etc. You must NOT say anything that is not objective description, especially avoid narrative devices like "What could this mean for you?", "How will this go on?", "You wonder if you will make it?", "What will your next step be?", etc.
- Do not always wait for the player to do something. Be proactive and advance the story/situation to the point where the player could take an action that will result in a consequence, while being somewhat concise and not overly long. If the player has shown to not take an action in a circumstance, advance the story/situation to the point where the player faces another set of possible actions and consequences.

Avoid trying too hard to engage players or create suspense, or talk too much about we are doing a TTRPG. After you have given a response that addressed the player's action, STOP. Do not try to talk further.

Everything in the Player Action is what player said, but regardless of how they said it, it is ALWAYS an attempt to do something. Ultimately, you have the right to determine if that attempt is successful or not. If they describe they did something that is out of their capability, whether it is a slightly failed attempt or a complete impossible thing, you should describe that the player tried to do that, and what happens then.

Player Action: "${playerMessage}"

DM Response:`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `
  You are an experienced objective narrator for tabletop role-playing games. You provide engaging, immersive responses that advance the story while staying true to the established world and characters. You are very intentional in your responses. Your responses should always be objective, without any subjective description, artificial engagement phrases, call to action, your opinions, what the player thinks, etc. Use "You" to refer to the player.
  `
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    })

    const dmResponse = completion.choices[0]?.message?.content

    if (!dmResponse) {
      return NextResponse.json({ error: 'Failed to generate DM response' }, { status: 500 })
    }

    // Save the DM response as a message
    const { data: message, error: messageError } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        author: 'dm',
        content: dmResponse,
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving DM message:', messageError)
      // Still return the response even if saving fails
    }

    return NextResponse.json({ 
      response: dmResponse,
      messageId: message?.id 
    })

  } catch (error) {
    console.error('Error in DM response API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
