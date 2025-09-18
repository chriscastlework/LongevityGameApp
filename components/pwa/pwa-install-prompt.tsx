"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface PWAInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PWAInstallPrompt({
  onInstall,
  onDismiss,
}: PWAInstallPromptProps) {
  const handleDismiss = () => {
    // Set timestamp for 10 minutes from now
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;
    localStorage.setItem(
      "pwa-prompt-dismissed-until",
      tenMinutesFromNow.toString()
    );
    onDismiss();
  };
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-full" />
              </div>
              <div>
                <CardTitle className="text-sm text-card-foreground">
                  Install The Longevity Game.
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Get the full app experience
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-card-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            Install our app for faster access, offline support, and a native app
            experience.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onInstall}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="w-3 h-3 mr-1" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
            >
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
