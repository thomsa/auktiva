import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Congratulations! 🎉
    </mj-text>
    <mj-text>
      You've won an item in the auction:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
      in auction: <strong>{{AUCTION_NAME}}</strong>
    </mj-text>
    <mj-text font-size="16px" padding="16px 0">
      Winning bid: <strong style="color: #16a34a;">{{CURRENCY_SYMBOL}}{{WINNING_AMOUNT}}</strong>
    </mj-text>
    <mj-text>
      The auction for this item has ended and you are the winner! Contact the auction organizer for next steps.
    </mj-text>
    <mj-button href="{{ITEM_URL}}">
      View Item Details
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      Don't want to receive these notifications? You can turn them off in your user settings after logging in.
    </mj-text>
`;

export const itemWonTemplate = renderLayout({
  title: "You Won!",
  previewText: "Congratulations! You've won an item",
  content,
});

export function getItemWonTemplateData(data: {
  itemName: string;
  auctionName: string;
  auctionId: string;
  itemId: string;
  winningAmount: number;
  currencySymbol: string;
  appUrl: string;
}) {
  return {
    template: itemWonTemplate,
    replacements: {
      // HTML-encode user-provided content to prevent injection
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{CURRENCY_SYMBOL}}": escapeHtml(data.currencySymbol),
      "{{WINNING_AMOUNT}}": data.winningAmount.toFixed(2),
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(data.auctionId)}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
