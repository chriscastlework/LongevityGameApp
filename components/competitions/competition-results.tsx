"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, ExternalLink } from "lucide-react"
import type { Competition, CompetitionEntry } from "@/lib/types/database"

interface CompetitionResultsProps {
  competition: Competition
  userEntry: CompetitionEntry | null
  entries: (CompetitionEntry & { profiles: { first_name: string; last_name: string } })[]
}

export function CompetitionResults({ competition, userEntry, entries }: CompetitionResultsProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
        )
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case 2:
        return "bg-gray-400/10 text-gray-400 border-gray-400/20"
      case 3:
        return "bg-amber-600/10 text-amber-600 border-amber-600/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* User's Entry Status */}
      {userEntry && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              Your Entry
              {userEntry.rank > 0 && <Badge className={getRankColor(userEntry.rank)}>Rank #{userEntry.rank}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-card-foreground">
                {(userEntry.entry_data as any)?.title || "Untitled Entry"}
              </h4>
              <p className="text-muted-foreground">
                {(userEntry.entry_data as any)?.description || "No description provided"}
              </p>
              {(userEntry.entry_data as any)?.submission_url && (
                <a
                  href={(userEntry.entry_data as any).submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                >
                  View Submission <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {userEntry.score > 0 && <div className="text-sm text-muted-foreground">Score: {userEntry.score}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Leaderboard</CardTitle>
          <CardDescription className="text-muted-foreground">Competition results and rankings</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    entry.user_id === userEntry?.user_id
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getRankIcon(index + 1)}
                    <div>
                      <div className="font-medium text-card-foreground">
                        {entry.profiles.first_name} {entry.profiles.last_name}
                        {entry.user_id === userEntry?.user_id && (
                          <span className="text-primary text-sm ml-2">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(entry.entry_data as any)?.title || "Untitled Entry"}
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    {entry.score > 0 && <div className="font-semibold text-card-foreground">{entry.score} pts</div>}
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
