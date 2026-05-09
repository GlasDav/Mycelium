export const DEMO_GUIDE_STORAGE_KEY = 'mycelium.demoGuide.dismissed.v1';

export type DemoGuideStepId =
  | 'capture-note'
  | 'inspect-extraction'
  | 'review-claims'
  | 'open-map'
  | 'open-archive';

export type DemoGuideTargetViewMode = 'review' | 'map' | 'archive';

export type DemoGuideStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type DemoGuideStep = {
  id: DemoGuideStepId;
  title: string;
  body: string;
  actionLabel: string;
  targetViewMode: DemoGuideTargetViewMode;
};

export const demoGuideSteps: DemoGuideStep[] = [
  {
    id: 'capture-note',
    title: 'Capture a research note',
    body: 'Start in review by writing or pasting an analyst note with observed date, visibility, and linked metadata.',
    actionLabel: 'Capture note',
    targetViewMode: 'review'
  },
  {
    id: 'inspect-extraction',
    title: 'Inspect extracted intelligence',
    body: 'Review the live entities, claims, KPIs, source people, and linked securities inferred from the note.',
    actionLabel: 'Inspect extraction',
    targetViewMode: 'review'
  },
  {
    id: 'review-claims',
    title: 'Review the claim graph',
    body: 'Approve, reject, or edit claims so only trusted evidence enters the temporal relationship graph.',
    actionLabel: 'Review claims',
    targetViewMode: 'review'
  },
  {
    id: 'open-map',
    title: 'Open the relationship map',
    body: 'Move to the map to inspect contradictions, reversals, corroboration, stale evidence, and supporting citations.',
    actionLabel: 'Open map',
    targetViewMode: 'map'
  },
  {
    id: 'open-archive',
    title: 'Open the note archive',
    body: 'Use the archive to find visible notes, filter by linked metadata, and return to prior research context.',
    actionLabel: 'Open archive',
    targetViewMode: 'archive'
  }
];

export function isDemoGuideDismissed(storage?: DemoGuideStorage | null): boolean {
  if (!storage) return false;

  try {
    return storage.getItem(DEMO_GUIDE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissDemoGuide(storage?: DemoGuideStorage | null): void {
  if (!storage) return;

  try {
    storage.setItem(DEMO_GUIDE_STORAGE_KEY, 'true');
  } catch {
    return;
  }
}

export function clearDemoGuideDismissal(storage?: DemoGuideStorage | null): void {
  if (!storage) return;

  try {
    storage.removeItem(DEMO_GUIDE_STORAGE_KEY);
  } catch {
    return;
  }
}
