// Server-side AI investigation-draft endpoint.
//
// The Anthropic API key is read from the environment ON THE SERVER ONLY and is never
// exposed to the client. The endpoint returns a FIRST-DRAFT investigation note framed
// as prompts for a human investigator — it never decides disposition, release, pass/
// fail, or CAPA outcome. If no key is configured it degrades gracefully.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SAMPLE_TYPE_LABEL } from "@/lib/types";
import { FLAG_RULE_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 1200;

const DRAFT_LABEL =
  "AI-generated draft — for human review only. Not a quality decision.";

interface InvestigatePayload {
  room: string;
  grade: string;
  sampleType: string;
  unit: string;
  value: number;
  rule: string;
  ruleLabel: string;
  severity: string;
  reason: string;
  timestamp: string;
  alert: number;
  action: number;
  spec: number | null;
  basis: string;
  recent: { date: string; value: number }[];
}

function buildPrompt(p: InvestigatePayload): string {
  const recentLine = p.recent
    .map((r) => `${r.date.slice(0, 10)}: ${r.value} ${p.unit}`)
    .join("\n");
  const specLine = p.spec === null ? "not defined (risk-based)" : `${p.spec} ${p.unit}`;
  return `An environmental-monitoring excursion has been flagged for review. Draft a first-pass investigation note.

CONTEXT
- Location / room: ${p.room}
- Cleanroom grade: ${p.grade}
- Sample type: ${SAMPLE_TYPE_LABEL[p.sampleType as keyof typeof SAMPLE_TYPE_LABEL] ?? p.sampleType}
- Flagged result: ${p.value} ${p.unit} on ${p.timestamp.slice(0, 16)}Z
- Rule triggered: ${FLAG_RULE_LABEL[p.rule as keyof typeof FLAG_RULE_LABEL] ?? p.ruleLabel} (severity: ${p.severity})
- Engine note: ${p.reason}
- Control limits — alert: ${p.alert} ${p.unit}; action: ${p.action} ${p.unit}; EU GMP Annex 1 (2022) spec: ${specLine}
- Limit basis: ${p.basis}
- Recent results at this location (oldest→newest):
${recentLine}

WRITE
A concise investigation-support note with these sections:
1. Summary — what breached, where, when, and the trend context in one short paragraph.
2. Areas to review — a bulleted list of plausible contributing factors to examine (e.g. HVAC/air handling, gowning & aseptic technique, cleaning & disinfection records, personnel/operator behaviour, sampling technique, equipment or line interventions, adjacent-room state). Frame each as a question or check for the investigator, not a conclusion.
3. Suggested immediate checks — a short bulleted list of first actions (e.g. verify sample integrity, review same-session results at neighbouring locations, confirm limit calculations).

RULES
- Do NOT decide disposition, batch release, pass/fail, or CAPA outcome. You assist writing only; a qualified human decides.
- Be specific to the grade and sample type. Grade A viable recovery is always significant (no growth expected).
- Keep it professional and factual. No fabricated data beyond what is given.
- Begin the note with this exact line: "${DRAFT_LABEL}"`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        available: false,
        message:
          "AI drafting unavailable — set ANTHROPIC_API_KEY in the environment to enable investigation drafts.",
      },
      { status: 200 },
    );
  }

  let payload: InvestigatePayload;
  try {
    payload = (await req.json()) as InvestigatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system:
        "You are an assistant to a pharmaceutical environmental-monitoring (EM) team working under EU GMP Annex 1. You draft investigation-support notes for human investigators. You never make quality, disposition, release, or CAPA decisions — you only help structure the human's investigation.",
      messages: [{ role: "user", content: buildPrompt(payload) }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ available: true, draft: text, label: DRAFT_LABEL });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        available: true,
        error: `AI drafting failed: ${detail}`,
      },
      { status: 502 },
    );
  }
}
