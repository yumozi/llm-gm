'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus,
  Save,
  Copy,
  Trash2,
  Play,
  Settings,
  GitBranch,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  EdgeProps,
  ReactFlowProvider,
  OnConnect,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface StoryGraphManagerProps {
  worldId: string
}

// Custom Node Component
const StoryNodeComponent = ({ data, selected }: { data: { name: string; description: string; trigger_conditions?: Record<string, unknown> }; selected: boolean }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-4 py-2 shadow-lg rounded-lg border-2 min-w-[200px] ${
        selected
          ? 'border-[#6EE7F2] bg-gradient-to-br from-[#6EE7F2]/20 to-[#DA77F2]/20'
          : 'border-[#6EE7F2]/30 bg-gradient-to-br from-bg-1 to-bg-2'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Play className="w-4 h-4 text-[#6EE7F2]" />
        <h3 className="font-semibold text-fg-0 text-sm">{data.name}</h3>
      </div>
      <p className="text-xs text-fg-1 line-clamp-2">{data.description}</p>
      {data.trigger_conditions && Object.keys(data.trigger_conditions).length > 0 && (
        <div className="mt-1 flex items-center gap-1">
          <Settings className="w-3 h-3 text-[#F2B880]" />
          <span className="text-xs text-[#F2B880]">Has triggers</span>
        </div>
      )}
    </motion.div>
  )
}

// Custom Edge Component
const StoryEdgeComponent = ({ data, selected }: EdgeProps<{ label?: string; priority?: number }>) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`px-2 py-1 rounded text-xs ${
        selected
          ? 'bg-[#6EE7F2]/20 text-[#6EE7F2]'
          : 'bg-bg-2/50 text-fg-1'
      }`}
    >
      {data?.label || 'Story Path'}
      {data?.priority && data.priority > 0 && (
        <span className="ml-1 text-[#F2B880]">({data.priority})</span>
      )}
    </motion.div>
  )
}

const nodeTypes: NodeTypes = {
  storyNode: StoryNodeComponent,
}

const edgeTypes: EdgeTypes = {
  storyEdge: StoryEdgeComponent,
}

