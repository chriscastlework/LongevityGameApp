import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CompetitionEntryForm } from "@/components/competitions/competition-entry-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Calendar, Users, Trophy } from "lucide-react"

interface CompetitionEnterPageProps {
  params: Promise<{ slug: string }>
}

export default async function CompetitionEnterPage({ params }: CompetitionEnterPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/auth/login?redirect=/competition/${slug}/enter`)
  }

  // Fetch competition
  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .single()

  if (competitionError || !competition) {
    notFound()
  }

  // Check if user has already entered
  const { data: existingEntry } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", competition.id)
    .eq("user_id", user.id)
    .single()

  if (existingEntry) {
    redirect(`/competition/${slug}/results`)
  }

  // Check if competition is active
  const now = new Date()
  const startDate = new Date(competition.start_date)
  const endDate = new Date(competition.end_date)

  const isActive = startDate <= now && endDate >= now

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/competitions">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Competitions
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Trophy className="w-8 h-8 text-primary mt-1" />
              <div className="flex-1">
                <CardTitle className="text-2xl text-card-foreground mb-2">{competition.title}</CardTitle>
                <CardDescription className="text-muted-foreground">{competition.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(competition.start_date).toLocaleDateString()} -{" "}
                  {new Date(competition.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{competition.max_participants} max participants</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isActive ? (
          <CompetitionEntryForm competition={competition} />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-8">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Competition Not Active</h3>
              <p className="text-muted-foreground mb-4">This competition is not currently accepting entries.</p>
              <Button asChild variant="outline">
                <Link href="/competitions">Browse Other Competitions</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
