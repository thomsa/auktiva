import "dotenv/config";
import {
  JoinMode,
  BidderVisibility,
  ItemEndMode,
  MemberRole,
} from "../src/generated/prisma/client.js";
import { createPrismaClient } from "../src/lib/prisma";
import { faker } from "@faker-js/faker";
import { hash } from "bcryptjs";
import { seedCurrencies } from "./seed-currencies";

const prisma = createPrismaClient();

// ============================================
// CONFIGURATION
// ============================================

const MAIN_USER_EMAIL = "testuser@auktiva.org";
const MAIN_USER_NAME = "Test User";
const DEFAULT_PASSWORD = "password";
const NUM_RANDOM_USERS = 50;
const ITEMS_PER_AUCTION = 20;

// ============================================
// AUCTION SCENARIOS
// ============================================

interface AuctionScenario {
  name: string;
  description: string;
  joinMode: JoinMode;
  memberCanInvite: boolean;
  bidderVisibility: BidderVisibility;
  itemEndMode: ItemEndMode;
  endDateType: "past" | "future" | "none";
}

const auctionScenarios: AuctionScenario[] = [
  // INVITE_ONLY auctions
  {
    name: "Private Invite-Only | Visible Bidders | Ends with Auction (Future)",
    description:
      "Invite-only auction where bidder names are visible. Items end when auction ends. End date in future.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "future",
  },
  {
    name: "Private Invite-Only | Visible Bidders | Ends with Auction (ENDED)",
    description:
      "Invite-only auction that has already ended. All items should be ended.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "past",
  },
  {
    name: "Private Invite-Only | Anonymous Bidders | Custom Item Dates",
    description:
      "Invite-only auction with anonymous bidding. Each item has its own end date.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.ANONYMOUS,
    itemEndMode: ItemEndMode.CUSTOM,
    endDateType: "future",
  },
  {
    name: "Private Invite-Only | Per-Bid Choice | No End Date",
    description:
      "Invite-only auction where bidders choose anonymity per bid. No end date set.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.PER_BID,
    itemEndMode: ItemEndMode.NONE,
    endDateType: "none",
  },
  {
    name: "Private + Members Can Invite | Visible | Custom Dates",
    description:
      "Invite-only but members can invite others. Visible bidders, custom item dates.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.CUSTOM,
    endDateType: "future",
  },

  // FREE (Open) auctions
  {
    name: "Open Auction | Visible Bidders | Ends with Auction (Future)",
    description:
      "Anyone can join. Bidder names visible. Items end with auction.",
    joinMode: JoinMode.FREE,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "future",
  },
  {
    name: "Open Auction | Anonymous | Custom Item Dates (ENDED)",
    description:
      "Open auction that has ended. Anonymous bidding with custom item dates.",
    joinMode: JoinMode.FREE,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.ANONYMOUS,
    itemEndMode: ItemEndMode.CUSTOM,
    endDateType: "past",
  },
  {
    name: "Open Auction | Per-Bid Choice | No End Date",
    description:
      "Open auction with no end date. Bidders choose anonymity per bid.",
    joinMode: JoinMode.FREE,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.PER_BID,
    itemEndMode: ItemEndMode.NONE,
    endDateType: "none",
  },

  // LINK-based auctions
  {
    name: "Link Join | Visible Bidders | Ends with Auction",
    description: "Join via link. Visible bidders. Items end with auction.",
    joinMode: JoinMode.LINK,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "future",
  },
  {
    name: "Link Join | Anonymous | Custom Dates (Mixed End States)",
    description:
      "Join via link. Anonymous bidding. Some items ended, some active, some future.",
    joinMode: JoinMode.LINK,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.ANONYMOUS,
    itemEndMode: ItemEndMode.CUSTOM,
    endDateType: "future",
  },
  {
    name: "Link Join | Per-Bid | No End Date",
    description: "Join via link. Per-bid anonymity choice. No end date.",
    joinMode: JoinMode.LINK,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.PER_BID,
    itemEndMode: ItemEndMode.NONE,
    endDateType: "none",
  },

  // Edge cases
  {
    name: "Invite-Only | Anonymous | Auction End (ENDED - No Bids)",
    description:
      "Ended auction with anonymous bidding. Testing items with no bids.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.ANONYMOUS,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "past",
  },
  {
    name: "Open | Visible | Custom Dates (All Items Ended)",
    description: "Open auction with custom dates. All items have ended.",
    joinMode: JoinMode.FREE,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.CUSTOM,
    endDateType: "future",
  },
  {
    name: "Link | Per-Bid | Auction End (Far Future)",
    description:
      "Link-join auction ending far in the future. Per-bid anonymity.",
    joinMode: JoinMode.LINK,
    memberCanInvite: true,
    bidderVisibility: BidderVisibility.PER_BID,
    itemEndMode: ItemEndMode.AUCTION_END,
    endDateType: "future",
  },
  {
    name: "Private | Visible | No End (Perpetual Auction)",
    description:
      "Perpetual invite-only auction with no end date. Items also have no end.",
    joinMode: JoinMode.INVITE_ONLY,
    memberCanInvite: false,
    bidderVisibility: BidderVisibility.VISIBLE,
    itemEndMode: ItemEndMode.NONE,
    endDateType: "none",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getEndDate(type: "past" | "future" | "none"): Date | null {
  const now = new Date();
  switch (type) {
    case "past":
      return new Date(
        now.getTime() -
          faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000
      );
    case "future":
      return new Date(
        now.getTime() +
          faker.number.int({ min: 7, max: 60 }) * 24 * 60 * 60 * 1000
      );
    case "none":
      return null;
  }
}

function getItemEndDate(
  auctionEndDate: Date | null,
  itemEndMode: ItemEndMode,
  index: number
): Date | null {
  const now = new Date();

  if (itemEndMode === ItemEndMode.NONE) {
    return null;
  }

  if (itemEndMode === ItemEndMode.AUCTION_END) {
    return auctionEndDate;
  }

  // CUSTOM mode - create variety
  if (index % 4 === 0) {
    // Some items ended in the past
    return new Date(
      now.getTime() -
        faker.number.int({ min: 1, max: 14 }) * 24 * 60 * 60 * 1000
    );
  } else if (index % 4 === 1) {
    // Some items ending soon
    return new Date(
      now.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000
    );
  } else if (index % 4 === 2) {
    // Some items ending later
    return new Date(
      now.getTime() +
        faker.number.int({ min: 7, max: 30 }) * 24 * 60 * 60 * 1000
    );
  } else {
    // Some items with no end date (if auction allows)
    return auctionEndDate
      ? new Date(
          now.getTime() +
            faker.number.int({ min: 14, max: 45 }) * 24 * 60 * 60 * 1000
        )
      : null;
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = faker.number.int({ min, max: Math.min(max, arr.length) });
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// SUMMARY TRACKING
// ============================================

interface UserSummary {
  id: string;
  email: string;
  name: string;
}

interface AuctionSummary {
  id: string;
  name: string;
  settings: string;
  memberCount: number;
  itemCount: number;
}

interface ItemSummary {
  auctionName: string;
  itemName: string;
  creatorEmail: string;
  creatorName: string;
  bidCount: number;
  currentBid: number | null;
  endDate: string;
}

interface MembershipSummary {
  auctionName: string;
  userEmail: string;
  userName: string;
  role: string;
}

const summary = {
  users: [] as UserSummary[],
  auctions: [] as AuctionSummary[],
  items: [] as ItemSummary[],
  memberships: [] as MembershipSummary[],
  totalBids: 0,
};

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log("🌱 Starting comprehensive database seed...\n");
  console.log("⚠️  This will DELETE all existing data!\n");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auctionItemImage.deleteMany();
  await prisma.auctionItem.deleteMany();
  await prisma.auctionInvite.deleteMany();
  await prisma.auctionMember.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.user.deleteMany();
  // Don't delete currencies, just upsert them
  console.log("✅ Cleared existing data\n");

  // Seed currencies
  await seedCurrencies(prisma);
  console.log("");

  // Create password hash (same for all users)
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  // Create main user (owner of all auctions)
  console.log("👤 Creating main user...");
  const mainUser = await prisma.user.create({
    data: {
      email: MAIN_USER_EMAIL,
      name: MAIN_USER_NAME,
      passwordHash,
    },
  });
  summary.users.push({
    id: mainUser.id,
    email: mainUser.email,
    name: mainUser.name || "",
  });
  console.log(`✅ Created main user: ${MAIN_USER_EMAIL}\n`);

  // Create random users
  console.log(`👥 Creating ${NUM_RANDOM_USERS} random users...`);
  const randomUsers: { id: string; email: string; name: string }[] = [];

  for (let i = 0; i < NUM_RANDOM_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const name = `${firstName} ${lastName}`;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });

    randomUsers.push({ id: user.id, email: user.email, name: user.name || "" });
    summary.users.push({
      id: user.id,
      email: user.email,
      name: user.name || "",
    });
  }
  console.log(`✅ Created ${NUM_RANDOM_USERS} random users\n`);

  // Create auctions
  console.log(
    `🏛️  Creating ${auctionScenarios.length} auctions with different settings...\n`
  );

  for (const scenario of auctionScenarios) {
    console.log(`  📦 Creating: "${scenario.name}"`);

    const endDate = getEndDate(scenario.endDateType);

    // Generate a unique placeholder thumbnail for each auction
    const auctionIndex = auctionScenarios.indexOf(scenario);
    const thumbnailUrl = `https://picsum.photos/seed/auction-${auctionIndex}/800/400`;

    const auction = await prisma.auction.create({
      data: {
        name: scenario.name,
        description: scenario.description,
        joinMode: scenario.joinMode,
        memberCanInvite: scenario.memberCanInvite,
        bidderVisibility: scenario.bidderVisibility,
        itemEndMode: scenario.itemEndMode,
        endDate,
        inviteToken:
          scenario.joinMode === JoinMode.LINK
            ? faker.string.alphanumeric(20)
            : null,
        thumbnailUrl,
        creatorId: mainUser.id,
      },
    });

    // Add owner membership
    await prisma.auctionMember.create({
      data: {
        auctionId: auction.id,
        userId: mainUser.id,
        role: MemberRole.OWNER,
      },
    });
    summary.memberships.push({
      auctionName: auction.name,
      userEmail: mainUser.email,
      userName: mainUser.name || "",
      role: "OWNER",
    });

    // Add random members with different roles
    const membersToAdd = pickRandomSubset(randomUsers, 5, 15);

    for (let i = 0; i < membersToAdd.length; i++) {
      const member = membersToAdd[i];
      // First few get admin/creator roles, rest are bidders
      let role: MemberRole;
      if (i === 0) role = MemberRole.ADMIN;
      else if (i === 1) role = MemberRole.CREATOR;
      else if (i < 4)
        role = pickRandom([MemberRole.CREATOR, MemberRole.BIDDER]);
      else role = MemberRole.BIDDER;

      await prisma.auctionMember.create({
        data: {
          auctionId: auction.id,
          userId: member.id,
          role,
          invitedById: mainUser.id,
        },
      });
      summary.memberships.push({
        auctionName: auction.name,
        userEmail: member.email,
        userName: member.name,
        role,
      });
    }

    // Get members who can create items (OWNER, ADMIN, CREATOR)
    const itemCreators = [
      { id: mainUser.id, email: mainUser.email, name: mainUser.name || "" },
      ...membersToAdd.slice(0, 4), // First 4 members (admin + creators)
    ];

    // Create items
    let itemsCreated = 0;
    let bidsCreated = 0;

    for (let i = 0; i < ITEMS_PER_AUCTION; i++) {
      const creator = pickRandom(itemCreators);
      const itemEndDate = getItemEndDate(endDate, scenario.itemEndMode, i);
      const currencyCode = pickRandom(["USD", "EUR", "GBP", "HUF"]);
      const startingBid = faker.number.int({ min: 10, max: 500 });
      const minBidIncrement = faker.number.int({ min: 1, max: 20 });

      const item = await prisma.auctionItem.create({
        data: {
          auctionId: auction.id,
          name: faker.commerce.productName(),
          description: faker.commerce.productDescription(),
          currencyCode,
          startingBid,
          minBidIncrement,
          endDate: itemEndDate,
          creatorId: creator.id,
          bidderAnonymous:
            scenario.bidderVisibility === BidderVisibility.ANONYMOUS,
        },
      });

      // Add placeholder images (1-3 per item)
      const numImages = faker.number.int({ min: 1, max: 3 });
      for (let imgIdx = 0; imgIdx < numImages; imgIdx++) {
        await prisma.auctionItemImage.create({
          data: {
            auctionItemId: item.id,
            url: `https://picsum.photos/seed/${item.id}-${imgIdx}/400/300`,
            order: imgIdx,
          },
        });
      }

      // Generate bids (skip some items to have items with no bids)
      const shouldHaveBids = i % 3 !== 0; // 2/3 of items have bids
      let currentBid: number | null = null;
      let highestBidderId: string | null = null;

      if (shouldHaveBids) {
        const numBids = faker.number.int({ min: 1, max: 8 });
        let bidAmount = startingBid;

        // Get bidders (members who are not the item creator)
        const potentialBidders = membersToAdd.filter(
          (m) => m.id !== creator.id
        );

        if (potentialBidders.length > 0) {
          for (let bidIdx = 0; bidIdx < numBids; bidIdx++) {
            bidAmount += faker.number.int({
              min: minBidIncrement,
              max: minBidIncrement * 5,
            });
            const bidder = pickRandom(potentialBidders);

            await prisma.bid.create({
              data: {
                auctionItemId: item.id,
                userId: bidder.id,
                amount: bidAmount,
                isAnonymous:
                  scenario.bidderVisibility === BidderVisibility.PER_BID
                    ? faker.datatype.boolean()
                    : false,
                createdAt: new Date(
                  Date.now() -
                    faker.number.int({ min: 1, max: 30 }) * 24 * 60 * 60 * 1000
                ),
              },
            });

            currentBid = bidAmount;
            highestBidderId = bidder.id;
            bidsCreated++;
            summary.totalBids++;
          }

          // Update item with current bid
          await prisma.auctionItem.update({
            where: { id: item.id },
            data: { currentBid, highestBidderId },
          });
        }
      }

      summary.items.push({
        auctionName: auction.name,
        itemName: item.name,
        creatorEmail: creator.email,
        creatorName: creator.name,
        bidCount: shouldHaveBids ? faker.number.int({ min: 1, max: 8 }) : 0,
        currentBid,
        endDate: itemEndDate ? itemEndDate.toISOString() : "No end date",
      });

      itemsCreated++;
    }

    summary.auctions.push({
      id: auction.id,
      name: auction.name,
      settings: `${scenario.joinMode} | ${scenario.bidderVisibility} | ${scenario.itemEndMode} | End: ${scenario.endDateType}`,
      memberCount: membersToAdd.length + 1,
      itemCount: itemsCreated,
    });

    console.log(
      `     ✅ ${itemsCreated} items, ${bidsCreated} bids, ${
        membersToAdd.length + 1
      } members`
    );
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(80));

  console.log(`\n👥 USERS (${summary.users.length} total)`);
  console.log("-".repeat(40));
  console.log(
    `   Main User: ${MAIN_USER_EMAIL} (password: ${DEFAULT_PASSWORD})`
  );
  console.log(
    `   Random Users: ${NUM_RANDOM_USERS} (all with password: ${DEFAULT_PASSWORD})`
  );

  console.log(`\n🏛️  AUCTIONS (${summary.auctions.length} total)`);
  console.log("-".repeat(40));
  for (const auction of summary.auctions) {
    console.log(`   📦 ${auction.name}`);
    console.log(`      Settings: ${auction.settings}`);
    console.log(
      `      Members: ${auction.memberCount} | Items: ${auction.itemCount}`
    );
  }

  console.log(`\n📝 ITEMS: ${summary.items.length} total`);
  console.log(`💰 BIDS: ${summary.totalBids} total`);

  console.log(`\n👔 MEMBERSHIP MATRIX (sample)`);
  console.log("-".repeat(40));
  const membershipsByAuction = summary.memberships.reduce((acc, m) => {
    if (!acc[m.auctionName]) acc[m.auctionName] = [];
    acc[m.auctionName].push(m);
    return acc;
  }, {} as Record<string, typeof summary.memberships>);

  // Show first 3 auctions' memberships
  const auctionNames = Object.keys(membershipsByAuction).slice(0, 3);
  for (const auctionName of auctionNames) {
    console.log(`\n   ${auctionName.substring(0, 50)}...`);
    for (const m of membershipsByAuction[auctionName]) {
      console.log(`      ${m.role.padEnd(8)} | ${m.userName} (${m.userEmail})`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("🎉 SEEDING COMPLETE!");
  console.log("=".repeat(80));
  console.log(`\n🔑 Login with: ${MAIN_USER_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log(
    `   Or any random user email with password: ${DEFAULT_PASSWORD}\n`
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
