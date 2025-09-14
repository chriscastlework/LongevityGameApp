import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CompetitionResults } from "@/components/competitions/competition-results"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Trophy, Calendar, Users } from "lucide-react"

interface CompetitionResultsPageProps {
  params: Promise<{ slug: string }>
}

export default async function CompetitionResultsPage({ params }: CompetitionResultsPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/auth/login?redirect=/competition/${slug}/results`)
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

  // Fetch user's entry
  const { data: userEntry } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", competition.id)
    .eq("user_id", user.id)
    .single()

  // Fetch all entries for leaderboard
  const { data: entries } = await supabase
    .from("competition_entries")
    .select(`
      *,
      profiles:user_id (
        first_name,
        last_name
      )
    `)
    .eq("competition_id", competition.id)
    .order("score", { ascending: false })

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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
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
                <span>{entries?.length || 0} participants</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <CompetitionResults competition={competition} userEntry={userEntry} entries={entries || []} />
      </main>
    </div>
  )
}
