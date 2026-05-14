import test from 'node:test';
import assert from 'node:assert/strict';
import {
  legacyArraysToLinkedEntities,
  linkedEntity,
  metadataArraysFromLinkedEntities,
  normalizeLinkedEntities
} from '../src/entity-links';

test('security aliases resolve to canonical ticker identifiers', () => {
  const [fromTicker] = legacyArraysToLinkedEntities({ tickers: ['nvda us'] });
  const [fromCompanyAlias] = legacyArraysToLinkedEntities({ tickers: ['NVIDIA Corporation'] });

  assert.equal(fromTicker.name, 'NVDA');
  assert.equal(fromTicker.key, 'nvda');
  assert.deepEqual(fromTicker.externalIds, {
    ticker: 'NVDA',
    exchange: 'NASDAQ',
    issuerKey: 'nvidia'
  });
  assert(fromTicker.aliases?.includes('NVIDIA Corporation'));

  assert.equal(fromCompanyAlias.name, 'NVDA');
  assert.equal(fromCompanyAlias.key, 'nvda');
});

test('canonical securities derive issuer, industry hierarchy, and default watchlist metadata', () => {
  const metadata = metadataArraysFromLinkedEntities([
    linkedEntity('security', 'security', 'NVDA')
  ]);

  assert.deepEqual(metadata.tickers, ['NVDA']);
  assert.deepEqual(metadata.companyTags, ['Nvidia']);
  assert.deepEqual(metadata.industries, ['Information Technology', 'Semiconductors']);
  assert.deepEqual(metadata.watchlistTags, ['AI Capex']);
});

test('industry aliases resolve to canonical industry and parent sector metadata', () => {
  const [industry] = legacyArraysToLinkedEntities({ industries: ['semis'] });
  const metadata = metadataArraysFromLinkedEntities([industry]);

  assert.equal(industry.name, 'Semiconductors');
  assert.equal(industry.key, 'semiconductors');
  assert.deepEqual(industry.externalIds, {
    industryKey: 'semiconductors',
    sectorKey: 'information-technology'
  });
  assert.deepEqual(metadata.industries, ['Information Technology', 'Semiconductors']);
});

test('canonical normalization deduplicates aliases that refer to the same security', () => {
  const entities = normalizeLinkedEntities([
    linkedEntity('security', 'security', 'NVDA'),
    linkedEntity('security', 'security', 'NVIDIA Corporation'),
    linkedEntity('security', 'security', 'nvda us')
  ]);

  assert.equal(entities.length, 1);
  assert.equal(entities[0].name, 'NVDA');
  assert.equal(entities[0].externalIds?.issuerKey, 'nvidia');
});
