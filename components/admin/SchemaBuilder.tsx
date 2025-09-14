'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Trash2, Settings, Eye, Code, Save } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { toast } from '../ui/use-toast'

interface FormField {
  id: string
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'boolean' | 'radio' | 'checkbox'
  name: string
  label: string
  description?: string
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

interface CompetitionSchema {
  title: string
  description?: string
  fields: FormField[]
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'select', label: 'Select Dropdown', icon: '📋' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'date', label: 'Date Picker', icon: '📅' },
  { value: 'boolean', label: 'Yes/No', icon: '✅' },
  { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
]

interface SchemaBuilderProps {
  initialSchema?: CompetitionSchema
  onSave: (schema: CompetitionSchema) => Promise<void>
  onPreview?: (schema: CompetitionSchema) => void
}

export default function SchemaBuilder({ initialSchema, onSave, onPreview }: SchemaBuilderProps) {
  const [schema, setSchema] = useState<CompetitionSchema>(
    initialSchema || {
      title: '',
      description: '',
      fields: []
    }
  )
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('builder')
  const [isSaving, setIsSaving] = useState(false)

  const jsonSchema = useMemo(() => {
    const properties: Record<string, any> = {}
    const required: string[] = []

    schema.fields.forEach(field => {
      const property: any = {
        title: field.label,
        description: field.description
      }

      switch (field.type) {
        case 'text':
        case 'email':
          property.type = 'string'
          if (field.type === 'email') {
            property.format = 'email'
          }
          if (field.placeholder) {
            property.default = field.placeholder
          }
          break
        case 'number':
          property.type = 'number'
          if (field.validation?.min !== undefined) {
            property.minimum = field.validation.min
          }
          if (field.validation?.max !== undefined) {
            property.maximum = field.validation.max
          }
          break
        case 'textarea':
          property.type = 'string'
          property.format = 'textarea'
          break
        case 'select':
        case 'radio':
          property.type = 'string'
          property.enum = field.options || []
          break
        case 'checkbox':
          property.type = 'array'
          property.items = {
            type: 'string',
            enum: field.options || []
          }
          break
        case 'boolean':
          property.type = 'boolean'
          break
        case 'date':
          property.type = 'string'
          property.format = 'date'
          break
        case 'file':
          property.type = 'string'
          property.format = 'uri'
          break
      }

      properties[field.name] = property
      if (field.required) {
        required.push(field.name)
      }
    })

    return {
      type: 'object',
      title: schema.title,
      description: schema.description,
      properties,
      required
    }
  }, [schema])

  const addField = useCallback((type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      name: `field_${schema.fields.length + 1}`,
      label: `New ${type} field`,
      required: false
    }

    if (type === 'select' || type === 'radio' || type === 'checkbox') {
      newField.options = ['Option 1', 'Option 2']
    }

    setSchema(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
    setSelectedField(newField.id)
  }, [schema.fields.length])

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }, [])

  const removeField = useCallback((fieldId: string) => {
    setSchema(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }))
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }, [selectedField])

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return

    const items = Array.from(schema.fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSchema(prev => ({
      ...prev,
      fields: items
    }))
  }, [schema.fields])

  const handleSave = async () => {
    if (!schema.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for your form',
        variant: 'destructive'
      })
      return
    }

    if (schema.fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one field to your form',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave(schema)
      toast({
        title: 'Success',
        description: 'Schema saved successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save schema',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const selectedFieldData = schema.fields.find(f => f.id === selectedField)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Form Builder */}
      <div className="w-2/3 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Competition Form Builder</h2>
            <div className="flex gap-2">
              {onPreview && (
                <Button
                  variant="outline"
                  onClick={() => onPreview(schema)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Schema'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="schema-title">Form Title</Label>
              <Input
                id="schema-title"
                value={schema.title}
                onChange={(e) => setSchema(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter form title..."
              />
            </div>
            <div>
              <Label htmlFor="schema-description">Description (Optional)</Label>
              <Input
                id="schema-description"
                value={schema.description || ''}
                onChange={(e) => setSchema(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter form description..."
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="builder">Visual Builder</TabsTrigger>
            <TabsTrigger value="json">JSON Schema</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            {/* Field Types Palette */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <Button
                      key={fieldType.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addField(fieldType.value as FormField['type'])}
                      className="flex flex-col items-center gap-1 h-16"
                    >
                      <span className="text-lg">{fieldType.icon}</span>
                      <span className="text-xs">{fieldType.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Form Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Form Fields</CardTitle>
              </CardHeader>
              <CardContent>
                {schema.fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No fields added yet.</p>
                    <p className="text-sm">Use the buttons above to add form fields.</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="fields">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef}>
                          {schema.fields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`mb-3 p-4 bg-white border rounded-lg cursor-move ${
                                    selectedField === field.id ? 'ring-2 ring-blue-500' : ''
                                  } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                  onClick={() => setSelectedField(field.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">
                                        {FIELD_TYPES.find(t => t.value === field.type)?.icon}
                                      </span>
                                      <div>
                                        <div className="font-medium">{field.label}</div>
                                        <div className="text-sm text-gray-500">
                                          {field.type} • {field.name} {field.required && '(Required)'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedField(field.id)
                                        }}
                                      >
                                        <Settings className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeField(field.id)
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">JSON Schema Output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                  {JSON.stringify(jsonSchema, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Field Properties */}
      <div className="w-1/3 bg-white border-l p-6">
        {selectedFieldData ? (
          <FieldPropertiesPanel
            field={selectedFieldData}
            onChange={(updates) => updateField(selectedFieldData.id, updates)}
          />
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Select a field to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface FieldPropertiesPanelProps {
  field: FormField
  onChange: (updates: Partial<FormField>) => void
}

function FieldPropertiesPanel({ field, onChange }: FieldPropertiesPanelProps) {
  const [options, setOptions] = useState(field.options?.join('\n') || '')

  const handleOptionsChange = (value: string) => {
    setOptions(value)
    const optionsList = value.split('\n').filter(opt => opt.trim())
    onChange({ options: optionsList })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Field Properties</h3>
        <div className="text-sm text-gray-500 mb-4">
          Editing: {FIELD_TYPES.find(t => t.value === field.type)?.label}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="field-name">Field Name</Label>
          <Input
            id="field-name"
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">Used for form data (no spaces or special characters)</p>
        </div>

        <div>
          <Label htmlFor="field-label">Label</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="field-description">Description (Optional)</Label>
          <Textarea
            id="field-description"
            value={field.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
          />
        </div>

        {(field.type === 'text' || field.type === 'email' || field.type === 'textarea') && (
          <div>
            <Label htmlFor="field-placeholder">Placeholder</Label>
            <Input
              id="field-placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
            />
          </div>
        )}

        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <Label htmlFor="field-options">Options (one per line)</Label>
            <Textarea
              id="field-options"
              value={options}
              onChange={(e) => handleOptionsChange(e.target.value)}
              rows={4}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}

        {field.type === 'number' && (
          <>
            <div>
              <Label htmlFor="field-min">Minimum Value</Label>
              <Input
                id="field-min"
                type="number"
                value={field.validation?.min || ''}
                onChange={(e) => onChange({
                  validation: {
                    ...field.validation,
                    min: e.target.value ? parseFloat(e.target.value) : undefined
                  }
                })}
              />
            </div>
            <div>
              <Label htmlFor="field-max">Maximum Value</Label>
              <Input
                id="field-max"
                type="number"
                value={field.validation?.max || ''}
                onChange={(e) => onChange({
                  validation: {
                    ...field.validation,
                    max: e.target.value ? parseFloat(e.target.value) : undefined
                  }
                })}
              />
            </div>
          </>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="field-required"
            checked={field.required}
            onCheckedChange={(required) => onChange({ required })}
          />
          <Label htmlFor="field-required">Required field</Label>
        </div>
      </div>
    </div>
  )
}