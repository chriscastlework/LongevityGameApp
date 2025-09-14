"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Competition } from "@/lib/types/database"

interface CompetitionEntryFormProps {
  competition: Competition
}

export function CompetitionEntryForm({ competition }: CompetitionEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    submissionUrl: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const entryData = {
        title: formData.title,
        description: formData.description,
        submission_url: formData.submissionUrl,
        submitted_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("competition_entries").insert({
        user_id: user.id,
        competition_id: competition.id,
        entry_data: entryData,
        score: 0,
        rank: 0,
      })

      if (error) throw error

      router.push(`/competition/${competition.slug}/results`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground">Submit Your Entry</CardTitle>
        <CardDescription className="text-muted-foreground">
          Fill out the form below to enter this competition.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-card-foreground">
              Entry Title
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-input border-border text-card-foreground"
              placeholder="Give your entry a title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-card-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-input border-border text-card-foreground"
              placeholder="Describe your entry"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submissionUrl" className="text-card-foreground">
              Submission URL (Optional)
            </Label>
            <Input
              id="submissionUrl"
              type="url"
              value={formData.submissionUrl}
              onChange={(e) => setFormData({ ...formData, submissionUrl: e.target.value })}
              className="bg-input border-border text-card-foreground"
              placeholder="https://example.com/your-submission"
            />
          </div>

          {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</div>}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? "Submitting..." : "Submit Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
