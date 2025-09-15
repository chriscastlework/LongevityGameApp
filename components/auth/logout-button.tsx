"use client";

import { useLogoutMutation } from "@/lib/auth/useApiAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function LogoutButton({
  variant = "outline",
  size = "sm",
  showIcon = true,
  children,
  className
}: LogoutButtonProps) {
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logoutMutation.mutateAsync();

      // Redirect to home page after successful logout
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails on server, we cleared local state
      // So still redirect to home
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className}
    >
      {showIcon && <LogOut className="w-4 h-4 mr-2" />}
      {children || (isLoggingOut ? "Logging out..." : "Logout")}
    </Button>
  );
}