'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

interface PlayerField {
  id: string
  world_id: string
  field_name: string
  field_type: 'text' | 'number'
  default_value: string | null
  is_hidden: boolean
  display_order: number
  created_at: string
  updated_at: string
}

interface PlayerFieldsManagerProps {
  worldId: string
}

export function PlayerFieldsManager({ worldId }: PlayerFieldsManagerProps) {
  const supabase = createClient()
  const [fields, setFields] = useState<PlayerField[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedField, setSelectedField] = useState<PlayerField | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text' as 'text' | 'number',
    is_hidden: false,
    default_value: '',
  })

  const fetchFields = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('world_player_fields')
        .select('*')
        .eq('world_id', worldId)
        .order('display_order', { ascending: true })

      if (error) throw error
      setFields(data || [])
    } catch {
      toast.error('Failed to load player fields')
    } finally {
      setLoading(false)
    }
  }, [supabase, worldId])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const handleAdd = () => {
    setFormData({
      field_name: '',
      field_type: 'text',
      is_hidden: false,
      default_value: '',
    })
    setSelectedField(null)
    setIsEditing(true)
  }

  const handleEdit = (field: PlayerField) => {
    setFormData({
      field_name: field.field_name,
      field_type: field.field_type,
      is_hidden: field.is_hidden,
      default_value: field.default_value || '',
    })
    setSelectedField(field)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!formData.field_name.trim()) {
      toast.error('Field name is required')
      return
    }

    setSaving(true)
    try {
      if (selectedField) {
        // Update existing field
        const { error } = await supabase
          .from('world_player_fields')
          .update({
            field_name: formData.field_name.trim(),
            field_type: formData.field_type,
            is_hidden: formData.is_hidden,
            default_value: formData.default_value || null,
          })
          .eq('id', selectedField.id)

        if (error) throw error
        toast.success('Field updated successfully')
      } else {
        // Create new field
        const { error } = await supabase
          .from('world_player_fields')
          .insert({
            world_id: worldId,
            field_name: formData.field_name.trim(),
            field_type: formData.field_type,
            is_hidden: formData.is_hidden,
            default_value: formData.default_value || null,
            display_order: fields.length,
          })

        if (error) throw error
        toast.success('Field created successfully')
      }

      setIsEditing(false)
      await fetchFields()
    } catch {
      toast.error('Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return

    try {
      const { error } = await supabase
        .from('world_player_fields')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Field deleted successfully')
      await fetchFields()
    } catch {
      toast.error('Failed to delete field')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-fg-1 mb-2">
            Define custom fields for players in this world
          </p>
          <p className="text-fg-1 text-sm">
            Hidden fields are stored but not displayed in the session UI
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-[#F2B880] to-[#6EE7F2] hover:from-[#6EE7F2] hover:to-[#F2B880] text-bg-0 font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Field
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-fg-1">
          <div className="w-2 h-2 bg-[#F2B880] rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-[#6EE7F2] rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-[#DA77F2] rounded-full animate-pulse delay-150" />
          Loading fields...
        </div>
      ) : fields.length === 0 ? (
        <Card className="bg-gradient-to-br from-bg-1 to-bg-2 border-[#F2B880]/20 p-12 text-center">
          <p className="text-fg-1 mb-4">No player fields defined yet.</p>
          <p className="text-[#F2B880]">Add fields to customize your player schema!</p>
        </Card>
      ) : (
        <div className="space-y-px">
          <AnimatePresence>
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-gradient-to-r from-bg-1 to-bg-2 border-b border-border hover:bg-bg-2/50 transition-colors group"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <span className="text-fg-0 font-medium w-48 truncate">{field.field_name}</span>
                    <span className="text-[#6EE7F2] text-sm w-32 truncate capitalize">
                      {field.field_type}
                    </span>
                    <span className="text-fg-1 text-sm w-48 truncate">
                      {field.default_value || '—'}
                    </span>
                    <div className="flex items-center gap-2">
                      {field.is_hidden ? (
                        <EyeOff className="w-4 h-4 text-fg-1" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#6EE7F2]" />
                      )}
                      <span className="text-fg-1 text-sm">
                        {field.is_hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(field)}
                      className="p-2 hover:bg-[#6EE7F2]/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-[#6EE7F2]" />
                    </button>
                    <button
                      onClick={() => handleDelete(field.id)}
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
        <DialogContent className="bg-bg-0 border-[#F2B880]/30 max-w-2xl">
          <div className="space-y-6">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#F2B880] to-[#6EE7F2] bg-clip-text text-transparent">
              {selectedField ? 'Edit Field' : 'New Field'}
            </DialogTitle>

            <div className="space-y-2">
              <Label htmlFor="field_name" className="text-[#6EE7F2] font-semibold">
                Field Name *
              </Label>
              <Input
                id="field_name"
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#6EE7F2]"
                placeholder="e.g., hp, currency, level"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type" className="text-[#DA77F2] font-semibold">
                Field Type
              </Label>
              <Select
                value={formData.field_type}
                onValueChange={(value: 'text' | 'number') =>
                  setFormData({ ...formData, field_type: value })
                }
              >
                <SelectTrigger className="bg-bg-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_value" className="text-[#F2B880] font-semibold">
                Default Value (Optional)
              </Label>
              <Input
                id="default_value"
                type={formData.field_type === 'number' ? 'number' : 'text'}
                value={formData.default_value}
                onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                className="bg-bg-2 border-border focus:border-[#F2B880]"
                placeholder={`Default ${formData.field_type} value`}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_hidden}
                onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
              />
              <Label className="text-fg-0">
                Hidden field (stored but not displayed in session UI)
              </Label>
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
                className="bg-gradient-to-r from-[#F2B880] to-[#6EE7F2] hover:from-[#6EE7F2] hover:to-[#F2B880] text-bg-0 font-semibold px-8"
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