import { useTranslations } from "next-intl";
import { ROLE_COLORS, ROLE_OPTIONS } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";
import { UserAvatar } from "@/components/ui/user-avatar";

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
  const t = useTranslations("member");
  const tRoles = useTranslations("auction.roles");
  const { formatShortDate } = useFormatters();
  const isCurrentUser = member.user.id === currentUserId;
  const canModify = isAdmin && !isCurrentUser && member.role !== "OWNER";

  const getRoleLabel = (role: string) => {
    const roleKey = role.toLowerCase();
    if (["admin", "creator", "bidder", "owner"].includes(roleKey)) {
      return tRoles(roleKey === "owner" ? "admin" : roleKey);
    }
    return role;
  };

  return (
    <tr className={isCurrentUser ? "bg-base-200" : ""}>
      <td>
        <div className="flex items-center gap-3">
          <UserAvatar
            name={member.user.name}
            email={member.user.email}
            size="md"
          />
          <div>
            <div className="font-bold">
              {member.user.name || t("noName")}
              {isCurrentUser && (
                <span className="badge badge-sm ml-2">{t("you")}</span>
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
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge ${ROLE_COLORS[member.role] || "badge-ghost"}`}
          >
            {getRoleLabel(member.role)}
          </span>
        )}
      </td>
      <td className="text-sm text-base-content/60">
        {formatShortDate(member.joinedAt)}
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
              title={t("remove")}
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
