"use client";

import { useAuthContext } from "@/components/providers/auth-provider";
import { CompetitionsList } from "@/components/competitions/competitions-list";
import { CreateCompetitionButton } from "@/components/competitions/create-competition-button";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface Competition {
  id: string;
  title: string;
  description: string;
  slug: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function CompetitionsPage() {
  const { user, profile, isLoading, isAuthenticated } = useAuthContext();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);

  useEffect(() => {
    async function fetchCompetitions() {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("competitions")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching competitions:", error);
        } else {
          setCompetitions(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch competitions:", error);
      } finally {
        setCompetitionsLoading(false);
      }
    }

    fetchCompetitions();
  }, []);

  // Show loading state
  if (isLoading || competitionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2 mx-auto">
            <div className="w-4 h-4 bg-primary-foreground rounded-full" />
          </div>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (this should be handled by middleware, but just in case)
  if (!isAuthenticated) {
    window.location.href = '/auth/login';
    return null;
  }

  return (
    <AuthenticatedLayout
      title="Competitions"
      subtitle="Join and compete with others"
    >
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Competitions
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Join competitions and compete with others
              </p>
            </div>
          </div>

          {profile?.is_admin && <CreateCompetitionButton />}
        </div>

        <CompetitionsList competitions={competitions} />
      </main>
    </AuthenticatedLayout>
  );
}
