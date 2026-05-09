export type EmptyStateActionTarget = 'capture' | 'clear-filters' | 'map' | 'archive';

export type EmptyStateAction = {
  label: string;
  target: EmptyStateActionTarget;
};

export type EmptyStateId =
  | 'no-workspace-notes'
  | 'no-filtered-notes'
  | 'no-graph'
  | 'no-review-claims'
  | 'no-relations'
  | 'no-filtered-relations'
  | 'no-source-person-history';

export type EmptyStateCopy = {
  id: EmptyStateId;
  title: string;
  body: string;
  actions: EmptyStateAction[];
};

export type NoteEmptyStateInput = {
  hasWorkspaceNotes: boolean;
  hasActiveFilters: boolean;
};

export type RelationEmptyStateInput = {
  hasRelations: boolean;
  hasActiveFilters: boolean;
};

export const emptyStates: Record<EmptyStateId, EmptyStateCopy> = {
  'no-workspace-notes': {
    id: 'no-workspace-notes',
    title: 'No notes yet',
    body: 'Capture the first note to start the workspace memory and give Mycelium evidence to extract.',
    actions: [{ label: 'Capture first note', target: 'capture' }]
  },
  'no-filtered-notes': {
    id: 'no-filtered-notes',
    title: 'No notes match these filters',
    body: 'Clear the archive or sidebar filters to return to the visible note set.',
    actions: [{ label: 'Clear filters', target: 'clear-filters' }]
  },
  'no-graph': {
    id: 'no-graph',
    title: 'No company view yet',
    body: 'The first note creates the company view by giving the graph subjects, claims, and evidence to connect.',
    actions: [{ label: 'Capture first note', target: 'capture' }]
  },
  'no-review-claims': {
    id: 'no-review-claims',
    title: 'No claims to review',
    body: 'Capture a note and run extraction so extracted claims can appear here for analyst review.',
    actions: [{ label: 'Capture note', target: 'capture' }]
  },
  'no-relations': {
    id: 'no-relations',
    title: 'No relationships yet',
    body: 'Capture notes and review extracted claims to give relation detection comparable evidence.',
    actions: [{ label: 'Capture note', target: 'capture' }]
  },
  'no-filtered-relations': {
    id: 'no-filtered-relations',
    title: 'No relations match these filters',
    body: 'Clear the map filters to broaden the relationship set.',
    actions: [{ label: 'Clear filters', target: 'clear-filters' }]
  },
  'no-source-person-history': {
    id: 'no-source-person-history',
    title: 'No source-person history',
    body: 'Add participants and source people to notes or reviewed claims to build a person-level history.',
    actions: [{ label: 'Add participants', target: 'capture' }]
  }
};

export function emptyStateForNotes(input: NoteEmptyStateInput): EmptyStateCopy {
  if (input.hasWorkspaceNotes && input.hasActiveFilters) {
    return emptyStates['no-filtered-notes'];
  }

  return emptyStates['no-workspace-notes'];
}

export function emptyStateForRelations(input: RelationEmptyStateInput): EmptyStateCopy {
  if (input.hasRelations && input.hasActiveFilters) {
    return emptyStates['no-filtered-relations'];
  }

  return emptyStates['no-relations'];
}
