"use client";

import { useLogout } from "@/lib/auth/auth-hooks";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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
  const { logout, isLoading } = useLogout();

  const handleLogout = () => {
    console.log("Logout button clicked");
    logout("/auth/login"); // Redirect to login page after logout
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {showIcon && <LogOut className="w-4 h-4 mr-2" />}
      {children || (isLoading ? "Logging out..." : "Logout")}
    </Button>
  );
}