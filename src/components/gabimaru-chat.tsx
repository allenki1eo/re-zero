"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  Bot,
  Cable,
  CheckCircle2,
  CircleAlert,
  Code2,
  Cpu,
  Hammer,
  Loader2,
  PanelLeft,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  User,
  Zap
} from "lucide-react";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";

type MessagePart = UIMessage["parts"][number] & {
  input?: unknown;
  output?: unknown;
  errorText?: string;
  state?: string;
};

const suggestions = [
  "Build an ESP32 weather station with an OLED display",
  "Create a Raspberry Pi camera doorbell with motion detection",
  "Design an Arduino robot car with ultrasonic obstacle avoidance",
  "Make a smart plant monitor with moisture sensing and LED alerts"
];

const capabilities = [
  { icon: Cable, label: "Wiring maps", description: "Pin-by-pin connection plans" },
  { icon: Code2, label: "Firmware", description: "Arduino, Python, ESP32, Pico" },
  { icon: ShieldCheck, label: "Safety checks", description: "Power and current guardrails" },
  { icon: Cpu, label: "Simulation", description: "Bench-readiness validation" }
];

function isToolPart(part: MessagePart) {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function formatChatError(message: string) {
  if (/payment required|402|credits|billing/i.test(message)) {
    return "The hosted model provider needs billing or available credits. Use the default free local mode, or configure Groq with GABIMARU_AI_MODE=groq and a valid GROQ_API_KEY.";
  }

  if (/invalid authentication|api key|unauthorized|groq|token/i.test(message)) {
    return "Missing or invalid Groq credentials. Set a valid GROQ_API_KEY in your Vercel environment variables (or .env.local for local dev), then redeploy.";
  }

  return message;
}

function toolName(type: string) {
  return type
    .replace(/^tool-/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/-/g, " ")
    .trim();
}

function MessageAvatar({ role }: { role: UIMessage["role"] }) {
  if (role === "user") {
    return (
      <Avatar className="mt-1 size-8 border bg-background">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <User className="size-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className="mt-1 size-8 border bg-background">
      <AvatarImage src="/gabimaru.png" alt="Gabimaru" />
      <AvatarFallback>G</AvatarFallback>
    </Avatar>
  );
}

function RenderMessage({ message }: { message: UIMessage }) {
  return (
    <div className={cn("flex gap-3", message.role === "user" && "justify-end")}>
      {message.role !== "user" ? <MessageAvatar role={message.role} /> : null}
      <Message from={message.role} className={message.role === "user" ? "max-w-[82%]" : "max-w-[88%]"}>
        <MessageContent
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-sm",
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground"
          )}
        >
          {message.parts.map((part, index) => {
            const typedPart = part as MessagePart;

            if (typedPart.type === "text") {
              return (
                <MessageResponse
                  className={cn(
                    "prose-sm max-w-none",
                    message.role === "user" && "text-primary-foreground"
                  )}
                  key={`${message.id}-${index}`}
                >
                  {typedPart.text}
                </MessageResponse>
              );
            }

            if (isToolPart(typedPart)) {
              return (
                <Tool className="my-1 border-border/80 bg-muted/30" defaultOpen={false} key={`${message.id}-${index}`}>
                  <ToolHeader
                    state={(typedPart.state ?? "input-available") as never}
                    title={toolName(typedPart.type)}
                    toolName={toolName(typedPart.type)}
                    type={typedPart.type as never}
                  />
                  <ToolContent>
                    <ToolInput input={typedPart.input} />
                    <ToolOutput errorText={typedPart.errorText as never} output={typedPart.output as never} />
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}
        </MessageContent>
      </Message>
      {message.role === "user" ? <MessageAvatar role={message.role} /> : null}
    </div>
  );
}

export function GabimaruChat() {
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, sendMessage, status, error, setMessages, regenerate, stop } = useChat();
  const isBusy = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const statusLabel = useMemo(() => {
    if (status === "submitted") return "Connecting";
    if (status === "streaming") return "Thinking";
    if (status === "error") return "Needs attention";
    return "Ready";
  }, [status]);

  async function sendText(text: string) {
    const cleanText = text.trim();
    if (!cleanText || isBusy) return;
    setInput("");
    await sendMessage({ text: cleanText });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendText(input);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendText(input);
    }
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "hidden w-[292px] shrink-0 border-r bg-sidebar px-3 py-4 text-sidebar-foreground transition-all lg:flex lg:flex-col",
          !sidebarOpen && "lg:w-0 lg:overflow-hidden lg:border-r-0 lg:p-0"
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <Avatar className="size-11 border bg-background shadow-sm">
            <AvatarImage src="/gabimaru.png" alt="Gabimaru logo" />
            <AvatarFallback>G</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Gabimaru</p>
            <p className="truncate text-xs text-muted-foreground">Hardware project agent</p>
          </div>
        </div>

        <Button className="mt-5 h-10 justify-start gap-2" onClick={() => setMessages([])} variant="outline">
          <Plus className="size-4" />
          New chat
        </Button>

        <Separator className="my-4" />

        <div className="space-y-2">
          <p className="px-2 text-xs font-medium uppercase text-muted-foreground">Starter prompts</p>
          {suggestions.map((suggestion) => (
            <Button
              className="h-auto w-full justify-start whitespace-normal rounded-lg px-2 py-2 text-left text-xs leading-5"
              disabled={isBusy}
              key={suggestion}
              onClick={() => void sendText(suggestion)}
              variant="ghost"
            >
              {suggestion}
            </Button>
          ))}
        </div>

        <div className="mt-auto space-y-3 px-2">
          <div className="rounded-xl border bg-background/70 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="size-4 text-red-600" />
              Free mode
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Local planner now. Groq tool-calling optional.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Toggle sidebar"
                  className="hidden lg:inline-flex"
                  onClick={() => setSidebarOpen((value) => !value)}
                  size="icon"
                  variant="ghost"
                >
                  <PanelLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle sidebar</TooltipContent>
            </Tooltip>
            <Avatar className="size-9 border bg-background lg:hidden">
              <AvatarImage src="/gabimaru.png" alt="Gabimaru" />
              <AvatarFallback>G</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight">Gabimaru</h1>
                <Badge variant="secondary">{statusLabel}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">ChatGPT-style electronics planning for real hardware builds</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isBusy ? (
              <Button onClick={stop} size="sm" variant="outline">
                <Square className="size-3.5" />
                Stop
              </Button>
            ) : hasMessages ? (
              <Button onClick={() => void regenerate()} size="sm" variant="outline">
                <RotateCcw className="size-3.5" />
                Retry
              </Button>
            ) : null}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col">
            <Conversation className="min-h-0">
              <ConversationContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-8 md:px-8">
                {!hasMessages ? (
                  <ConversationEmptyState>
                    <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
                      <Avatar className="size-24 border bg-background shadow-sm">
                        <AvatarImage src="/gabimaru.png" alt="Gabimaru logo" />
                        <AvatarFallback>G</AvatarFallback>
                      </Avatar>
                      <div className="space-y-3">
                        <Badge className="gap-1.5" variant="outline">
                          <Sparkles className="size-3.5 text-red-600" />
                          Hardware agent
                        </Badge>
                        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                          What are we building today?
                        </h2>
                        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
                          Ask Gabimaru for Arduino, Raspberry Pi, ESP32, robotics, sensors, displays, wiring,
                          code, and simulation checks.
                        </p>
                      </div>
                      <div className="grid w-full gap-2 sm:grid-cols-2">
                        {suggestions.slice(0, 4).map((suggestion) => (
                          <Button
                            className="h-auto justify-start whitespace-normal rounded-xl border bg-card px-4 py-3 text-left text-sm leading-5 shadow-sm"
                            disabled={isBusy}
                            key={suggestion}
                            onClick={() => void sendText(suggestion)}
                            variant="outline"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message) => <RenderMessage key={message.id} message={message} />)
                )}

                {isBusy ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Avatar className="size-8 border bg-background">
                      <AvatarImage src="/gabimaru.png" alt="Gabimaru" />
                      <AvatarFallback>G</AvatarFallback>
                    </Avatar>
                    <Loader2 className="size-4 animate-spin" />
                    Gabimaru is thinking through the build...
                  </div>
                ) : null}

                {error ? (
                  <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="font-medium">Gabimaru could not answer yet.</p>
                      <p className="mt-1 text-destructive/80">{formatChatError(error.message)}</p>
                    </div>
                  </div>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="border-t bg-background px-4 py-4 md:px-6">
              <form className="mx-auto flex max-w-4xl items-end gap-3" onSubmit={onSubmit}>
                <div className="relative flex-1">
                  <Textarea
                    className="max-h-40 min-h-14 resize-none rounded-2xl border-border bg-card px-4 py-4 pr-12 text-sm shadow-sm"
                    disabled={isBusy}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder="Message Gabimaru..."
                    value={input}
                  />
                  <Button
                    aria-label="Send message"
                    className="absolute bottom-3 right-3 rounded-full"
                    disabled={isBusy || !input.trim()}
                    size="icon"
                    type="submit"
                  >
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </form>
              <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-muted-foreground">
                Gabimaru can make mistakes. Verify wiring, voltage, and current limits before powering hardware.
              </p>
            </div>
          </div>

          <aside className="hidden border-l bg-card/40 p-4 xl:block">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Hammer className="size-4" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {capabilities.map((capability) => {
                    const Icon = capability.icon;
                    return (
                      <div className="flex gap-3" key={capability.label}>
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{capability.label}</p>
                          <p className="text-xs leading-5 text-muted-foreground">{capability.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="size-4" />
                    Build discipline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
                  <p>Uses conservative low-voltage guidance.</p>
                  <p>Produces diagrams, pin tables, firmware, and tests.</p>
                  <p>Runs a lightweight firmware and wiring readiness check.</p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
