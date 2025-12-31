import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Verify Your Email
    </mj-text>
    <mj-text>
      Hi {{NAME}},
    </mj-text>
    <mj-text>
      Thank you for creating an Auktiva account! Please verify your email address by clicking the button below.
    </mj-text>
    <mj-button href="{{VERIFICATION_URL}}">
      Verify Email
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}">
      This link will expire in 24 hours.
    </mj-text>
    <mj-divider border-color="${theme.colors.border}" padding="20px 0" />
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      If you didn't create an account on Auktiva, you can safely ignore this email.
    </mj-text>
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      If you're having trouble clicking the button, copy and paste this URL into your browser:
    </mj-text>
    <mj-text font-size="11px" color="${theme.colors.primary}" word-break="break-all">
      {{VERIFICATION_URL}}
    </mj-text>
`;

export const emailVerificationTemplate = renderLayout({
  title: "Verify Your Email",
  previewText: "Verify your Auktiva email address",
  content,
});

export function getEmailVerificationTemplateData(data: {
  name: string;
  verificationUrl: string;
}) {
  return {
    template: emailVerificationTemplate,
    replacements: {
      "{{NAME}}": escapeHtml(data.name || "there"),
      "{{VERIFICATION_URL}}": data.verificationUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
