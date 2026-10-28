/**
 * A pilot response is considered field-complete only when every requested
 * numeric field is present and finite. Partial provider payloads must not
 * inflate the pilot's success rate.
 */
export function hasFiniteFields(record, fields) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  return fields.every((field) => typeof record[field] === "number" && Number.isFinite(record[field]));
}
