"use client";

import dynamic from "next/dynamic";

const QuickAssistance = dynamic(
  () =>
    import("@/components/chatbot/quick-assistance").then((mod) => mod.QuickAssistance),
  { ssr: false, loading: () => null },
);

/** Homepage-only lazy mount so the chat UI loads after the main page paint. */
export function QuickAssistanceLoader() {
  return <QuickAssistance />;
}
