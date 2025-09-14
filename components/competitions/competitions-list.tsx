"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Calendar, Users, Trophy } from "lucide-react"
import type { Competition } from "@/lib/types/database"

interface CompetitionsListProps {
  competitions: Competition[]
}

export function CompetitionsList({ competitions }: CompetitionsListProps) {
  if (competitions.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">No competitions yet</h3>
        <p className="text-sm md:text-base text-muted-foreground">Check back later for new competitions to join!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {competitions.map((competition) => (
        <CompetitionCard key={competition.id} competition={competition} />
      ))}
    </div>
  )
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const startDate = new Date(competition.start_date)
  const endDate = new Date(competition.end_date)
  const now = new Date()

  const isUpcoming = startDate > now
  const isActive = startDate <= now && endDate >= now
  const isEnded = endDate < now

  const getStatus = () => {
    if (isUpcoming) return { label: "Upcoming", variant: "secondary" as const }
    if (isActive) return { label: "Active", variant: "default" as const }
    return { label: "Ended", variant: "outline" as const }
  }

  const status = getStatus()

  return (
    <Card className="bg-card border-border hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base md:text-lg text-card-foreground line-clamp-2 leading-tight">
            {competition.title}
          </CardTitle>
          <Badge variant={status.variant} className="text-xs shrink-0">
            {status.label}
          </Badge>
        </div>
        <CardDescription className="text-xs md:text-sm text-muted-foreground line-clamp-3">
          {competition.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
            <span>{startDate.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 md:w-4 md:h-4" />
            <span>{competition.max_participants} max</span>
          </div>
        </div>

        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
          <Link href={`/competition/${competition.slug}`}>{isActive ? "Join Competition" : "View Details"}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
