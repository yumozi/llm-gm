'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Database } from '@/lib/database.types'

type Session = Database['public']['Tables']['sessions']['Row']
type Player = Database['public']['Tables']['players']['Row']
type Message = Database['public']['Tables']['session_messages']['Row']
type PlayerField = Database['public']['Tables']['world_player_fields']['Row']

export default function SessionPage() {
  const params = useParams()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const starterSentRef = useRef(false)

  const [session, setSession] = useState<Session | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [playerFields, setPlayerFields] = useState<PlayerField[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSessionData = useCallback(async () => {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', params.id)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Fetch player
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', params.id)
        .maybeSingle()

      setPlayer(playerData)

      // Fetch player fields for the world
      const { data: fieldsData } = await supabase
        .from('world_player_fields')
        .select('*')
        .eq('world_id', sessionData.world_id)
        .eq('is_hidden', false)
        .order('display_order')

      setPlayerFields(fieldsData || [])

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', params.id)
        .order('created_at', { ascending: true })

      setMessages(messagesData || [])

      // Check if we need to send starter message (only once per session)
      if (messagesData && messagesData.length === 0 && !starterSentRef.current) {
        starterSentRef.current = true // Mark as sent immediately to prevent duplicates

        // Fetch world data to get starter message
        const { data: worldData } = await supabase
          .from('worlds')
          .select('starter')
          .eq('id', sessionData.world_id)
          .single()

        // If world has a starter message and there are no messages yet, send it
        if (worldData?.starter && worldData.starter.trim()) {
          const { error: messageError } = await supabase
            .from('session_messages')
            .insert({
              session_id: params.id as string,
              author: 'dm',
              content: worldData.starter.trim(),
            })

          if (!messageError) {
            // Refetch messages to include the starter
            const { data: updatedMessages } = await supabase
              .from('session_messages')
              .select('*')
              .eq('session_id', params.id)
              .order('created_at', { ascending: true })

            setMessages(updatedMessages || [])
          }
        }
      }
    } catch {
      toast.error('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [params.id, supabase])

  const subscribeToMessages = useCallback(() => {
    const channel = supabase
      .channel(`session-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${params.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          
          // Only add if we don't already have this message (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            const exists = prev.some(msg => 
              msg.id === newMessage.id || 
              (msg.content === newMessage.content && msg.created_at === newMessage.created_at)
            )
            
            if (exists) {
              return prev
            }
            
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [params.id, supabase])

  useEffect(() => {
    fetchSessionData()
    const unsubscribe = subscribeToMessages()
    return unsubscribe
  }, [fetchSessionData, subscribeToMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSavePlayer = async () => {
    if (!session || !player?.name || !player?.appearance) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (player.id) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            name: player.name,
            appearance: player.appearance,
            state: player.state,
            dynamic_fields: player.dynamic_fields,
            updated_at: new Date().toISOString(),
          })
          .eq('id', player.id)

        if (error) throw error
      } else {
        // Create new player
        const { data, error } = await supabase
          .from('players')
          .insert({
            session_id: session.id,
            name: player.name,
            appearance: player.appearance,
            state: player.state,
            dynamic_fields: player.dynamic_fields,
          })
          .select()
          .single()

        if (error) throw error
        setPlayer(data)
      }

      toast.success('Player saved!')
    } catch {
      toast.error('Failed to save player')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) {
      return
    }

    const messageContent = newMessage.trim()
    
    // Optimistically add the message to the local state
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID
      session_id: params.id as string,
      author: 'player',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      const { data, error } = await supabase
        .from('session_messages')
        .insert({
          session_id: params.id as string,
          author: 'player',
          content: messageContent,
        })
        .select()
        .single()

      if (error) throw error

      // Replace the optimistic message with the real one from the database
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...data, id: data.id }
            : msg
        )
      )

      // Call DM response API
      try {
        const response = await fetch('/api/dm-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: params.id,
            playerMessage: messageContent,
          }),
        })

        if (response.ok) {
          const dmData = await response.json()
          
          // Add DM response to messages
          const dmMessage: Message = {
            id: dmData.messageId || `dm-${Date.now()}`,
            session_id: params.id as string,
            author: 'dm',
            content: dmData.response,
            created_at: new Date().toISOString(),
          }
          
          setMessages((prev) => [...prev, dmMessage])
        } else {
          console.error('Failed to get DM response:', response.statusText)
        }
      } catch (dmError) {
        console.error('Error calling DM API:', dmError)
        // Don't show error to user, just log it
      }

    } catch {
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter(msg => msg.id !== optimisticMessage.id))
      setNewMessage(messageContent) // Restore the message content
      toast.error('Failed to send message')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">Loading session...</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col p-8 overflow-hidden">
        {/* Player Info Header */}
        <Card className="bg-bg-1 border-border flex-shrink-0 mb-6">
          <CardHeader>
            <CardTitle className="text-fg-0">Player Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="player-name">Name</Label>
                <Input
                  id="player-name"
                  value={player?.name || ''}
                  onChange={(e) => setPlayer({ ...player!, name: e.target.value })}
                  placeholder="Character name (optional)"
                  className="bg-bg-2 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-appearance">Appearance</Label>
                <Input
                  id="player-appearance"
                  value={player?.appearance || ''}
                  onChange={(e) => setPlayer({ ...player!, appearance: e.target.value })}
                  placeholder="Character appearance (optional)"
                  className="bg-bg-2 border-border"
                />
              </div>
            </div>


            {/* Dynamic Fields - Read Only */}
            {playerFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {playerFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`field-${field.id}`}>{field.field_name}</Label>
                    <Input
                      id={`field-${field.id}`}
                      type={field.field_type === 'number' ? 'number' : 'text'}
                      value={String((player?.dynamic_fields as Record<string, unknown>)?.[field.field_name] ?? '')}
                      readOnly
                      className="bg-bg-2/50 border-border text-fg-1 cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleSavePlayer}
              className="bg-accent hover:bg-accent/90 text-bg-0"
            >
              Save Player
            </Button>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="bg-bg-1 border-border flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-fg-0">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-bg-2 rounded-lg">
              {messages.length === 0 ? (
                <p className="text-fg-1 text-center">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((message) => {
                  const isPlayer = message.author === 'player'
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 ${isPlayer ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isPlayer && (
                        <div className="w-6 h-6 rounded-full bg-[#F2B880] text-bg-0 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          GM
                        </div>
                      )}
                      <div className={`max-w-[75%] px-3 py-2 rounded-lg ${
                        isPlayer
                          ? 'bg-bg-2 text-fg-0 border border-[#6EE7F2]/30'
                          : 'bg-bg-1 text-fg-0 border border-border'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                      </div>
                      {isPlayer && (
                        <div className="w-6 h-6 rounded-full bg-[#6EE7F2] text-bg-0 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          P
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="bg-bg-2 border-border"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-[#6EE7F2] hover:bg-[#6EE7F2]/90 text-bg-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
