"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Menu, Users, User, Settings, QrCode, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Participate",
    href: "/participate",
    icon: QrCode,
    description: "Get your QR code and join activities",
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Users,
    description: "View rankings and scores",
  },
  {
    title: "Scoring Thresholds",
    href: "/admin/scoring-thresholds",
    icon: BarChart3,
    description: "Manage scoring thresholds and demographics",
    adminOnly: true,
  },
];

interface MobileAuthHeaderProps {
  title?: string;
  subtitle?: string;
}

export function MobileAuthHeader({
  title = "Longevity Game",
  subtitle,
}: MobileAuthHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, profile, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-full" />
              </div>
              <div className="animate-pulse">
                <div className="h-5 bg-muted rounded w-32"></div>
              </div>
            </div>
            <div className="w-10 h-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-semibold text-foreground">
                {title}
              </div>
              {subtitle && (
                <div className="text-sm text-muted-foreground">{subtitle}</div>
              )}
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-6">
            {navigationItems.map((item) => {
              // Only show admin items if user is admin
              if (item.adminOnly && profile?.role !== "admin") {
                return null;
              }

              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.title}
                </Link>
              );
            })}
            <LogoutButton variant="outline" size="sm" />
          </nav>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 bg-primary-foreground rounded-full" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{title}</SheetTitle>
                    {subtitle && (
                      <SheetDescription className="text-sm">
                        {subtitle}
                      </SheetDescription>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* User Info */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {profile?.name || user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || "Welcome back!"}
                    </p>
                    {profile?.organisation && (
                      <p className="text-xs text-muted-foreground">
                        {profile.organisation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="mt-6 space-y-1">
                {navigationItems.map((item) => {
                  // Only show admin items if user is admin
                  if (item.adminOnly && profile?.role !== "admin") {
                    return null;
                  }

                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all hover:bg-accent",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="flex-1">
                        <div>{item.title}</div>
                        <div className="text-xs opacity-70">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Settings and Logout */}
              <div className="mt-8 pt-6 border-t border-border space-y-2">
                <div className="px-3">
                  <LogoutButton
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                    showIcon={true}
                  >
                    Sign Out
                  </LogoutButton>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  © 2025 Longevity Game
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
