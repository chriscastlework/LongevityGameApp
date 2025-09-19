"use client";

import type React from "react";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyAuthAndToken = async () => {
      const supabase = createClient();

      try {
        // First check if user is already authenticated from session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User is already authenticated, allow password reset
          console.log('User is authenticated, allowing password reset');
          return;
        }

        // Listen for auth state changes (this handles the Supabase redirect flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              console.log('Password recovery event detected');
              // User is now authenticated via recovery link
              return;
            }

            if (session?.user) {
              console.log('User authenticated via auth state change');
              return;
            }
          }
        );

        // If no session and no auth state change, check for manual token verification
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (token && type === 'recovery') {
          try {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery'
            });

            if (error) {
              console.error('Error verifying reset token:', error);
              router.push("/auth/forgot-password?error=Invalid or expired reset link");
              return;
            }
          } catch (error) {
            console.error('Error verifying reset token:', error);
            router.push("/auth/forgot-password?error=Invalid or expired reset link");
            return;
          }
        }

        // If we reach here and no session/token, we need to wait a bit for auth state
        // Sometimes the auth state change takes a moment
        setTimeout(async () => {
          const { data: { session: laterSession } } = await supabase.auth.getSession();
          if (!laterSession?.user) {
            router.push("/auth/forgot-password");
          }
        }, 1000);

        // Cleanup subscription
        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth verification:', error);
        router.push("/auth/forgot-password");
      }
    };

    verifyAuthAndToken();
  }, [router, searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      router.push("/auth/login?message=Password updated successfully");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="relative z-10 w-full max-w-md p-6">
        <Card className="bg-card/90 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-card-foreground">
              Set new password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-input border-border text-card-foreground placeholder:text-muted-foreground"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-card-foreground"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-input border-border text-card-foreground placeholder:text-muted-foreground"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Updating password..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-primary-foreground rounded-full" />
            </div>
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
