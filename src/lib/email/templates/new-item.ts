import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      New Item Added! 🆕
    </mj-text>
    <mj-text>
      A new item has been added to an auction you're a member of:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
      in auction: <strong>{{AUCTION_NAME}}</strong>
    </mj-text>
    {{ITEM_IMAGE}}
    {{ITEM_DESCRIPTION}}
    <mj-text>
      Don't miss out - check it out and place your bid!
    </mj-text>
    <mj-button href="{{ITEM_URL}}">
      View Item
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      Don't want to receive these notifications? You can turn them off in your user settings after logging in.
    </mj-text>
`;

export const newItemTemplate = renderLayout({
  title: "New Item Added",
  previewText: "A new item has been added to an auction",
  content,
});

export function getNewItemTemplateData(data: {
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  auctionName: string;
  auctionId: string;
  itemId: string;
  appUrl: string;
}) {
  // Build image MJML if image exists (URL is system-generated, safe)
  const imageSection = data.itemImageUrl
    ? `<mj-image src="${data.itemImageUrl}" alt="${escapeHtml(
        data.itemName,
      )}" width="400px" border-radius="8px" padding="16px 0" />`
    : "";

  // Build description text if exists - HTML-encode user content
  const descriptionSection = data.itemDescription
    ? `<mj-text font-size="14px" color="${
        theme.colors.text.muted
      }" padding="8px 0">${escapeHtml(data.itemDescription)}</mj-text>`
    : "";

  return {
    template: newItemTemplate,
    replacements: {
      // HTML-encode user-provided content to prevent injection
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{ITEM_IMAGE}}": imageSection,
      "{{ITEM_DESCRIPTION}}": descriptionSection,
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(
        data.auctionId,
      )}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
