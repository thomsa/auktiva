export const newItemTemplate = `
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
          New Item Added! 🆕
        </mj-text>
        <mj-text>
          A new item has been added to an auction you're a member of:
        </mj-text>
        <mj-text font-size="18px" font-weight="600" color="#6366f1" padding="8px 0">
          "{{ITEM_NAME}}"
        </mj-text>
        <mj-text font-size="14px" color="#6b7280">
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
      </mj-column>
    </mj-section>
    
    <mj-section padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#9ca3af">
          © {{YEAR}} Auktiva.org - Your Private Auction Platform
        </mj-text>
        <mj-text align="center" font-size="11px" color="#9ca3af" font-style="italic">
          Don't want to receive these notifications? You can turn them off in your user settings after logging in.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

export function getNewItemTemplateData(data: {
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  auctionName: string;
  auctionId: string;
  itemId: string;
  appUrl: string;
}) {
  // Build image MJML if image exists
  const imageSection = data.itemImageUrl
    ? `<mj-image src="${data.itemImageUrl}" alt="${data.itemName}" width="400px" border-radius="8px" padding="16px 0" />`
    : "";

  // Build description text if exists
  const descriptionSection = data.itemDescription
    ? `<mj-text font-size="14px" color="#4b5563" padding="8px 0">${data.itemDescription}</mj-text>`
    : "";

  return {
    template: newItemTemplate,
    replacements: {
      "{{ITEM_NAME}}": data.itemName,
      "{{AUCTION_NAME}}": data.auctionName,
      "{{ITEM_IMAGE}}": imageSection,
      "{{ITEM_DESCRIPTION}}": descriptionSection,
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${data.auctionId}/items/${data.itemId}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
