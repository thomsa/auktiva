import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Bidding has reopened
    </mj-text>
    <mj-text>
      The organizer reopened bidding in the auction <strong>{{AUCTION_NAME}}</strong>. Your earlier win is no longer final:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      {{ITEM_NAMES}}
    </mj-text>
    <mj-text font-size="16px" padding="16px 0">
      {{CLOSE_TEXT}}
    </mj-text>
    <mj-text>
      Other bidders can outbid you until bidding closes. If you are still the highest bidder at the end, we will tell you that you won.
    </mj-text>
    <mj-button href="{{ACTION_URL}}">
      {{ACTION_LABEL}}
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      You receive this because you turned on e-mails for items you win. You can turn them off in your user settings after logging in.
    </mj-text>
`;

export const biddingReopenedTemplate = renderLayout({
  title: "Bidding Reopened",
  previewText: "Bidding reopened on an item you won",
  content,
});

export function getBiddingReopenedTemplateData(data: {
  auctionName: string;
  auctionId: string;
  items: { id: string; name: string }[];
  /** Already formatted close time (UTC), or null for no end time. */
  closeTime: string | null;
  appUrl: string;
}) {
  const auctionUrl = `${data.appUrl}/auctions/${encodeURIComponent(data.auctionId)}`;
  const single = data.items.length === 1 ? data.items[0] : null;

  return {
    template: biddingReopenedTemplate,
    replacements: {
      // HTML-encode user-provided content to prevent injection
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{ITEM_NAMES}}": data.items
        .map((item) => `"${escapeHtml(item.name)}"`)
        .join("<br />"),
      "{{CLOSE_TEXT}}": data.closeTime
        ? `Bidding now closes on <strong>${escapeHtml(data.closeTime)}</strong>.`
        : "Bidding is open with <strong>no end time</strong> for now.",
      "{{ACTION_URL}}": single
        ? `${auctionUrl}/items/${encodeURIComponent(single.id)}`
        : auctionUrl,
      "{{ACTION_LABEL}}": single ? "View Item" : "View Auction",
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
