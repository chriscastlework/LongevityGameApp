"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useLoginMutation } from "@/lib/auth/useAuth";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useDeepLink } from "./deep-link-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface EnhancedLoginFormProps {
  className?: string;
  onSuccess?: () => void;
  showSignupLink?: boolean;
  showForgotPasswordLink?: boolean;
}

export function EnhancedLoginForm({
  className,
  onSuccess,
  showSignupLink = true,
  showForgotPasswordLink = true,
}: EnhancedLoginFormProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const loginMutation = useLoginMutation();

  const { getRedirectUrl, getCompetitionId, buildAuthUrl, setAuthFlow } =
    useDeepLink();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle successful authentication - let the login page handle redirect
  useEffect(() => {
    if (isAuthenticated && isSubmitting) {
      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [isAuthenticated, isSubmitting, onSuccess]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await loginMutation.mutateAsync({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });
    } catch (error: any) {
      setLocalError(error?.message || "Login failed");
      setIsSubmitting(false);
    }
  };

  const handleSignupClick = () => {
    setAuthFlow("signup");
    const signupUrl = buildAuthUrl("signup");
    router.push(signupUrl);
  };

  const handleForgotPasswordClick = () => {
    setAuthFlow("reset");
    const resetUrl = buildAuthUrl("reset");
    router.push(resetUrl);
  };

  const currentCompetition = getCompetitionId();
  const currentRedirect = getRedirectUrl();

  const error = localError || (loginMutation.error as any)?.message;
  const loading = authLoading || isSubmitting || loginMutation.isPending;

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            {currentCompetition
              ? "Sign in to join the competition"
              : "Sign in to your account"}
          </p>
          {currentCompetition && (
            <div className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md">
              Competition entry requires authentication
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email"
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                      onChange={(e) => {
                        field.onChange(e);
                        if (error) setLocalError(null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={loading}
                        autoComplete="current-password"
                        className="pr-10"
                        onChange={(e) => {
                          field.onChange(e);
                          if (error) setLocalError(null);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showForgotPasswordLink && (
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0 text-sm"
                  onClick={handleForgotPasswordClick}
                  disabled={loading}
                >
                  Forgot your password?
                </Button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>

        {/* OAuth Options */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* OAuth Buttons - placeholder for now */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" disabled>
            Google
          </Button>
          <Button variant="outline" disabled>
            GitHub
          </Button>
        </div>

        {/* Sign up link */}
        {showSignupLink && (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>
            <Button
              type="button"
              variant="link"
              className="px-0 text-sm font-medium"
              onClick={handleSignupClick}
              disabled={loading}
            >
              Sign up
            </Button>
          </div>
        )}

        {/* Debug info when enabled */}
        {process.env.NEXT_PUBLIC_SHOW_AUTH_DEBUG && (
          <div className="mt-8 p-4 bg-muted rounded-md text-xs">
            <div className="font-medium mb-2">Deep Link Context (Debug):</div>
            <div>Redirect URL: {currentRedirect || "None"}</div>
            <div>Competition ID: {currentCompetition || "None"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
