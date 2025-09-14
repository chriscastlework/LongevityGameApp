import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompetitionsList } from "@/components/competitions/competitions-list";
import { CreateCompetitionButton } from "@/components/competitions/create-competition-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trophy, Menu, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const supabase = await createClient();

  // Get user (middleware already verified authentication)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile to check admin status
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  // Fetch competitions
  const { data: competitions, error: competitionsError } = await supabase
    .from("competitions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (competitionsError) {
    console.error("Error fetching competitions:", competitionsError);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-full" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                {" "}
                The Longevity Fitness Games.
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/competitions"
                className="text-foreground font-medium"
              >
                Competitions
              </Link>
              <Link
                href="/profile"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Profile
              </Link>
              <form action="/auth/logout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  Logout
                </Button>
              </form>
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/competitions"
                      className="flex items-center gap-2"
                    >
                      <Trophy className="w-4 h-4" />
                      Competitions
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form
                      action="/auth/logout"
                      method="post"
                      className="flex items-center gap-2"
                    >
                      <button
                        type="submit"
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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

        <CompetitionsList competitions={competitions || []} />
      </main>
    </div>
  );
}
