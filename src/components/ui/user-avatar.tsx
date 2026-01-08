/**
 * UserAvatar - Consistent avatar display with monogram and gradient colors
 *
 * Matches the style used in the navbar profile dropdown
 */

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

/**
 * Get initials from name or email
 */
function getInitials(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return trimmedName.substring(0, 2).toUpperCase();
  }
  return email?.charAt(0).toUpperCase() || "?";
}

export function UserAvatar({
  name,
  email,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const initials = getInitials(name, email);

  return (
    <div
      className={`rounded-full bg-linear-to-br from-primary to-secondary p-[2px] shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <div className="w-full h-full rounded-full bg-base-100 flex items-center justify-center">
        <span className="font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
          {initials}
        </span>
      </div>
    </div>
  );
}

/**
 * Anonymous avatar for anonymous bidders
 */
export function AnonymousAvatar({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={`rounded-full bg-base-content/10 flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <span className="icon-[tabler--user-question] text-base-content/40" />
    </div>
  );
}
