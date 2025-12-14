import { ROLE_COLORS, ROLE_OPTIONS } from "@/utils/auction-helpers";

interface MemberCardProps {
  member: {
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  currentUserId: string;
  isAdmin: boolean;
  isLoading: boolean;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string, memberName: string) => void;
}

export function MemberCard({
  member,
  currentUserId,
  isAdmin,
  isLoading,
  onRoleChange,
  onRemove,
}: MemberCardProps) {
  const isCurrentUser = member.user.id === currentUserId;
  const canModify = isAdmin && !isCurrentUser && member.role !== "OWNER";

  return (
    <div
      className={`p-3 rounded-lg ${
        isCurrentUser ? "bg-base-200" : "bg-base-100 border border-base-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-10 h-10 rounded-full">
              <span>
                {member.user.name?.charAt(0) || member.user.email.charAt(0)}
              </span>
            </div>
          </div>
          <div>
            <div className="font-bold text-sm">
              {member.user.name || "No name"}
              {isCurrentUser && (
                <span className="badge badge-xs ml-2">You</span>
              )}
            </div>
            <div className="text-xs text-base-content/60 break-all">
              {member.user.email}
            </div>
          </div>
        </div>
        {canModify && isAdmin && (
          <button
            onClick={() =>
              onRemove(member.id, member.user.name || member.user.email)
            }
            disabled={isLoading}
            className="btn btn-ghost btn-xs text-error"
            title="Remove member"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <span className="icon-[tabler--trash] size-4"></span>
            )}
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isLoading}
            className="select select-bordered select-xs"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge badge-sm ${ROLE_COLORS[member.role] || "badge-ghost"}`}
          >
            {member.role}
          </span>
        )}
        <span className="text-xs text-base-content/60">
          Joined {new Date(member.joinedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
