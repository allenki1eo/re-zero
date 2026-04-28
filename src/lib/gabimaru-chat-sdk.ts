import { Chat } from "chat";
import { createMemoryState } from "@chat-adapter/state-memory";

let chatSdkBot: Chat<Record<string, never>> | null = null;

export function getGabimaruChatSdkBot() {
  if (chatSdkBot) {
    return chatSdkBot;
  }

  chatSdkBot = new Chat({
    userName: "gabimaru",
    adapters: {},
    state: createMemoryState(),
    streamingUpdateIntervalMs: 1000,
    dedupeTtlMs: 10_000,
    fallbackStreamingPlaceholderText: "Gabimaru is checking the circuit..."
  });

  chatSdkBot.onNewMention(async (thread, message) => {
    await thread.subscribe();
    await thread.post(`Gabimaru is ready for hardware builds. Tell me the board, parts, and goal.\n\nYou said: ${message.text}`);
  });

  chatSdkBot.onSubscribedMessage(async (thread, message) => {
    await thread.post(`Received: ${message.text}\n\nFor the web app, Gabimaru's Hugging Face-powered tool route lives at /api/chat.`);
  });

  return chatSdkBot;
}
