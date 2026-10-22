import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="SiteGenie home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/SiteGenie-name-4K.png" alt="SiteGenie" width={160} height={28} />
    </Link>
  );
}
