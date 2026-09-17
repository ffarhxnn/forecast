import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <h2>This market isn&apos;t tracked</h2>
      <p>It may have closed, or it has less than $1K in daily trading.</p>
      <Link className="button" href="/" style={{ textDecoration: "none" }}>
        Browse markets
      </Link>
    </div>
  );
}
