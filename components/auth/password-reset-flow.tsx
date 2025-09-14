"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react"

import { createBrowserClient } from "@/lib/supabase/client"
import { useDeepLink } from "./deep-link-provider"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
})

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetRequestData = z.infer<typeof resetRequestSchema>
type ResetPasswordData = z.infer<typeof resetPasswordSchema>

interface PasswordResetFlowProps {
  className?: string
}

type FlowState = 'request' | 'sent' | 'reset' | 'success' | 'expired' | 'error'

export function PasswordResetFlow({ className }: PasswordResetFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { buildAuthUrl, getRedirectUrl, getCompetitionId } = useDeepLink()
  
  const [flowState, setFlowState] = useState<FlowState>('request')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const supabase = createBrowserClient()

  // Check for reset token in URL
  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      setError(errorDescription || error || 'Invalid reset link')
      setFlowState('error')
      return
    }

    if (type === 'recovery' && accessToken && refreshToken) {
      // Set the session with the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to set session:', error)
          setError('Invalid or expired reset link')
          setFlowState('expired')
        } else {
          setFlowState('reset')
        }
      })
    }
  }, [searchParams, supabase.auth])

  const requestForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  })

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const handleResetRequest = async (data: ResetRequestData) => {
    setIsLoading(true)
    setError('')

    try {
      const redirectUrl = `${window.location.origin}/auth/reset`
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        throw error
      }

      setEmail(data.email)
      setFlowState('sent')
    } catch (error: any) {
      console.error('Reset request failed:', error)
      setError(error.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (data: ResetPasswordData) => {
    setIsLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) {
        throw error
      }

      setFlowState('success')
    } catch (error: any) {
      console.error('Password reset failed:', error)
      setError(error.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    const loginUrl = buildAuthUrl('login')
    router.push(loginUrl)
  }

  const handleLoginAfterReset = () => {
    const loginUrl = buildAuthUrl('login')
    router.push(loginUrl)
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(resetForm.watch("password") || "")

  // Request reset email
  if (flowState === 'request') {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we&apos;ll send you a reset link
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(handleResetRequest)} className="space-y-4">
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        autoComplete="email"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send reset link
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Email sent confirmation
  if (flowState === 'sent') {
    return (
      <div className={className}>
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => handleResetRequest({ email })}
              disabled={isLoading}
              className="w-full"
            >
              Resend email
            </Button>
            <Button
              variant="ghost"
              onClick={handleBackToLogin}
              className="w-full"
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Password reset form
  if (flowState === 'reset') {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Create new password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handlePasswordReset)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            disabled={isLoading}
                            autoComplete="new-password"
                            className="pr-10"
                            autoFocus
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        
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
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          disabled={isLoading}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    )
  }

  // Success state
  if (flowState === 'success') {
    return (
      <div className={className}>
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Password updated!</h1>
            <p className="text-muted-foreground">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>

          <Button onClick={handleLoginAfterReset} className="w-full">
            Continue to sign in
          </Button>
        </div>
      </div>
    )
  }

  // Error/expired state
  return (
    <div className={className}>
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {flowState === 'expired' ? 'Link expired' : 'Invalid link'}
          </h1>
          <p className="text-muted-foreground">
            {flowState === 'expired' 
              ? 'This password reset link has expired. Please request a new one.'
              : error || 'This password reset link is invalid or has been used already.'
            }
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={() => setFlowState('request')}
            className="w-full"
          >
            Request new reset link
          </Button>
          <Button
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  )
}