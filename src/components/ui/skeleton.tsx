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
