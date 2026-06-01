"use client";

import { Suspense } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function ChatHomePage() {
  return (
    <Suspense fallback={null}>
      <ChatView />
    </Suspense>
  );
}
