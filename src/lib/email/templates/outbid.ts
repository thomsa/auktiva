export const outbidTemplate = `
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
          You've Been Outbid! ⚡
        </mj-text>
        <mj-text>
          Someone placed a higher bid on an item you were winning:
        </mj-text>
        <mj-text font-size="18px" font-weight="600" color="#6366f1" padding="8px 0">
          "{{ITEM_NAME}}"
        </mj-text>
        <mj-text font-size="14px" color="#6b7280">
          in auction: <strong>{{AUCTION_NAME}}</strong>
        </mj-text>
        <mj-text font-size="16px" padding="16px 0">
          New highest bid: <strong style="color: #dc2626;">{{CURRENCY_SYMBOL}}{{NEW_AMOUNT}}</strong>
        </mj-text>
        <mj-text>
          Don't let it slip away - place a higher bid now!
        </mj-text>
        <mj-button href="{{ITEM_URL}}">
          Place New Bid
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

export function getOutbidTemplateData(data: {
  itemName: string;
  auctionName: string;
  auctionId: string;
  itemId: string;
  newAmount: number;
  currencySymbol: string;
  appUrl: string;
}) {
  return {
    template: outbidTemplate,
    replacements: {
      "{{ITEM_NAME}}": data.itemName,
      "{{AUCTION_NAME}}": data.auctionName,
      "{{CURRENCY_SYMBOL}}": data.currencySymbol,
      "{{NEW_AMOUNT}}": data.newAmount.toFixed(2),
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${data.auctionId}/items/${data.itemId}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
