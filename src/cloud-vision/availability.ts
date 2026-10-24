export const AVAILABILITY_SCHEMA = "cloud-availability/1" as const;
export type CloudAvailability =
  "restricted" | "eligible" | "unavailable" | "invalid_invitation";

export function validateAvailability(value: unknown): CloudAvailability {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid availability");
  const row = value as Record<string, unknown>;
  if (
    row.schema !== AVAILABILITY_SCHEMA ||
    Object.keys(row).sort().join() !== "schema,status" ||
    typeof row.status !== "string" ||
    !["restricted", "eligible", "unavailable", "invalid_invitation"].includes(
      row.status,
    )
  )
    throw Error("Invalid availability");
  return row.status as CloudAvailability;
}
