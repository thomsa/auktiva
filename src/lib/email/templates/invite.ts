export const inviteTemplate = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" />
      <mj-text font-size="14px" color="#374151" line-height="1.6" />
      <mj-button background-color="#6366f1" color="#ffffff" font-size="16px" font-weight="600" border-radius="8px" padding="12px 24px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="28px" font-weight="700" color="#6366f1">
          Auktiva
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section background-color="#ffffff" border-radius="12px" padding="32px">
      <mj-column>
        <mj-text font-size="22px" font-weight="600" color="#111827">
          You've Been Invited! 🎯
        </mj-text>
        <mj-text>
          <strong>{{SENDER_NAME}}</strong> has invited you to join the auction:
        </mj-text>
        <mj-text font-size="18px" font-weight="600" color="#6366f1" padding="16px 0">
          "{{AUCTION_NAME}}"
        </mj-text>
        <mj-text>
          You've been invited as a <strong>{{ROLE}}</strong>. Click the button below to accept the invitation and start bidding!
        </mj-text>
        <mj-button href="{{INVITE_URL}}">
          Accept Invitation
        </mj-button>
        <mj-text font-size="12px" color="#9ca3af" padding-top="16px">
          This invitation will expire in 7 days. If you don't have an account yet, you'll be prompted to create one.
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#9ca3af">
          © {{YEAR}} Auktiva.org - Your Private Auction Platform
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

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