export function StoryGraphManager({ worldId }: StoryGraphManagerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEditingNode, setIsEditingNode] = useState(false)
  const [isEditingEdge, setIsEditingEdge] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const { user } = useAuth()

  const [nodeFormData, setNodeFormData] = useState({
    name: '',
    aliases: '',
    description: '',
    trigger_conditions: '{}',
  })

  const [edgeFormData, setEdgeFormData] = useState({
    label: '',
    priority: 0,
  })

  const fetchStoryData = useCallback(async () => {
    try {
      // Fetch nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('story_nodes')
        .select('*')
        .eq('world_id', worldId)
        .order('created_at', { ascending: false })

      if (nodesError) throw nodesError

      // Fetch edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('story_edges')
        .select('*')
        .eq('world_id', worldId)

      if (edgesError) throw edgesError

      // Convert to React Flow format
      const flowNodes: Node[] = nodesData?.map((node, index) => ({
        id: node.id,
        type: 'storyNode',
        position: { 
          x: (index % 3) * 300 + 100, 
          y: Math.floor(index / 3) * 200 + 100 
        },
        data: {
          name: node.name,
          description: node.description,
          trigger_conditions: node.trigger_conditions,
        },
      })) || []

      const flowEdges: Edge[] = edgesData?.map((edge) => ({
        id: edge.id,
        source: edge.from_node_id,
        target: edge.to_node_id,
        type: 'storyEdge',
        data: {
          label: edge.label,
          priority: edge.priority,
        },
        animated: edge.priority > 0,
      })) || []

      setNodes(flowNodes)
      setEdges(flowEdges)
    } catch {
      toast.error('Failed to load story graph')
    } finally {
      setLoading(false)
    }
  }, [supabase, worldId, setNodes, setEdges])

  useEffect(() => {
    fetchStoryData()
  }, [fetchStoryData])

  const onConnect: OnConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return

      try {
        const { data: newEdge, error } = await supabase
          .from('story_edges')
          .insert({
            world_id: worldId,
            from_node_id: params.source,
            to_node_id: params.target,
            label: 'New Path',
            priority: 0,
          })
          .select()
          .single()

        if (error) throw error

        const edge: Edge = {
          id: newEdge.id,
          source: params.source,
          target: params.target,
          type: 'storyEdge',
          data: {
            label: newEdge.label,
            priority: newEdge.priority,
          },
        }

        setEdges((eds) => addEdge(edge, eds))
        toast.success('Story connection created!')
      } catch {
        toast.error('Failed to create story connection')
      }
    },
    [worldId, supabase, setEdges]
  )

  const handleAddNode = async () => {
    try {
      const { data: newNode, error } = await supabase
        .from('story_nodes')
        .insert({
          world_id: worldId,
          name: 'New Story Node',
          description: 'A new story node waiting to be defined',
          aliases: [],
          trigger_conditions: {},
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      const nodeCount = nodes.length
      const newNodeFlow: Node = {
        id: newNode.id,
        type: 'storyNode',
        position: { 
          x: (nodeCount % 3) * 300 + 100, 
          y: Math.floor(nodeCount / 3) * 200 + 100 
        },
        data: {
          name: newNode.name,
          description: newNode.description,
          trigger_conditions: newNode.trigger_conditions,
        },
      }

      setNodes((nds) => [...nds, newNodeFlow])
      toast.success('Story node created!')
    } catch {
      toast.error('Failed to create story node')
    }
  }

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
    
    // Find the actual story node data
    const storyNode = nodes.find(n => n.id === node.id)
    if (storyNode) {
      setNodeFormData({
        name: storyNode.data.name,
        aliases: '', // We'll need to fetch this from the database
        description: storyNode.data.description,
        trigger_conditions: JSON.stringify(storyNode.data.trigger_conditions || {}, null, 2),
      })
    }
    
    // Open the editing modal
    setIsEditingNode(true)
  }

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
    
    setEdgeFormData({
      label: edge.data?.label || '',
      priority: edge.data?.priority || 0,
    })
    
    // Open the editing modal
    setIsEditingEdge(true)
  }

  const handleSaveNode = async () => {
    if (!selectedNode || !nodeFormData.name.trim() || !nodeFormData.description.trim()) {
      toast.error('Name and description are required')
      return
    }

    setSaving(true)
    try {
      let triggerConditions = {}
      try {
        triggerConditions = JSON.parse(nodeFormData.trigger_conditions)
      } catch {
        toast.error('Invalid JSON in trigger conditions')
        return
      }

      const { error } = await supabase
        .from('story_nodes')
        .update({
          name: nodeFormData.name.trim(),
          description: nodeFormData.description.trim(),
          aliases: nodeFormData.aliases.split(',').map(a => a.trim()).filter(Boolean),
          trigger_conditions: triggerConditions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNode.id)

      if (error) throw error

      // Update the node in the flow
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  name: nodeFormData.name.trim(),
                  description: nodeFormData.description.trim(),
                  trigger_conditions: triggerConditions,
                },
              }
            : node
        )
      )

      toast.success('Story node updated!')
      setIsEditingNode(false)
    } catch {
      toast.error('Failed to save story node')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdge = async () => {
    if (!selectedEdge) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('story_edges')
        .update({
          label: edgeFormData.label.trim() || null,
          priority: edgeFormData.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEdge.id)

      if (error) throw error

      // Update the edge in the flow
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === selectedEdge.id
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  label: edgeFormData.label.trim(),
                  priority: edgeFormData.priority,
                },
                animated: edgeFormData.priority > 0,
              }
            : edge
        )
      )

      toast.success('Story edge updated!')
      setIsEditingEdge(false)
    } catch {
      toast.error('Failed to save story edge')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) return

    if (!confirm('Are you sure you want to delete this story node? This will also delete all connected edges.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('story_nodes')
        .delete()
        .eq('id', selectedNode.id)

      if (error) throw error

      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id))
      setSelectedNode(null)
      setIsEditingNode(false)
      toast.success('Story node deleted!')
    } catch {
      toast.error('Failed to delete story node')
    }
  }

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return

    try {
      const { error } = await supabase
        .from('story_edges')
        .delete()
        .eq('id', selectedEdge.id)

      if (error) throw error

      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id))
      setSelectedEdge(null)
      setIsEditingEdge(false)
      toast.success('Story edge deleted!')
    } catch {
      toast.error('Failed to delete story edge')
    }
  }

  const handleCopyJSON = () => {
    const data = {
      nodes: nodes.map(node => ({
        id: node.id,
        name: node.data.name,
        description: node.data.description,
        trigger_conditions: node.data.trigger_conditions,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        from: edge.source,
        to: edge.target,
        label: edge.data?.label,
        priority: edge.data?.priority,
      })),
    }
    
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    toast.success('Story graph data copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-fg-1">
          <div className="w-2 h-2 bg-[#6EE7F2] rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-[#6EE7F2] rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-[#6EE7F2] rounded-full animate-pulse delay-150" />
          Loading story graph...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-gradient-to-br from-bg-1 to-bg-2 border-[#6EE7F2]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-[#6EE7F2] flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Story Graph
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddNode}
                  className="bg-gradient-to-r from-[#6EE7F2] to-[#F2B880] hover:from-[#F2B880] hover:to-[#6EE7F2] text-bg-0 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Node
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyJSON}
                  className="border-[#6EE7F2]/30 hover:border-[#6EE7F2]"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </Button>
              </div>
            </div>
            <div className="text-sm text-fg-1">
              {nodes.length} nodes, {edges.length} connections
            </div>
          </div>
        </CardContent>
      </Card>

      {/* React Flow Canvas */}
      <Card className="bg-gradient-to-br from-bg-1 to-bg-2 border-[#6EE7F2]/20">
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              className="bg-bg-0"
            >
              <Controls className="bg-bg-2 border-border" />
              <MiniMap 
                className="bg-bg-2 border-border"
                nodeColor="#6EE7F2"
                maskColor="rgba(0, 0, 0, 0.5)"
              />
              <Background color="#6EE7F2" gap={20} size={1} />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Node Inspector Modal */}
      <Dialog open={isEditingNode} onOpenChange={setIsEditingNode}>
        <DialogContent className="bg-bg-0 border-[#6EE7F2]/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#6EE7F2] to-[#F2B880] bg-clip-text text-transparent">
              Edit Story Node
            </DialogTitle>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="node-name" className="text-[#6EE7F2] font-semibold">
                  Node Name *
                </Label>
                <Input
                  id="node-name"
                  value={nodeFormData.name}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, name: e.target.value })}
                  className="bg-bg-2 border-border focus:border-[#6EE7F2] focus:ring-[#6EE7F2]/20 transition-all"
                  placeholder="Enter story node name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-aliases" className="text-[#DA77F2] font-semibold">
                  Aliases (comma-separated)
                </Label>
                <Input
                  id="node-aliases"
                  value={nodeFormData.aliases}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, aliases: e.target.value })}
                  placeholder="Alternative names, comma-separated"
                  className="bg-bg-2 border-border focus:border-[#DA77F2] focus:ring-[#DA77F2]/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-description" className="text-[#F2B880] font-semibold">
                  Description *
                </Label>
                <Textarea
                  id="node-description"
                  value={nodeFormData.description}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, description: e.target.value })}
                  rows={4}
                  className="bg-bg-2 border-border focus:border-[#F2B880] focus:ring-[#F2B880]/20 transition-all"
                  placeholder="Describe this story node"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-triggers" className="text-[#6EE7F2] font-semibold">
                  Trigger Conditions (JSON)
                </Label>
                <Textarea
                  id="node-triggers"
                  value={nodeFormData.trigger_conditions}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, trigger_conditions: e.target.value })}
                  rows={6}
                  className="bg-bg-2 border-border focus:border-[#6EE7F2] focus:ring-[#6EE7F2]/20 transition-all font-mono text-sm"
                  placeholder='{"condition": "value", "another_condition": "another_value"}'
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleDeleteNode}
                className="border-red-500/30 hover:border-red-500 text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={handleSaveNode}
                disabled={saving}
                className="bg-gradient-to-r from-[#6EE7F2] to-[#F2B880] hover:from-[#F2B880] hover:to-[#6EE7F2] text-bg-0 font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edge Inspector Modal */}
      <Dialog open={isEditingEdge} onOpenChange={setIsEditingEdge}>
        <DialogContent className="bg-bg-0 border-[#6EE7F2]/30 max-w-lg">
          <div className="space-y-6">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#6EE7F2] to-[#F2B880] bg-clip-text text-transparent">
              Edit Story Edge
            </DialogTitle>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edge-label" className="text-[#6EE7F2] font-semibold">
                  Edge Label
                </Label>
                <Input
                  id="edge-label"
                  value={edgeFormData.label}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, label: e.target.value })}
                  className="bg-bg-2 border-border focus:border-[#6EE7F2] focus:ring-[#6EE7F2]/20 transition-all"
                  placeholder="Enter edge label"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edge-priority" className="text-[#F2B880] font-semibold">
                  Priority
                </Label>
                <Input
                  id="edge-priority"
                  type="number"
                  value={edgeFormData.priority}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, priority: parseInt(e.target.value) || 0 })}
                  className="bg-bg-2 border-border focus:border-[#F2B880] focus:ring-[#F2B880]/20 transition-all"
                  placeholder="0"
                />
                <p className="text-xs text-fg-1">Higher priority edges will be animated</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleDeleteEdge}
                className="border-red-500/30 hover:border-red-500 text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={handleSaveEdge}
                disabled={saving}
                className="bg-gradient-to-r from-[#6EE7F2] to-[#F2B880] hover:from-[#F2B880] hover:to-[#6EE7F2] text-bg-0 font-semibold"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrapper component with ReactFlowProvider
export function StoryGraphManagerWrapper({ worldId }: StoryGraphManagerProps) {
  return (
    <ReactFlowProvider>
      <StoryGraphManager worldId={worldId} />
    </ReactFlowProvider>
  )
}
