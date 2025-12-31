import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Account Already Exists
    </mj-text>
    <mj-text>
      Hi {{NAME}},
    </mj-text>
    <mj-text>
      Someone (hopefully you!) tried to create a new account on Auktiva using this email address. 
      However, you already have an account with us.
    </mj-text>
    <mj-text>
      If this was you, you can simply log in to your existing account:
    </mj-text>
    <mj-button href="{{LOGIN_URL}}">
      Log In to Your Account
    </mj-button>
    <mj-text>
      Forgot your password? No problem - you can reset it here:
    </mj-text>
    <mj-button href="{{RESET_URL}}" background-color="${theme.colors.text.light}">
      Reset Password
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}" padding-top="16px">
      If you didn't try to create an account, you can safely ignore this email. Your account is secure.
    </mj-text>
`;

export const accountExistsTemplate = renderLayout({
  title: "Account Already Exists",
  previewText: "You already have an Auktiva account",
  content,
});

export function getAccountExistsTemplateData(data: {
  name: string;
  appUrl: string;
}) {
  return {
    template: accountExistsTemplate,
    replacements: {
      // HTML-encode user-provided content to prevent injection
      "{{NAME}}": escapeHtml(data.name || "there"),
      "{{LOGIN_URL}}": `${data.appUrl}/login`,
      "{{RESET_URL}}": `${data.appUrl}/forgot-password`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
