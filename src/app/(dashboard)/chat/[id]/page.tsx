"use client";

import { Suspense, use } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function ChatByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <ChatView initialChatId={id} />
    </Suspense>
  );
}
