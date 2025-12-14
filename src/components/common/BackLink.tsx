import Link from "next/link";

interface BackLinkProps {
  href: string;
  label: string;
  shortLabel?: string;
}

export function BackLink({ href, label, shortLabel }: BackLinkProps) {
  return (
    <Link href={href} className="btn btn-ghost btn-sm gap-2">
      <span className="icon-[tabler--arrow-left] size-4"></span>
      <span className="hidden sm:inline">{label}</span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
    </Link>
  );
}
