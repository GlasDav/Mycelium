import { intersectionCount, metadataForClaim } from './metadata';
import {
  sharedTopicFamilies,
  topicScoreForFamilies,
  type TopicFamilyId
} from './topic-matching';
import type { Claim } from './types';
import { overlapKeywords } from './utils';

export interface RelationCandidate {
  a: Claim;
  b: Claim;
  sharedWords: number;
  sharedMetadata: number;
  sharedTopicFamilies?: TopicFamilyId[];
  topicScore?: number;
  classificationScore?: number;
}

export interface CandidateRetrievalContext {
  asOf: string;
}

export interface CandidateRetriever {
  retrieve(claims: Claim[], context: CandidateRetrievalContext): RelationCandidate[];
}

export const deterministicCandidateRetriever: CandidateRetriever = {
  retrieve(claims) {
    return relationCandidates(claims);
  }
};

export function relationCandidates(claims: Claim[]): RelationCandidate[] {
  const candidates: RelationCandidate[] = [];
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i], b = claims[j];
      if (a.subject !== b.subject || a.noteId === b.noteId) continue;
      const sharedThemes = a.themes.filter(t => b.themes.includes(t));
      const sharedWords = overlapKeywords(a.text, b.text);
      const sharedMetadata = sharedMetadataCount(a, b);
      const topicFamilies = sharedTopicFamilies(a, b);
      const topicScore = topicScoreForFamilies(topicFamilies);
      const legacyRelated = Boolean(sharedThemes.length || sharedWords >= 2 || sharedMetadata > 0);
      const related = legacyRelated || topicScore > 0;
      if (!related) continue;
      const baseScore = sharedWords + sharedMetadata;
      candidates.push({
        a,
        b,
        sharedWords,
        sharedMetadata,
        sharedTopicFamilies: topicFamilies,
        topicScore,
        classificationScore: legacyRelated ? baseScore : baseScore + topicScore
      });
    }
  }
  return candidates;
}

function sharedMetadataCount(a: Claim, b: Claim): number {
  const aMetadata = metadataForClaim(a);
  const bMetadata = metadataForClaim(b);
  return [
    [aMetadata.tickers, bMetadata.tickers],
    [aMetadata.industries, bMetadata.industries],
    [aMetadata.kpis, bMetadata.kpis],
    [aMetadata.watchlistTags, bMetadata.watchlistTags]
  ].reduce((count, [left, right]) => count + intersectionCount(left, right), 0);
}
