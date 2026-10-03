import { GUIDE_SECTIONS, type GuideSection } from "@/lib/cs-guide/content";

/**
 * Demo answers without an API key: picks the guide sections that share the
 * most words with the question and quotes them. Lets the chat UI run (and be
 * reviewed) locally for free; real answers need ANTHROPIC_API_KEY.
 */

const STOPWORDS = new Set(
  "a an and are as at be can do does for from how i if in is it me my of on or so the to what when where which who why will with you your".split(
    " ",
  ),
);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

const score = (question: string[], section: GuideSection) => {
  const title = new Set(words(section.title));
  const body = new Set(words(section.text));
  return question.reduce(
    (sum, w) => sum + (title.has(w) ? 3 : 0) + (body.has(w) ? 1 : 0),
    0,
  );
};

const firstSentences = (text: string, count: number) =>
  text
    .split(/(?<=[.!?])\s+/)
    .slice(0, count)
    .join(" ");

export const mockAnswer = (question: string): string => {
  const q = words(question);
  const ranked = GUIDE_SECTIONS.map((s) => ({ s, n: score(q, s) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n)
    .filter((r, i, all) => i === 0 || (i === 1 && r.n * 2 >= all[0].n));

  const note =
    "_Demo mode: no API key is set, so this quotes the closest part of the guide instead of writing an answer._";
  if (ranked.length === 0) {
    return `${note}\n\nI couldn't find that in the CS guide. Try asking about course codes, context credits, program requirements or resources.`;
  }
  const parts = ranked.map(
    ({ s }) =>
      `**${s.title}**: ${firstSentences(s.text, 2)}\n\n[Read ${s.title}](#${s.id})`,
  );
  return [note, ...parts].join("\n\n");
};

/** Streams text in small chunks so the demo shows the typing UI too. */
export const mockStream = (text: string): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  const chunks = text.match(/\S+\s*/g) ?? [text];
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) return controller.close();
      await new Promise((r) => setTimeout(r, 25));
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
};
