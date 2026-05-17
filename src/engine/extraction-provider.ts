import { extractClaims, normalizeClaimDraft, type ClaimDraftInput } from './claim-extraction';
import type { Claim, Direction, Freshness, Horizon, Note } from './types';

export interface ClaimExtractionContext {
  asOf: string;
}

export type ClaimExtractionDraft = Partial<Claim> & Pick<Claim, 'subject' | 'text'>;

export interface ClaimExtractionProvider {
  extractClaims(note: Note, context: ClaimExtractionContext): Promise<ClaimExtractionDraft[]>;
}

export const deterministicClaimExtractionProvider = {
  async extractClaims(note: Note, context: ClaimExtractionContext): Promise<Claim[]> {
    return extractClaims(note, context.asOf);
  }
} satisfies ClaimExtractionProvider;

export function createFallbackClaimExtractionProvider(primary?: ClaimExtractionProvider) {
  return {
    async extractClaims(note: Note, context: ClaimExtractionContext): Promise<Claim[]> {
      if (!primary) return deterministicClaimExtractionProvider.extractClaims(note, context);

      try {
        const drafts = await primary.extractClaims(note, context);
        if (!Array.isArray(drafts) || !drafts.length || drafts.some(draft => !validDraft(draft))) {
          return deterministicClaimExtractionProvider.extractClaims(note, context);
        }

        const claims = drafts.map((draft, index) => normalizeClaimDraft(note, draft as ClaimDraftInput, index, context.asOf));
        if (claims.some(claim => !claim)) return deterministicClaimExtractionProvider.extractClaims(note, context);
        return claims as Claim[];
      } catch {
        return deterministicClaimExtractionProvider.extractClaims(note, context);
      }
    }
  } satisfies ClaimExtractionProvider;
}

function validDraft(value: unknown): value is ClaimExtractionDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<ClaimExtractionDraft>;
  return (
    typeof draft.subject === 'string'
    && draft.subject.trim().length > 0
    && typeof draft.text === 'string'
    && draft.text.trim().length > 0
    && (!Object.prototype.hasOwnProperty.call(draft, 'direction') || validDirection(draft.direction))
    && (!Object.prototype.hasOwnProperty.call(draft, 'horizon') || validHorizon(draft.horizon))
    && (!Object.prototype.hasOwnProperty.call(draft, 'freshness') || validFreshness(draft.freshness))
    && (!Object.prototype.hasOwnProperty.call(draft, 'confidence') || validConfidence(draft.confidence))
  );
}

function validDirection(value: unknown): value is Direction {
  return value === 'positive' || value === 'negative' || value === 'neutral';
}

function validHorizon(value: unknown): value is Horizon {
  return value === 'point_in_time' || value === 'near_term' || value === 'quarter' || value === 'year' || value === 'unknown';
}

function validFreshness(value: unknown): value is Freshness {
  return value === 'fresh' || value === 'aging' || value === 'stale';
}

function validConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
