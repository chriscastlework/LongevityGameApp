"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSignupMutation } from "@/lib/auth/useApiAuth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import type { SignupData } from "@/lib/api/auth";

const participantSignupSchema = z.object({
  // Personal Information
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((date) => {
      const dob = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const finalAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
          ? age - 1
          : age;
      return finalAge >= 10 && finalAge <= 95;
    }, "Age must be between 10 and 95 years"),
  gender: z.enum(["male", "female"], {
    required_error: "Please select your gender",
  }),
  jobTitle: z
    .string()
    .max(100, "Job title must be less than 100 characters")
    .optional(),
  organization: z
    .string()
    .max(100, "Organization must be less than 100 characters")
    .optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(100, "Email must be less than 100 characters")
    .optional(),
  phone: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .optional(),

  // Password fields (required only if email is provided)
  password: z
    .string()
    .optional(),
  confirmPassword: z
    .string()
    .optional(),

  // Consent Forms
  consentWellness: z.boolean().refine((value) => value === true, {
    message: "You must agree to the wellness screening consent",
  }),
  consentLiability: z.boolean().refine((value) => value === true, {
    message: "You must agree to the liability waiver",
  }),
  consentData: z.boolean().refine((value) => value === true, {
    message: "You must agree to the data collection and use consent",
  }),
})
.refine((data) => {
  // If email is provided, password is required
  if (data.email && data.email.trim()) {
    return data.password && data.password.length >= 8;
  }
  return true;
}, {
  message: "Password must be at least 8 characters when email is provided",
  path: ["password"],
})
.refine((data) => {
  // If email is provided, passwords must match
  if (data.email && data.email.trim()) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ParticipantSignupFormData = z.infer<typeof participantSignupSchema>;

interface ParticipantSignupFormProps {
  onSuccess?: (result: any) => void;
  className?: string;
}

export function ParticipantSignupForm({
  onSuccess,
  className,
}: ParticipantSignupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const signupMutation = useSignupMutation();

  const form = useForm<ParticipantSignupFormData>({
    resolver: zodResolver(participantSignupSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: undefined,
      jobTitle: "",
      organization: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      consentWellness: false,
      consentLiability: false,
      consentData: false,
    },
  });

  const onSubmit = async (data: ParticipantSignupFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Transform form data to API SignupData format
      const signupData: SignupData = {
        fullName: data.fullName.trim(),
        email: data.email?.trim() || "",
        password: data.password || "",
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        jobTitle: data.jobTitle?.trim() || "Not specified",
        organization: data.organization?.trim() || "Not specified",
        phone: data.phone?.trim(),
        consentWellness: data.consentWellness,
        consentLiability: data.consentLiability,
        consentData: data.consentData,
      };

      // Validate email and password are provided
      if (!signupData.email || !signupData.password) {
        throw new Error("Email and password are required");
      }

      // Submit to API
      const result = await signupMutation.mutateAsync(signupData);

      setIsSuccess(true);

      if (onSuccess) {
        onSuccess(result);
      } else {
        // Default behavior: redirect to participation page
        router.push("/participate");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register participant");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`space-y-6 text-center ${className}`}>
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Registration Successful!
          </h1>
          <p className="text-muted-foreground">
            Your participant profile has been created. Please check your email
            and verify your account to access your QR code and participate in
            the fitness testing stations.
          </p>
        </div>

        <Button onClick={() => router.push("/participate")} className="w-full">
          Continue to Participation
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Participant Registration
          </h1>
          <p className="text-muted-foreground">
            Please complete your profile to participate in the Longevity Fitness
            Games
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Registration Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your full name"
                        disabled={isSubmitting}
                        autoComplete="name"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          disabled={isSubmitting}
                          max={
                            new Date(
                              new Date().setFullYear(
                                new Date().getFullYear() - 10
                              )
                            )
                              .toISOString()
                              .split("T")[0]
                          }
                          min={
                            new Date(
                              new Date().setFullYear(
                                new Date().getFullYear() - 95
                              )
                            )
                              .toISOString()
                              .split("T")[0]
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                          disabled={isSubmitting}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" />
                            <Label htmlFor="male">Male</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" />
                            <Label htmlFor="female">Female</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your job title (optional)"
                        disabled={isSubmitting}
                        autoComplete="organization-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your organization (optional)"
                        disabled={isSubmitting}
                        autoComplete="organization"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                          placeholder="your@email.com"
                          disabled={isSubmitting}
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 123-4567 (optional)"
                          disabled={isSubmitting}
                          autoComplete="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Password Fields - Show only if email is provided */}
              {form.watch("email") && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    💡 Since you provided an email, you can create an account to track your results online
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                                placeholder="Create a password"
                                disabled={isSubmitting}
                                autoComplete="new-password"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isSubmitting}
                              >
                                {showPassword ? (
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
                                disabled={isSubmitting}
                                autoComplete="new-password"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isSubmitting}
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
                  </div>
                </div>
              )}
            </div>

            {/* Consent Forms Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Consent & Waivers</h3>

              <FormField
                control={form.control}
                name="consentWellness"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Wellness Screening Consent *
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        I consent to participate in fitness assessments and
                        wellness screenings as part of the Longevity Fitness
                        Games.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consentLiability"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Liability Waiver *
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        I understand the risks involved in physical fitness
                        testing and waive liability for the organizers.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consentData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Data Collection & Use Consent *
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        I consent to the collection, storage, and use of my
                        fitness data for research and leaderboard purposes.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering Participant...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
