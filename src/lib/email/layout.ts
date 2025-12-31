/**
 * HTML-encode a string to prevent XSS in email templates
 * This should be used for all user-provided content in email templates
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// DaisyUI 5 light theme colors (converted from oklch)
export const theme = {
  colors: {
    primary: "#422ad5", // DaisyUI primary: oklch(45% 0.24 277.023)
    primaryContent: "#e0e7ff", // DaisyUI primary-content
    background: "#fafafa", // DaisyUI base-200
    surface: "#ffffff", // DaisyUI base-100
    text: {
      main: "#1f2937", // DaisyUI base-content
      muted: "#6b7280", // Gray 500
      light: "#9ca3af", // Gray 400
    },
    border: "#e5e5e5", // DaisyUI base-300
    error: "#f87272", // DaisyUI error
  },
  // Border-radius values in px (MJML only supports px/%)
  borderRadius: {
    sm: "4px", // rounded-sm
    md: "6px", // rounded-md (buttons)
    lg: "8px", // rounded-lg (cards, inputs)
    xl: "12px", // rounded-xl (larger cards)
  },
  // System font stack similar to Tailwind/DaisyUI default
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

interface LayoutProps {
  content: string;
  previewText?: string;
  title?: string;
  year?: string;
}

export function renderLayout({
  content,
  previewText,
  title = "Auktiva",
  year = "{{YEAR}}",
}: LayoutProps) {
  return `
    <mjml>
      <mj-head>
        <mj-title>${title}</mj-title>
        <mj-preview>${previewText || title}</mj-preview>
        <mj-attributes>
          <mj-all font-family="${theme.fontFamily}" />
          <mj-text font-size="16px" color="${
            theme.colors.text.main
          }" line-height="1.6" />
          <mj-button 
            background-color="${theme.colors.primary}" 
            color="#ffffff" 
            font-size="16px" 
            font-weight="600" 
            border-radius="${theme.borderRadius.md}" 
            padding="12px 24px" 
            inner-padding="12px 24px"
          />
          <mj-section padding="0px" />
          <mj-class name="heading" font-size="24px" font-weight="700" color="${
            theme.colors.text.main
          }" />
          <mj-class name="subheading" font-size="18px" font-weight="600" color="${
            theme.colors.text.main
          }" />
          <mj-class name="muted" color="${
            theme.colors.text.muted
          }" font-size="14px" />
        </mj-attributes>
        <mj-style>
          .header-link { text-decoration: none; color: ${
            theme.colors.primary
          }; font-weight: 700; font-size: 24px; }
          .footer-link { color: ${
            theme.colors.text.muted
          }; text-decoration: underline; }
        </mj-style>
      </mj-head>
      <mj-body background-color="${theme.colors.background}" width="600px">
        
        <!-- Header -->
        <mj-section padding="40px 0 24px">
          <mj-column>
            <mj-text align="center">
              <a href="{{APP_URL}}" style="text-decoration: none; font-size: 24px; font-weight: 800; color: ${
                theme.colors.primary
              }; letter-spacing: -0.5px;">
                Auktiva
              </a>
            </mj-text>
          </mj-column>
        </mj-section>
        
        <!-- Main Content Card -->
        <mj-section padding="0 16px">
          <mj-column background-color="${
            theme.colors.surface
          }" border-radius="${
            theme.borderRadius.xl
          }" padding="32px" border="1px solid ${theme.colors.border}">
            ${content}
          </mj-column>
        </mj-section>

        <!-- Footer -->
        <mj-section padding="32px 0 48px">
          <mj-column>
            <mj-text align="center" color="${
              theme.colors.text.light
            }" font-size="12px">
              © ${year} Auktiva.org<br/>
              Your Private Auction Platform
            </mj-text>
            <mj-text align="center" color="${
              theme.colors.text.light
            }" font-size="12px" padding-top="8px">
              <a href="#" class="footer-link" style="color: ${
                theme.colors.text.light
              }; text-decoration: none;">Privacy Policy</a>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <a href="#" class="footer-link" style="color: ${
                theme.colors.text.light
              }; text-decoration: none;">Terms of Service</a>
            </mj-text>
          </mj-column>
        </mj-section>

      </mj-body>
    </mjml>
  `;
}
