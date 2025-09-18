"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    }

    // Periodic check to re-show prompt after dismiss period expires
    const checkDismissedPrompt = () => {
      const dismissedUntil = localStorage.getItem('pwa-prompt-dismissed-until');
      if (dismissedUntil && Date.now() >= parseInt(dismissedUntil) && deferredPrompt && !showInstallPrompt) {
        localStorage.removeItem('pwa-prompt-dismissed-until');
        setShowInstallPrompt(true);
      }
    };

    const intervalId = setInterval(checkDismissedPrompt, 30000); // Check every 30 seconds

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user recently dismissed the prompt
      const dismissedUntil = localStorage.getItem('pwa-prompt-dismissed-until');
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
        // Still within the 10-minute wait period
        return;
      }

      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      console.log("PWA was installed");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt, showInstallPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
  };

  return (
    <>
      {children || <div>No PWA children</div>}
      {showInstallPrompt && (
        <PWAInstallPrompt
          onInstall={handleInstallClick}
          onDismiss={handleDismissInstall}
        />
      )}
    </>
  );
}
