'use client'

import React, { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Upload, Save, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Switch } from '../ui/switch'
import { Progress } from '../ui/progress'
import { toast } from '../ui/use-toast'
import { Alert, AlertDescription } from '../ui/alert'

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

interface DynamicFormProps {
  schema: CompetitionSchema
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => Promise<void>
  onSave?: (data: Record<string, any>) => Promise<void>
  isSubmitting?: boolean
  readOnly?: boolean
}

// Generate Zod schema from form schema
function generateZodSchema(fields: FormField[]): z.ZodObject<any> {
  const schemaObject: Record<string, z.ZodTypeAny> = {}

  fields.forEach(field => {
    let zodField: z.ZodTypeAny

    switch (field.type) {
      case 'text':
      case 'email':
      case 'textarea':
        zodField = z.string()
        if (field.type === 'email') {
          zodField = zodField.email('Please enter a valid email address')
        }
        if (field.validation?.pattern) {
          zodField = zodField.regex(
            new RegExp(field.validation.pattern),
            field.validation.message || 'Invalid format'
          )
        }
        break

      case 'number':
        zodField = z.coerce.number()
        if (field.validation?.min !== undefined) {
          zodField = zodField.min(field.validation.min)
        }
        if (field.validation?.max !== undefined) {
          zodField = zodField.max(field.validation.max)
        }
        break

      case 'select':
      case 'radio':
        zodField = z.string()
        if (field.options && field.options.length > 0) {
          zodField = z.enum(field.options as [string, ...string[]])
        }
        break

      case 'checkbox':
        zodField = z.array(z.string())
        break

      case 'boolean':
        zodField = z.boolean()
        break

      case 'date':
        zodField = z.string().refine(
          (val) => !isNaN(Date.parse(val)),
          'Please enter a valid date'
        )
        break

      case 'file':
        zodField = z.any()
        break

      default:
        zodField = z.string()
    }

    if (!field.required) {
      zodField = zodField.optional()
    }

    schemaObject[field.name] = zodField
  })

  return z.object(schemaObject)
}

