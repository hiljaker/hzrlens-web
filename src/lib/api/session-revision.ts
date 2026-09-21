import { z } from "zod";

const revisionSchema = z.strictObject({
  schemaVersion: z.literal("1"),
  sessionId: z.string().regex(/^[a-f0-9]{32}$/),
  generation: z.number().int().positive(),
  sequence: z.number().int().positive().safe(),
  simulationTimeMs: z.number().int().nonnegative(),
  occurredAt: z.iso.datetime({ offset: true }),
});

export function acceptRevision(
  raw: string,
  eventId: string,
  sessionId: string,
  lastSequence: number,
): number | "resync" | "duplicate" {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return "resync";
  }
  const parsed = revisionSchema.safeParse(payload);
  if (
    !parsed.success ||
    parsed.data.sessionId !== sessionId ||
    eventId !== `${sessionId}:${parsed.data.sequence}`
  )
    return "resync";
  if (parsed.data.sequence <= lastSequence) return "duplicate";
  if (lastSequence > 0 && parsed.data.sequence !== lastSequence + 1)
    return "resync";
  return parsed.data.sequence;
}
