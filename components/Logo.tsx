import Link from "next/link";

// The shop icon beside the SiteGenie name. Small copies of the 4K brand files (public/brand).
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="SiteGenie home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-icon" src="/brand/icon-96.png" alt="" width={26} height={24} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-name" src="/brand/name-72.png" alt="SiteGenie" width={103} height={18} />
    </Link>
  );
}
