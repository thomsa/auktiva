export const passwordResetTemplate = `
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
          Reset Your Password
        </mj-text>
        <mj-text>
          Hi {{NAME}},
        </mj-text>
        <mj-text>
          We received a request to reset your password for your Auktiva account. Click the button below to create a new password.
        </mj-text>
        <mj-button href="{{RESET_URL}}">
          Reset Password
        </mj-button>
        <mj-text font-size="12px" color="#9ca3af">
          This link will expire in 10 minutes for security reasons.
        </mj-text>
        <mj-divider border-color="#e5e7eb" padding="20px 0" />
        <mj-text font-size="12px" color="#6b7280">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </mj-text>
        <mj-text font-size="12px" color="#6b7280">
          If you're having trouble clicking the button, copy and paste this URL into your browser:
        </mj-text>
        <mj-text font-size="11px" color="#6366f1" word-break="break-all">
          {{RESET_URL}}
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

export function getPasswordResetTemplateData(data: {
  name: string;
  resetUrl: string;
}) {
  return {
    template: passwordResetTemplate,
    replacements: {
      "{{NAME}}": data.name || "there",
      "{{RESET_URL}}": data.resetUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
