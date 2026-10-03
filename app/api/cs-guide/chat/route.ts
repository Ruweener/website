import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { GUIDE_TEXT } from "@/lib/cs-guide/content";
import { mockAnswer, mockStream } from "@/lib/cs-guide/mock";
import { jsonObjectWithin } from "@/lib/json";
import { rateLimit } from "@/lib/rate-limit";

const MODEL = process.env.CS_GUIDE_CHAT_MODEL || "claude-haiku-4-5";
const MAX_TURNS = 12;
const MAX_QUESTION_CHARS = 1000;
const MAX_ANSWER_CHARS = 4000;

/** USD per million tokens, for the usage log only. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
};

const INSTRUCTIONS = `You are the help assistant on the Brock University Computer Science Club's CS Guide page. Students ask you about courses, registration and program requirements.

Answer only from the guide below. If the guide does not cover the question, say so plainly and suggest the undergraduate calendar (https://calendar.brocku.ca/) or academic advising; never guess requirements, deadlines or prerequisites.

Keep answers short: two to five sentences or a few bullets. After the answer, link the guide section you used as a Markdown link to its anchor, e.g. [Context Credits](#context-credits). You may also link the external URLs that appear in the guide. Use plain Markdown: **bold**, links and "- " bullets only.`;

type Turn = { role: "user" | "assistant"; content: string };

const validTurns = (value: unknown): Turn[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_TURNS) {
    return null;
  }
  const turns: Turn[] = [];
  for (const turn of value) {
    const { role, content } = (turn ?? {}) as Partial<Turn>;
    const limit = role === "user" ? MAX_QUESTION_CHARS : MAX_ANSWER_CHARS;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    if (content.length > limit) return null;
    turns.push({ role, content });
  }
  if (turns[0].role !== "user" || turns.at(-1)!.role !== "user") return null;
  return turns;
};

const textResponse = (body: ReadableStream<Uint8Array>, mode: string) =>
  new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-chat-mode": mode,
    },
  });

const logUsage = (usage: Anthropic.Usage) => {
  const price = PRICES[MODEL];
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const usd = price
    ? (usage.input_tokens * price.input +
        cacheWrite * price.input * 1.25 +
        cacheRead * price.input * 0.1 +
        usage.output_tokens * price.output) /
      1_000_000
    : null;
  // Token counts only: question text is never logged.
  console.info("[cs-guide-chat]", {
    model: MODEL,
    input: usage.input_tokens,
    cacheRead,
    cacheWrite,
    output: usage.output_tokens,
    usd: usd === null ? "unknown model" : usd.toFixed(5),
  });
};

const liveStream = (
  turns: Turn[],
  signal: AbortSignal,
): ReadableStream<Uint8Array> => {
  const client = new Anthropic();
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream(
          {
            model: MODEL,
            max_tokens: 600,
            system: [
              { type: "text", text: INSTRUCTIONS },
              {
                type: "text",
                text: `<guide>\n${GUIDE_TEXT}\n</guide>`,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: turns,
          },
          { signal },
        );
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        logUsage((await stream.finalMessage()).usage);
      } catch (error) {
        if (!signal.aborted) {
          console.error("[cs-guide-chat] failed", error);
          controller.enqueue(
            encoder.encode(
              "\n\nSorry, something went wrong answering that. Please try again in a moment.",
            ),
          );
        }
      } finally {
        controller.close();
      }
    },
  });
};

/** Answers a question about the CS guide, streamed as plain text. */
export const POST = async (req: NextRequest) => {
  const limited = rateLimit(req, "cs-guide-chat", 20, 60 * 60 * 1000);
  if (limited) return limited;

  const { body, tooLarge } = await jsonObjectWithin<{ messages?: unknown }>(
    req,
    32_000,
  );
  if (tooLarge) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  const turns = validTurns(body?.messages);
  if (!turns) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return textResponse(mockStream(mockAnswer(turns.at(-1)!.content)), "demo");
  }
  return textResponse(liveStream(turns, req.signal), "live");
};
