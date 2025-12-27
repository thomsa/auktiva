interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="skeleton h-48 w-full rounded-t-2xl rounded-b-none" />
      <div className="card-body">
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="mt-4 space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAuctionCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="skeleton h-40 w-full rounded-t-2xl rounded-b-none" />
      <div className="card-body">
        <div className="skeleton h-6 w-3/4" />
        <div className="flex gap-2 mt-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex justify-between">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonItemCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="skeleton aspect-square w-full rounded-t-2xl rounded-b-none" />
      <div className="card-body p-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="flex justify-between items-center mt-2">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <div className="skeleton h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonList({
  items = 5,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-base-100 rounded-lg"
        >
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMemberRow() {
  return (
    <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg">
      <div className="skeleton h-12 w-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="skeleton h-8 w-24 rounded" />
      <div className="skeleton h-8 w-8 rounded" />
    </div>
  );
}

export function SkeletonBidRow() {
  return (
    <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="skeleton h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3 w-32" />
        </div>
      </div>
      <div className="skeleton h-5 w-20" />
    </div>
  );
}

export function SkeletonStatsCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-lg ${className}`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-6 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid - matches: grid-cols-1 sm:grid-cols-2 md:grid-cols-4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>

      {/* Your Items Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="space-y-1">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton h-4 w-48" />
          </div>
        </div>
        <div className="card bg-base-100 shadow border border-base-content/10">
          <div className="card-body p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
            </div>
          </div>
        </div>
      </div>

      {/* Your Bids Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="skeleton h-6 w-28" />
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
              <SkeletonBidItemCard />
            </div>
          </div>
        </div>
      </div>

      {/* Auctions Section - matches: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="skeleton h-6 w-32" />
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonAuctionCard />
          <SkeletonAuctionCard />
          <SkeletonAuctionCard />
        </div>
      </div>
    </div>
  );
}

// Skeleton for bid/user item cards (compact card with thumbnail)
export function SkeletonBidItemCard() {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-base-100/50 border border-base-content/5">
      <div className="skeleton w-14 h-14 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-12 rounded-full" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListingCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-lg ${className}`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          <div className="skeleton h-16 w-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="flex gap-2 mt-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonListingsPage() {
  return (
    <div className="space-y-6">
      {/* Just Ended Section - matches actual card bg-primary/5 */}
      <div className="card bg-primary/5 border border-primary/20">
        <div className="card-body p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton h-5 w-5 rounded" />
            <div className="skeleton h-6 w-28" />
            <div className="skeleton h-5 w-6 rounded-full" />
          </div>
          <div className="skeleton h-4 w-3/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <SkeletonJustEndedCard />
            <SkeletonJustEndedCard />
          </div>
        </div>
      </div>

      {/* Sliding Switch - full width */}
      <div className="skeleton h-12 w-full rounded-xl" />

      {/* Sort dropdown aligned right */}
      <div>
        <div className="flex justify-end mb-4">
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        {/* Listings Grid - matches: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
        </div>
      </div>
    </div>
  );
}

// Skeleton for Just Ended cards (compact with thumbnail and email)
function SkeletonJustEndedCard() {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-base-100 border border-primary/20">
      <div className="skeleton w-12 h-12 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="skeleton h-4 w-3/4" />
        <div className="flex items-center gap-1">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="pt-1.5 border-t border-base-content/5">
          <div className="flex items-center gap-1">
            <div className="skeleton h-3 w-3 rounded" />
            <div className="skeleton h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonHistoryPage() {
  return (
    <div className="space-y-12">
      {/* Stats - matches: grid-cols-1 sm:grid-cols-3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>

      {/* Bid List Card */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-0 sm:p-6">
          <div className="flex items-center gap-2 px-6 pt-6 sm:px-0 sm:pt-0 mb-6">
            <div className="w-1 h-6 rounded-full bg-secondary"></div>
            <div className="skeleton h-6 w-28" />
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden px-4 pb-4">
            <SkeletonHistoryMobileCard />
            <SkeletonHistoryMobileCard />
            <SkeletonHistoryMobileCard />
            <SkeletonHistoryMobileCard />
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <SkeletonTable rows={6} columns={6} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for mobile history cards
function SkeletonHistoryMobileCard() {
  return (
    <div className="p-4 bg-base-100 rounded-xl border border-base-content/5">
      <div className="flex justify-between items-start mb-3">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-1 mb-3">
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-4 w-24" />
      </div>
      <div className="flex justify-between bg-base-200/50 p-3 rounded-lg">
        <div className="space-y-1">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-5 w-20" />
        </div>
        <div className="space-y-1">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAuctionPage() {
  return (
    <div className="space-y-8">
      {/* Auction Title Header */}
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="skeleton h-8 w-48" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Content - Items */}
      <div className="flex-1 min-w-0">
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body p-6">
            {/* Items Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-base-content/5">
              <div className="flex items-center gap-2">
                <div className="skeleton h-5 w-5 rounded" />
                <div className="skeleton h-6 w-16" />
                <div className="skeleton h-5 w-8 rounded-full" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="skeleton h-10 w-32 rounded-lg" />
                <div className="skeleton h-10 w-20 rounded-lg" />
                <div className="skeleton h-10 w-28 rounded-lg" />
              </div>
            </div>

            {/* Items Grid - matches: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <SkeletonItemCard />
              <SkeletonItemCard />
              <SkeletonItemCard />
              <SkeletonItemCard />
              <SkeletonItemCard />
              <SkeletonItemCard />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className="hidden lg:block w-80 shrink-0">
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl sticky top-24">
          <div className="card-body p-5">
            {/* Auction Info */}
            <div className="space-y-4">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
            <div className="divider my-4"></div>
            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
            <div className="divider my-4"></div>
            {/* Actions */}
            <div className="space-y-2">
              <div className="skeleton h-10 w-full rounded-lg" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function SkeletonSettingsPage() {
  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-lg">
        <div className="card-body">
          <div className="skeleton h-6 w-32 mb-4" />
          <div className="space-y-4">
            <div className="skeleton h-10 w-full rounded-lg" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-lg">
        <div className="card-body">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-6 w-12 rounded-full" />
            </div>
            <div className="flex justify-between items-center">
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-lg">
        <div className="card-body">
          <div className="skeleton h-6 w-24 mb-4" />
          <div className="skeleton h-10 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonItemPage() {
  return (
    <div className="flex flex-col xl:flex-row gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body p-6 sm:p-8">
            {/* Header */}
            <div className="flex justify-between mb-6">
              <div className="space-y-2">
                <div className="skeleton h-8 w-64" />
                <div className="skeleton h-4 w-40" />
              </div>
              <div className="skeleton h-8 w-20 rounded-full" />
            </div>

            {/* Image Gallery */}
            <div className="skeleton aspect-square w-full rounded-xl mb-6" />

            {/* Description */}
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full xl:w-96 shrink-0 space-y-4">
        <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body">
            <div className="skeleton h-6 w-32 mb-4" />
            <div className="skeleton h-12 w-full rounded-lg mb-4" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        </div>

        <div className="card bg-base-100/80 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body">
            <div className="skeleton h-6 w-24 mb-4" />
            <div className="space-y-3">
              <SkeletonBidRow />
              <SkeletonBidRow />
              <SkeletonBidRow />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
