import { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface PageLayoutProps {
  user: User;
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "",
};

export function PageLayout({
  user,
  children,
  className = "",
  maxWidth = "full",
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />
      <main
        className={`container mx-auto px-4 py-8 pb-12 ${maxWidthClasses[maxWidth]} ${className}`}
      >
        {children}
      </main>
    </div>
  );
}
