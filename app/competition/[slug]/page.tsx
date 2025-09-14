import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

interface CompetitionPageProps {
  params: Promise<{ slug: string }>
}

export default async function CompetitionPage({ params }: CompetitionPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/auth/login?redirect=/competition/${slug}`)
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

  // Check if user has entered this competition
  const { data: entry } = await supabase
    .from("competition_entries")
    .select("*")
    .eq("competition_id", competition.id)
    .eq("user_id", user.id)
    .single()

  // If user has entered, redirect to results
  if (entry) {
    redirect(`/competition/${slug}/results`)
  }

  // Otherwise, redirect to enter page
  redirect(`/competition/${slug}/enter`)
}
