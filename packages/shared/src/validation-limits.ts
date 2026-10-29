/**
 * Shared length/shape limits referenced by both the backend's class-validator DTOs
 * and the frontend's Zod schemas, so the two layers cannot silently drift apart.
 * The backend remains the authoritative, enforced copy; the frontend copy exists
 * purely to give the user instant feedback before a round trip.
 */
export const LIMITS = {
  user: { firstNameMax: 60, lastNameMax: 60, passwordMin: 10, passwordMax: 128 },
  organization: { nameMin: 2, nameMax: 100, slugMax: 60, descriptionMax: 500 },
  project: { nameMin: 2, nameMax: 120, descriptionMax: 2000 },
  task: { titleMin: 2, titleMax: 200, descriptionMax: 10_000 },
  comment: { bodyMin: 1, bodyMax: 5000 },
  label: { nameMin: 1, nameMax: 40 },
} as const;
