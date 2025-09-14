"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

import { useSignupMutation } from "@/lib/auth/useAuth";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useDeepLink } from "./deep-link-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "First name can only contain letters, spaces, hyphens, and apostrophes"
      ),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Last name can only contain letters, spaces, hyphens, and apostrophes"
      ),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .max(100, "Email must be less than 100 characters"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface EnhancedSignupFormProps {
  className?: string;
  onSuccess?: () => void;
  showLoginLink?: boolean;
}

export function EnhancedSignupForm({
  className,
  onSuccess,
  showLoginLink = true,
}: EnhancedSignupFormProps) {
  const router = useRouter();
  const { isLoading: authLoading } = useAuthContext();
  const signupMutation = useSignupMutation();
  const { getRedirectUrl, getCompetitionId, buildAuthUrl, setAuthFlow } =
    useDeepLink();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await signupMutation.mutateAsync({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setLocalError(error?.message || "Signup failed");
      setIsSubmitting(false);
    }
  };

  const handleLoginClick = () => {
    setAuthFlow("login");
    const loginUrl = buildAuthUrl("login");
    router.push(loginUrl);
  };

  const currentCompetition = getCompetitionId();
  const currentRedirect = getRedirectUrl();

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.watch("password") || "");
  const error = localError || (signupMutation.error as any)?.message;
  const loading = authLoading || isSubmitting || signupMutation.isPending;

  if (isSuccess) {
    return (
      <div className={className}>
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Account created successfully!
            </h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a confirmation email to your inbox. Please check your
              email and click the confirmation link to activate your account.
            </p>
          </div>

          {currentCompetition && (
            <div className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md">
              After confirming your email, you&apos;ll be able to join the
              competition
            </div>
          )}

          <div className="space-y-2">
            <Button onClick={handleLoginClick} className="w-full">
              Go to Sign In
            </Button>
            <p className="text-sm text-muted-foreground">
              Already confirmed your email?{" "}
              <Button
                variant="link"
                className="px-0 text-sm"
                onClick={handleLoginClick}
              >
                Sign in now
              </Button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground">
            {currentCompetition
              ? "Sign up to join the competition"
              : "Get started with your free account"}
          </p>
          {currentCompetition && (
            <div className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md">
              Competition entry requires an account
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Signup Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your first name"
                        disabled={loading}
                        autoComplete="given-name"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your last name"
                        disabled={loading}
                        autoComplete="family-name"
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
            </div>

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
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          disabled={loading}
                          autoComplete="new-password"
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
                        </Button>
                      </div>

                      {/* Password strength indicator */}
                      {field.value && (
                        <div className="space-y-1">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-sm ${
                                  passwordStrength >= level
                                    ? passwordStrength <= 2
                                      ? "bg-red-500"
                                      : passwordStrength <= 3
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {passwordStrength <= 2 && "Weak password"}
                            {passwordStrength === 3 && "Good password"}
                            {passwordStrength >= 4 && "Strong password"}
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        disabled={loading}
                        autoComplete="new-password"
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
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </Form>

        {/* Terms and Privacy */}
        <div className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Button variant="link" className="px-0 text-xs h-auto">
            Terms of Service
          </Button>{" "}
          and{" "}
          <Button variant="link" className="px-0 text-xs h-auto">
            Privacy Policy
          </Button>
        </div>

        {/* Login link */}
        {showLoginLink && (
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Button
              type="button"
              variant="link"
              className="px-0 text-sm font-medium"
              onClick={handleLoginClick}
              disabled={loading}
            >
              Sign in
            </Button>
          </div>
        )}

        {/* Debug info when enabled */}
        {process.env.NEXT_PUBLIC_SHOW_AUTH_DEBUG && (
          <div className="mt-8 p-4 bg-muted rounded-md text-xs">
            <div className="font-medium mb-2">Deep Link Context (Debug):</div>
            <div>Redirect URL: {currentRedirect || "None"}</div>
            <div>Competition ID: {currentCompetition || "None"}</div>
            <div>Password Strength: {passwordStrength}/5</div>
          </div>
        )}
      </div>
    </div>
  );
}
