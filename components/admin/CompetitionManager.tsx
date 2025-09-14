'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, Calendar, Trophy } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { toast } from '../ui/use-toast'
import SchemaBuilder from './SchemaBuilder'

interface Competition {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  category?: string
  participants_count?: number
  start_date?: string
  end_date?: string
  registration_deadline?: string
  custom_form_schema?: any
  created_at: string
  updated_at: string
}

interface CompetitionTemplate {
  id: string
  name: string
  description?: string
  category: string
  form_schema: any
  usage_count: number
}

interface CompetitionManagerProps {
  onCreateCompetition?: (competitionData: any) => Promise<void>
  onUpdateCompetition?: (id: string, competitionData: any) => Promise<void>
  onDeleteCompetition?: (id: string) => Promise<void>
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-red-100 text-red-800'
}

export default function CompetitionManager({
  onCreateCompetition,
  onUpdateCompetition,
  onDeleteCompetition
}: CompetitionManagerProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Mock competitions
        setCompetitions([
          {
            id: '1',
            name: 'Winter Fitness Challenge 2024',
            description: 'Complete fitness challenge with multiple workout categories',
            status: 'active',
            category: 'fitness',
            participants_count: 45,
            start_date: '2024-01-15',
            end_date: '2024-02-15',
            registration_deadline: '2024-01-10',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-05T00:00:00Z'
          },
          {
            id: '2',
            name: 'CrossFit Open Qualifier',
            description: 'Qualifying competition for CrossFit Open',
            status: 'draft',
            category: 'crossfit',
            participants_count: 12,
            start_date: '2024-03-01',
            end_date: '2024-03-31',
            registration_deadline: '2024-02-25',
            created_at: '2024-01-10T00:00:00Z',
            updated_at: '2024-01-12T00:00:00Z'
          }
        ])

        // Mock templates
        setTemplates([
          {
            id: 'template-1',
            name: 'Basic Fitness Challenge',
            description: 'Standard fitness competition form',
            category: 'fitness',
            form_schema: {
              title: 'Fitness Challenge Registration',
              fields: [
                {
                  id: 'name',
                  type: 'text',
                  name: 'full_name',
                  label: 'Full Name',
                  required: true
                },
                {
                  id: 'division',
                  type: 'select',
                  name: 'division',
                  label: 'Division',
                  required: true,
                  options: ['RX', 'Scaled', 'Masters', 'Teen']
                }
              ]
            },
            usage_count: 15
          }
        ])
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load competitions',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         competition.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || competition.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleCreateCompetition = async (competitionData: any) => {
    try {
      if (onCreateCompetition) {
        await onCreateCompetition(competitionData)
      }
      
      // Add to local state (in real app, refetch from API)
      const newCompetition: Competition = {
        ...competitionData,
        id: `comp-${Date.now()}`,
        participants_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setCompetitions(prev => [newCompetition, ...prev])
      setIsCreateDialogOpen(false)
      
      toast({
        title: 'Success',
        description: 'Competition created successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create competition',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteCompetition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competition? This action cannot be undone.')) {
      return
    }

    try {
      if (onDeleteCompetition) {
        await onDeleteCompetition(id)
      }
      
      setCompetitions(prev => prev.filter(comp => comp.id !== id))
      
      toast({
        title: 'Success',
        description: 'Competition deleted successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete competition',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competition Management</h1>
          <p className="text-gray-600">Create and manage your competitions</p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Competition
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{competitions.length}</p>
                <p className="text-sm text-gray-600">Total Competitions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {competitions.reduce((sum, comp) => sum + (comp.participants_count || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {competitions.filter(comp => comp.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Active Competitions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Edit className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-gray-600">Form Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search competitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Competitions List */}
      <div className="grid gap-4">
        {filteredCompetitions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No competitions found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first competition to get started'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create Competition
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCompetitions.map((competition) => (
            <Card key={competition.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{competition.name}</h3>
                      <Badge className={STATUS_COLORS[competition.status]}>
                        {competition.status}
                      </Badge>
                      {competition.category && (
                        <Badge variant="outline">{competition.category}</Badge>
                      )}
                    </div>
                    
                    {competition.description && (
                      <p className="text-gray-600 mb-3">{competition.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{competition.participants_count || 0} participants</span>
                      </div>
                      {competition.registration_deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Deadline: {new Date(competition.registration_deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCompetition(competition)
                        setIsSchemaBuilderOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCompetition(competition)
                        setIsCreateDialogOpen(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCompetition(competition.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Competition Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCompetition ? 'Edit Competition' : 'Create New Competition'}
            </DialogTitle>
          </DialogHeader>
          <CreateCompetitionForm
            competition={selectedCompetition}
            templates={templates}
            onSubmit={handleCreateCompetition}
            onCancel={() => {
              setIsCreateDialogOpen(false)
              setSelectedCompetition(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Schema Builder Dialog */}
      <Dialog open={isSchemaBuilderOpen} onOpenChange={setIsSchemaBuilderOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0">
          <SchemaBuilder
            initialSchema={selectedCompetition?.custom_form_schema}
            onSave={async (schema) => {
              if (selectedCompetition && onUpdateCompetition) {
                await onUpdateCompetition(selectedCompetition.id, {
                  custom_form_schema: schema
                })
              }
              setIsSchemaBuilderOpen(false)
            }}
            onPreview={(schema) => {
              console.log('Preview schema:', schema)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CreateCompetitionFormProps {
  competition?: Competition | null
  templates: CompetitionTemplate[]
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

function CreateCompetitionForm({ competition, templates, onSubmit, onCancel }: CreateCompetitionFormProps) {
  const [formData, setFormData] = useState({
    name: competition?.name || '',
    description: competition?.description || '',
    category: competition?.category || '',
    status: competition?.status || 'draft',
    start_date: competition?.start_date || '',
    end_date: competition?.end_date || '',
    registration_deadline: competition?.registration_deadline || '',
    max_participants: '',
    template_id: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Competition Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter competition name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fitness">Fitness</SelectItem>
              <SelectItem value="crossfit">CrossFit</SelectItem>
              <SelectItem value="powerlifting">Powerlifting</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="cycling">Cycling</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full p-3 border rounded-md"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter competition description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Registration Deadline</label>
          <Input
            type="date"
            value={formData.registration_deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline: e.target.value }))}
          />
        </div>
      </div>

      {templates.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Form Template (Optional)</label>
          <Select
            value={formData.template_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a form template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} - {template.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : (competition ? 'Update' : 'Create')} Competition
        </Button>
      </div>
    </form>
  )
}