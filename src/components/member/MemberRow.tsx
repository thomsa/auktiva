import { ROLE_COLORS, ROLE_OPTIONS } from "@/utils/auction-helpers";

interface MemberRowProps {
  member: {
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    invitedBy: {
      name: string | null;
      email: string;
    } | null;
  };
  currentUserId: string;
  isAdmin: boolean;
  isLoading: boolean;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string, memberName: string) => void;
}

export function MemberRow({
  member,
  currentUserId,
  isAdmin,
  isLoading,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const isCurrentUser = member.user.id === currentUserId;
  const canModify = isAdmin && !isCurrentUser && member.role !== "OWNER";

  return (
    <tr className={isCurrentUser ? "bg-base-200" : ""}>
      <td>
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-10 h-10 rounded-full">
              <span>
                {member.user.name?.charAt(0) || member.user.email.charAt(0)}
              </span>
            </div>
          </div>
          <div>
            <div className="font-bold">
              {member.user.name || "No name"}
              {isCurrentUser && (
                <span className="badge badge-sm ml-2">You</span>
              )}
            </div>
            <div className="text-sm text-base-content/60">
              {member.user.email}
            </div>
          </div>
        </div>
      </td>
      <td>
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isLoading}
            className="select select-bordered select-sm"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge ${ROLE_COLORS[member.role] || "badge-ghost"}`}
          >
            {member.role}
          </span>
        )}
      </td>
      <td className="text-sm text-base-content/60">
        {new Date(member.joinedAt).toLocaleDateString()}
      </td>
      <td className="text-sm text-base-content/60">
        {member.invitedBy
          ? member.invitedBy.name || member.invitedBy.email
          : "—"}
      </td>
      {isAdmin && (
        <td className="text-right">
          {canModify && (
            <button
              onClick={() =>
                onRemove(member.id, member.user.name || member.user.email)
              }
              disabled={isLoading}
              className="btn btn-ghost btn-sm text-error"
              title="Remove member"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <span className="icon-[tabler--trash] size-4"></span>
              )}
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
