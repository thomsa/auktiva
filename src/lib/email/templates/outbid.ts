import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      You've Been Outbid! ⚡
    </mj-text>
    <mj-text>
      Someone placed a higher bid on an item you were winning:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
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
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      Don't want to receive these notifications? You can turn them off in your user settings after logging in.
    </mj-text>
`;

export const outbidTemplate = renderLayout({
  title: "You've Been Outbid",
  previewText: "You've been outbid on an item",
  content,
});

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
      // HTML-encode user-provided content to prevent injection
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{CURRENCY_SYMBOL}}": escapeHtml(data.currencySymbol),
      "{{NEW_AMOUNT}}": data.newAmount.toFixed(2),
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(
        data.auctionId,
      )}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
