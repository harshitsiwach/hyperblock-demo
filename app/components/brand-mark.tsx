import Image from "next/image";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link className="brand-mark" href="/" aria-label="Hyperblock home">
      <Image
        src="/hyperblock.png"
        alt="Hyperblock"
        width={96}
        height={64}
        priority
        className="brand-logo"
      />
      <span className="brand-wordmark">hyperblock</span>
    </Link>
  );
}
