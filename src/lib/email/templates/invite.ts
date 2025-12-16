import { renderLayout, theme } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      You've Been Invited! 🎯
    </mj-text>
    <mj-text>
      <strong>{{SENDER_NAME}}</strong> has invited you to join the auction:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="16px 0">
      "{{AUCTION_NAME}}"
    </mj-text>
    <mj-text>
      You've been invited as a <strong>{{ROLE}}</strong>. Click the button below to accept the invitation and start bidding!
    </mj-text>
    <mj-button href="{{INVITE_URL}}">
      Accept Invitation
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}" padding-top="16px">
      This invitation will expire in 7 days. If you don't have an account yet, you'll be prompted to create one.
    </mj-text>
`;

export const inviteTemplate = renderLayout({
  title: "You've Been Invited!",
  previewText: "You've been invited to join an auction on Auktiva",
  content,
});

export function getInviteTemplateData(data: {
  senderName: string;
  auctionName: string;
  role: string;
  token: string;
  appUrl: string;
}) {
  const roleDisplay = data.role.charAt(0) + data.role.slice(1).toLowerCase();
  return {
    template: inviteTemplate,
    replacements: {
      "{{SENDER_NAME}}": data.senderName || "Someone",
      "{{AUCTION_NAME}}": data.auctionName,
      "{{ROLE}}": roleDisplay,
      "{{INVITE_URL}}": `${data.appUrl}/invite/${data.token}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
