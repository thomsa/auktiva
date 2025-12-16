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
    <div className="min-h-screen bg-base-100 flex flex-col relative overflow-x-hidden selection:bg-primary/20">
      {/* Background decorations */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[128px] -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <Navbar user={user} />

      <main
        className={`relative z-10 container mx-auto px-4 py-8 pb-12 flex-1 ${maxWidthClasses[maxWidth]} ${className}`}
      >
        {children}
      </main>
    </div>
  );
}
