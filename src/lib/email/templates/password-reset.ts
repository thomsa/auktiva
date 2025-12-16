import { renderLayout, theme } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
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
    <mj-text font-size="12px" color="${theme.colors.text.light}">
      This link will expire in 10 minutes for security reasons.
    </mj-text>
    <mj-divider border-color="${theme.colors.border}" padding="20px 0" />
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </mj-text>
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      If you're having trouble clicking the button, copy and paste this URL into your browser:
    </mj-text>
    <mj-text font-size="11px" color="${theme.colors.primary}" word-break="break-all">
      {{RESET_URL}}
    </mj-text>
`;

export const passwordResetTemplate = renderLayout({
  title: "Reset Your Password",
  previewText: "Reset your Auktiva password",
  content,
});

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