export default function DynamicForm({
  schema,
  initialData,
  onSubmit,
  onSave,
  isSubmitting = false,
  readOnly = false
}: DynamicFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({})
  const [saveProgress, setSaveProgress] = useState(0)

  const zodSchema = generateZodSchema(schema.fields)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isValid }
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData || {},
    mode: 'onChange'
  })

  const watchedValues = watch()

  // Calculate form completion percentage
  const completionPercentage = Math.round(
    (Object.keys(watchedValues).filter(key => {
      const value = watchedValues[key]
      return value !== undefined && value !== '' && value !== null
    }).length / schema.fields.length) * 100
  )

  const handleFileUpload = useCallback((fieldName: string, files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    setUploadedFiles(prev => ({
      ...prev,
      [fieldName]: fileArray
    }))

    // Set file URLs in form data (in real implementation, upload to storage first)
    setValue(fieldName, fileArray.map(f => f.name).join(', '))
  }, [setValue])

  const handleFormSubmit = async (data: Record<string, any>) => {
    try {
      // Include uploaded files in submission
      const submissionData = {
        ...data,
        _files: uploadedFiles
      }
      await onSubmit(submissionData)
      toast({
        title: 'Success',
        description: 'Form submitted successfully!'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit form. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleSaveDraft = async () => {
    if (!onSave) return

    try {
      setSaveProgress(0)
      const interval = setInterval(() => {
        setSaveProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 100)

      const draftData = {
        ...watchedValues,
        _files: uploadedFiles,
        _isDraft: true
      }
      
      await onSave(draftData)
      
      toast({
        title: 'Draft Saved',
        description: 'Your progress has been saved'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive'
      })
    }
  }

  const renderField = (field: FormField) => {
    const error = errors[field.name]
    const commonProps = {
      disabled: readOnly || isSubmitting
    }

    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Input
                {...formField}
                {...commonProps}
                type={field.type}
                placeholder={field.placeholder}
                className={error ? 'border-red-500' : ''}
              />
            )}
          />
        )

      case 'number':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Input
                {...formField}
                {...commonProps}
                type="number"
                min={field.validation?.min}
                max={field.validation?.max}
                placeholder={field.placeholder}
                className={error ? 'border-red-500' : ''}
              />
            )}
          />
        )

      case 'textarea':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Textarea
                {...formField}
                {...commonProps}
                placeholder={field.placeholder}
                rows={4}
                className={error ? 'border-red-500' : ''}
              />
            )}
          />
        )

      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Select
                onValueChange={formField.onChange}
                value={formField.value}
                disabled={commonProps.disabled}
              >
                <SelectTrigger className={error ? 'border-red-500' : ''}>
                  <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )

      case 'radio':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <RadioGroup
                onValueChange={formField.onChange}
                value={formField.value}
                disabled={commonProps.disabled}
                className={error ? 'border border-red-500 rounded p-2' : ''}
              >
                {field.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                    <Label htmlFor={`${field.name}-${option}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        )

      case 'checkbox':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className={`space-y-2 ${error ? 'border border-red-500 rounded p-2' : ''}`}>
                {field.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.name}-${option}`}
                      checked={formField.value?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const currentValue = formField.value || []
                        if (checked) {
                          formField.onChange([...currentValue, option])
                        } else {
                          formField.onChange(currentValue.filter((v: string) => v !== option))
                        }
                      }}
                      disabled={commonProps.disabled}
                    />
                    <Label htmlFor={`${field.name}-${option}`}>{option}</Label>
                  </div>
                ))}
              </div>
            )}
          />
        )

      case 'boolean':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="flex items-center space-x-2">
                <Switch
                  id={field.name}
                  checked={formField.value || false}
                  onCheckedChange={formField.onChange}
                  disabled={commonProps.disabled}
                />
                <Label htmlFor={field.name}>{field.label}</Label>
              </div>
            )}
          />
        )

      case 'date':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <div className="relative">
                <Input
                  {...formField}
                  {...commonProps}
                  type="date"
                  className={error ? 'border-red-500' : ''}
                />
                <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            )}
          />
        )

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              multiple
              disabled={commonProps.disabled}
              onChange={(e) => handleFileUpload(field.name, e.target.files)}
              className={error ? 'border-red-500' : ''}
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
            {uploadedFiles[field.name] && (
              <div className="space-y-1">
                {uploadedFiles[field.name].map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <Upload className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: formField }) => (
              <Input
                {...formField}
                {...commonProps}
                placeholder={field.placeholder}
                className={error ? 'border-red-500' : ''}
              />
            )}
          />
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{schema.title}</h1>
        {schema.description && (
          <p className="text-gray-600">{schema.description}</p>
        )}
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Form Completion</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {schema.fields.map((field) => (
          <Card key={field.id}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={field.name} className="text-base font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                </div>
                
                {field.description && (
                  <p className="text-sm text-gray-600">{field.description}</p>
                )}

                {field.type !== 'boolean' && renderField(field)}
                {field.type === 'boolean' && (
                  <div className="pt-2">
                    {renderField(field)}
                  </div>
                )}

                {errors[field.name] && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {errors[field.name]?.message as string}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6">
          <div className="flex items-center space-x-2">
            {onSave && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!isDirty || isSubmitting}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
            )}
            {saveProgress > 0 && saveProgress < 100 && (
              <Progress value={saveProgress} className="w-32" />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {completionPercentage}% complete
            </span>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting || readOnly}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Entry'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Submission Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• All required fields must be completed before submission</p>
          <p>• Files must be under 10MB each</p>
          <p>• You can save drafts and return later to complete your submission</p>
          <p>• Once submitted, entries may not be editable depending on competition rules</p>
        </CardContent>
      </Card>
    </div>
  )
}