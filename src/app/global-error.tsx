"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", padding: "4rem 1.5rem", color: "#0b1f3a" }}>
        <h1>Something went wrong</h1>
        <p>GB International Travel could not load this page. Please try again or contact the team.</p>
        <button type="button" onClick={() => reset()} style={{ marginTop: "1rem", minHeight: "44px" }}>
          Try again
        </button>
        <p style={{ display: "none" }}>{error.digest}</p>
      </body>
    </html>
  );
}
