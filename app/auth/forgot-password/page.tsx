"use client"

import type React from "react"

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Mail, ArrowLeft } from "lucide-react"

function ForgotPasswordContent() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for error message from reset-password redirect
    const errorFromUrl = searchParams.get('error')
    if (errorFromUrl) {
      setError(errorFromUrl)
    }
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error
      setIsSuccess(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

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
            <div className="flex items-center gap-2 mb-2">
              <Link href="/auth/login" className="text-muted-foreground hover:text-card-foreground">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="text-sm text-muted-foreground">Back to login</span>
            </div>
            <CardTitle className="text-2xl font-bold text-card-foreground">
              {isSuccess ? "Check your email" : "Reset your password"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSuccess
                ? "We've sent a password reset link to your email address."
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If you don&apos;t see the email in your inbox, please check your spam folder.
                </p>
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-card-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-input border-border text-card-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </div>

                {error && <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">{error}</div>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  )
}
