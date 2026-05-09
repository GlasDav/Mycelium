import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_GUIDE_STORAGE_KEY,
  clearDemoGuideDismissal,
  demoGuideSteps,
  dismissDemoGuide,
  isDemoGuideDismissed,
  type DemoGuideStorage
} from '../src/demo-guide';

const expectedStepIds = [
  'capture-note',
  'inspect-extraction',
  'review-claims',
  'open-map',
  'open-archive'
];

function createMemoryStorage(): DemoGuideStorage {
  const values = new Map<string, string>();

  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: key => {
      values.delete(key);
    }
  };
}

test('uses the stable demo guide storage key', () => {
  assert.equal(DEMO_GUIDE_STORAGE_KEY, 'mycelium.demoGuide.dismissed.v1');
});

test('exposes the five first-run demo guide steps in order', () => {
  assert.deepEqual(demoGuideSteps.map(step => step.id), expectedStepIds);
});

test('each first-run demo guide step has required copy and target view mode', () => {
  for (const step of demoGuideSteps) {
    assert.notEqual(step.title.trim(), '');
    assert.notEqual(step.body.trim(), '');
    assert.notEqual(step.actionLabel.trim(), '');
  }

  assert.deepEqual(demoGuideSteps.map(step => step.targetViewMode), [
    'review',
    'review',
    'review',
    'map',
    'archive'
  ]);
});

test('storage helpers treat missing or unavailable storage as not dismissed', () => {
  assert.equal(isDemoGuideDismissed(), false);
  assert.equal(isDemoGuideDismissed(null), false);
  assert.doesNotThrow(() => dismissDemoGuide(null));
  assert.doesNotThrow(() => clearDemoGuideDismissal(null));

  const unavailableStorage: DemoGuideStorage = {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('storage unavailable');
    },
    removeItem: () => {
      throw new Error('storage unavailable');
    }
  };

  assert.equal(isDemoGuideDismissed(unavailableStorage), false);
  assert.doesNotThrow(() => dismissDemoGuide(unavailableStorage));
  assert.doesNotThrow(() => clearDemoGuideDismissal(unavailableStorage));
});

test('storage helpers persist and clear dismissal state', () => {
  const storage = createMemoryStorage();

  assert.equal(isDemoGuideDismissed(storage), false);

  dismissDemoGuide(storage);

  assert.equal(storage.getItem(DEMO_GUIDE_STORAGE_KEY), 'true');
  assert.equal(isDemoGuideDismissed(storage), true);

  clearDemoGuideDismissal(storage);

  assert.equal(storage.getItem(DEMO_GUIDE_STORAGE_KEY), null);
  assert.equal(isDemoGuideDismissed(storage), false);
});
