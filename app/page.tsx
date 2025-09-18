import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url(/images/mountain-landscape.jpg)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Welcome to the longevity game
            <span className="text-primary">.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join competitions, track your progress, and compete with others in
            our modern PWA platform.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
