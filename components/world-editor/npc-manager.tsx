'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react'
import Image from 'next/image'

interface NPC {
  id: string
  world_id: string
  name: string
  aliases: string[] | null
  description: string
  personality: string | null
  motivations: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

interface NPCManagerProps {
  worldId: string
}

export function NPCManager({ worldId }: NPCManagerProps) {
  const supabase = createClient()
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    aliases: '',
    description: '',
    personality: '',
    motivations: '',
    image_url: null as string | null,
  })

  const fetchNPCs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('npcs')
        .select('*')
        .eq('world_id', worldId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNpcs(data || [])
    } catch {
      toast.error('Failed to load NPCs')
    } finally {
      setLoading(false)
    }
  }, [supabase, worldId])

  useEffect(() => {
    fetchNPCs()
  }, [fetchNPCs])

  const handleAdd = () => {
    setFormData({
      name: '',
      aliases: '',
      description: '',
      personality: '',
      motivations: '',
      image_url: null,
    })
    setSelectedNPC(null)
    setIsEditing(true)
  }

  const handleEdit = (npc: NPC) => {
    setFormData({
      name: npc.name,
      aliases: npc.aliases?.join(', ') || '',
      description: npc.description,
      personality: npc.personality || '',
      motivations: npc.motivations || '',
      image_url: npc.image_url,
    })
    setSelectedNPC(npc)
    setIsEditing(true)
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${worldId}-npc-${Date.now()}.${fileExt}`
      const filePath = `npc-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('world-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('world-assets').getPublicUrl(filePath)

      setFormData({ ...formData, image_url: publicUrl })
      toast.success('Image uploaded successfully')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required')
      return
    }

    setSaving(true)
    try {
      const npcData = {
        world_id: worldId,
        name: formData.name.trim(),
        aliases: formData.aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        description: formData.description.trim(),
        personality: formData.personality.trim() || null,
        motivations: formData.motivations.trim() || null,
        image_url: formData.image_url,
      }

      if (selectedNPC) {
        const { error } = await supabase
          .from('npcs')
          .update(npcData)
          .eq('id', selectedNPC.id)

        if (error) throw error
        toast.success('NPC updated successfully')
      } else {
        const { error } = await supabase.from('npcs').insert(npcData)

        if (error) throw error
        toast.success('NPC created successfully')
      }

      await fetchNPCs()
      setIsEditing(false)
    } catch {
      toast.error('Failed to save NPC')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this NPC?')) return

    try {
      const { error } = await supabase.from('npcs').delete().eq('id', id)

      if (error) throw error

      toast.success('NPC deleted successfully')
      await fetchNPCs()
    } catch {
      toast.error('Failed to delete NPC')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-fg-1">Manage non-player characters in this world</p>
        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-[#DA77F2] to-[#6EE7F2] hover:from-[#6EE7F2] hover:to-[#DA77F2] text-bg-0 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add NPC
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-fg-1">
          <div className="w-2 h-2 bg-[#DA77F2] rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-[#6EE7F2] rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-[#F2B880] rounded-full animate-pulse delay-150" />
          Loading NPCs...
        </div>
      ) : npcs.length === 0 ? (
        <Card className="bg-gradient-to-br from-bg-1 to-bg-2 border-[#DA77F2]/20 p-12 text-center">
          <p className="text-fg-1 mb-4">No NPCs yet.</p>
          <p className="text-[#DA77F2]">Add your first NPC to get started!</p>
        </Card>
      ) : (
        <div className="space-y-px">
          <AnimatePresence>
            {npcs.map((npc, index) => (
              <motion.div
                key={npc.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-gradient-to-r from-bg-1 to-bg-2 border-b border-border hover:bg-bg-2/50 transition-colors group"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <span className="text-fg-0 font-medium w-48 truncate">{npc.name}</span>
                    <span className="text-[#DA77F2] text-sm w-64 truncate">
                      {npc.aliases?.join(', ') || '—'}
                    </span>
                    <span className="text-fg-1 text-sm flex-1 truncate">
                      {npc.description}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(npc)}
                      className="p-2 hover:bg-[#6EE7F2]/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-[#6EE7F2]" />
                    </button>
                    <button
                      onClick={() => handleDelete(npc.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-bg-0 border-[#DA77F2]/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#DA77F2] to-[#6EE7F2] bg-clip-text text-transparent">
              {selectedNPC ? 'Edit NPC' : 'New NPC'}
            </DialogTitle>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-[#DA77F2] font-semibold">Character Portrait</Label>
              {formData.image_url ? (
                <div className="relative h-48 rounded-xl overflow-hidden">
                  <Image
                    src={formData.image_url}
                    alt="NPC portrait"
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-bg-0/80 border-red-500/30 hover:border-red-500"
                    onClick={() => setFormData({ ...formData, image_url: null })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#DA77F2]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="npc-image"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                  />
                  <label htmlFor="npc-image" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-[#DA77F2]" />
                    <p className="text-fg-1 text-sm">
                      {uploading ? 'Uploading...' : 'Click to upload image'}
                    </p>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#6EE7F2] font-semibold">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#6EE7F2]"
                placeholder="Character name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliases" className="text-[#DA77F2] font-semibold">
                Aliases
              </Label>
              <Input
                id="aliases"
                value={formData.aliases}
                onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#DA77F2]"
                placeholder="Comma-separated aliases"
              />
              {formData.aliases && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.aliases
                    .split(',')
                    .map((a) => a.trim())
                    .filter(Boolean)
                    .map((alias, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-[#DA77F2]/20 text-[#DA77F2] text-xs rounded-lg border border-[#DA77F2]/30"
                      >
                        {alias}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#F2B880] font-semibold">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#F2B880]"
                rows={4}
                placeholder="Physical appearance, background, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality" className="text-[#6EE7F2] font-semibold">
                Personality
              </Label>
              <Textarea
                id="personality"
                value={formData.personality}
                onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#6EE7F2]"
                rows={3}
                placeholder="Character traits, mannerisms, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivations" className="text-[#DA77F2] font-semibold">
                Motivations
              </Label>
              <Textarea
                id="motivations"
                value={formData.motivations}
                onChange={(e) => setFormData({ ...formData, motivations: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#DA77F2]"
                rows={3}
                placeholder="Goals, desires, fears, etc."
              />
            </div>

            <div className="flex gap-4 justify-end pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="text-fg-1 hover:text-fg-0 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-[#DA77F2] to-[#6EE7F2] hover:from-[#6EE7F2] hover:to-[#DA77F2] text-bg-0 font-semibold px-8"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
