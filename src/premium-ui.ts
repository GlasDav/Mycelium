import type { AccessScope, Freshness, RelationType, Role } from './engine';
import {
  findIndustry,
  findIssuer,
  findSecurity,
  findWatchlist,
  industriesForKeys,
  issuerForSecurity,
  securityForIssuer
} from './ontology';

export type PremiumViewMode = 'notes' | 'dashboard' | 'map' | 'archive' | 'admin';

export interface SaveStatusInput {
  saving?: boolean;
  error?: string;
  readOnly?: boolean;
  dirty?: boolean;
  draftRecovered?: boolean;
  lastSavedAt?: string;
}

export type ContextStatusTone = 'ready' | 'saving' | 'attention' | 'readonly' | 'dirty' | 'info';

export interface ContextHeaderModel {
  pageLabel: string;
  workspaceLabel: string;
  noteLabel: string;
  scopeLabel: string;
  asOfLabel: string;
  statusLabel: string;
  statusTone: ContextStatusTone;
  badges: string[];
}

export interface ContextHeaderInput extends SaveStatusInput {
  viewMode: PremiumViewMode;
  userRole?: Role | string;
  teamName?: string;
  selectedNoteTitle?: string;
  accessScope?: AccessScope;
  mapAsOf?: string;
  latestAsOf?: string;
}

export type CommandItemId =
  | 'save-note'
  | 'new-note'
  | 'import-note'
  | 'focus-editor'
  | 'open-history'
  | 'open-notes'
  | 'open-dashboard'
  | 'open-map'
  | 'open-archive'
  | 'clear-filters'
  | 'open-admin';

export interface CommandItem {
  id: CommandItemId;
  section: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
}

export interface PremiumCommandContext {
  viewMode: PremiumViewMode;
  canSaveNote: boolean;
  canOpenHistory: boolean;
  canUseAdmin: boolean;
  hasNoteFilters: boolean;
  hasMapFilters: boolean;
  noteImportOpen: boolean;
  selectedNoteTitle?: string;
}

export type MetadataTokenKind = 'company' | 'security' | 'industry' | 'theme' | 'kpi' | 'watchlist' | 'source_person';

export interface MetadataTokenOption {
  value: string;
  label: string;
  detail: string;
}

export interface MetadataTokenOptionsInput {
  kind: MetadataTokenKind;
  values?: string[];
  options?: string[];
}

export type DashboardDrilldownKind =
  | 'metric-notes'
  | 'metric-claims'
  | 'metric-relations'
  | 'metric-signals'
  | 'relation-type'
  | 'freshness'
  | 'company'
  | 'security'
  | 'industry'
  | 'theme'
  | 'watchlist'
  | 'kpi'
  | 'source-person';

export interface DashboardDrilldown {
  viewMode: Extract<PremiumViewMode, 'notes' | 'map' | 'archive'>;
  selected?: string;
  noteFilters?: {
    security?: string;
    industry?: string;
    theme?: string;
    watchlist?: string;
    kpi?: string;
    sourcePerson?: string;
  };
  mapFilters?: {
    security?: string;
    industryOrTheme?: string;
    relationType?: RelationType | '';
    freshness?: Freshness | '';
    sourcePerson?: string;
  };
}

const pageLabels: Record<PremiumViewMode, string> = {
  notes: 'Notes',
  dashboard: 'Research dashboard',
  map: 'Relationship map',
  archive: 'Archive',
  admin: 'Organisation admin'
};

const pageHeadings: Record<PremiumViewMode, string> = {
  notes: 'Untitled note',
  dashboard: 'Dashboard',
  map: 'Relationship map',
  archive: 'Note archive',
  admin: 'Organisation admin'
};

const scopeLabels: Record<AccessScope, string> = {
  personal: 'Personal',
  team: 'Team',
  organization: 'Organisation'
};

export function buildContextHeaderModel(input: ContextHeaderInput): ContextHeaderModel {
  const scopeLabel = input.accessScope ? scopeLabels[input.accessScope] : '';
  const asOfLabel = input.mapAsOf ? `As of ${input.mapAsOf}` : '';
  const statusLabel = saveStatusLabel(input);
  const noteTitle = input.selectedNoteTitle?.trim();
  const badges = [
    scopeLabel,
    input.viewMode === 'map' && input.mapAsOf && input.latestAsOf
      ? input.mapAsOf === input.latestAsOf ? 'Current' : 'Historical'
      : '',
    input.readOnly ? 'Read only' : ''
  ].filter(Boolean);

  return {
    pageLabel: pageLabels[input.viewMode],
    workspaceLabel: workspaceLabel(input.userRole, input.teamName),
    noteLabel: input.viewMode === 'notes' ? noteTitle || pageHeadings.notes : pageHeadings[input.viewMode],
    scopeLabel,
    asOfLabel,
    statusLabel,
    statusTone: statusToneFor(input, statusLabel),
    badges
  };
}

export function saveStatusLabel(input: SaveStatusInput): string {
  if (input.saving) return 'Saving...';
  if (input.error?.trim()) return 'Needs attention';
  if (input.readOnly) return 'Read only';
  if (input.dirty) return 'Unsaved changes';
  if (input.draftRecovered) return 'Draft recovered';
  if (input.lastSavedAt?.trim()) return savedAtLabel(input.lastSavedAt);
  return 'Ready';
}

export function buildCommandItems(context: PremiumCommandContext): CommandItem[] {
  const noteTitle = context.selectedNoteTitle?.trim();
  const items: CommandItem[] = [
    {
      id: 'save-note',
      section: 'Notes',
      label: noteTitle ? `Save ${noteTitle}` : 'Save note',
      shortcut: 'Ctrl+Enter',
      disabled: !context.canSaveNote
    },
    {
      id: 'new-note',
      section: 'Notes',
      label: 'New note'
    },
    {
      id: 'import-note',
      section: 'Notes',
      label: context.noteImportOpen ? 'Close import panel' : 'Open import panel'
    },
    {
      id: 'focus-editor',
      section: 'Notes',
      label: 'Focus editor'
    },
    {
      id: 'open-history',
      section: 'Notes',
      label: noteTitle ? `Open history for ${noteTitle}` : 'Open note history',
      disabled: !context.canOpenHistory
    },
    {
      id: 'open-notes',
      section: 'Navigate',
      label: 'Open notes',
      disabled: context.viewMode === 'notes'
    },
    {
      id: 'open-dashboard',
      section: 'Navigate',
      label: 'Open dashboard',
      disabled: context.viewMode === 'dashboard'
    },
    {
      id: 'open-map',
      section: 'Navigate',
      label: 'Open map',
      disabled: context.viewMode === 'map'
    },
    {
      id: 'open-archive',
      section: 'Navigate',
      label: 'Open archive',
      disabled: context.viewMode === 'archive'
    }
  ];

  if (context.hasNoteFilters || context.hasMapFilters) {
    items.push({
      id: 'clear-filters',
      section: 'Workspace',
      label: 'Clear filters'
    });
  }

  if (context.canUseAdmin) {
    items.push({
      id: 'open-admin',
      section: 'Navigate',
      label: 'Open organisation admin',
      disabled: context.viewMode === 'admin'
    });
  }

  return items;
}

export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  const parts = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!parts.length) return items;
  return items.filter(item => {
    const haystack = normalizeSearchText(`${item.label} ${item.section} ${item.shortcut ?? ''}`);
    return parts.every(part => haystack.includes(part));
  });
}

export function buildMetadataTokenOptions(input: MetadataTokenOptionsInput): MetadataTokenOption[] {
  const seen = new Set<string>();
  const result: MetadataTokenOption[] = [];

  for (const rawValue of [...(input.values ?? []), ...(input.options ?? [])]) {
    const option = metadataTokenOption(input.kind, rawValue);
    if (!option) continue;
    const key = `${input.kind}:${option.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }

  return result;
}

export function buildDashboardDrilldown(kind: DashboardDrilldownKind, value: string): DashboardDrilldown {
  if (kind === 'metric-notes' || kind === 'metric-claims') return { viewMode: 'archive' };
  if (kind === 'metric-relations' || kind === 'metric-signals') return { viewMode: 'map' };
  if (kind === 'relation-type') return { viewMode: 'map', mapFilters: { relationType: value as RelationType } };
  if (kind === 'freshness') return { viewMode: 'map', mapFilters: { freshness: value as Freshness } };
  if (kind === 'company') return { viewMode: 'map', selected: value };
  if (kind === 'security') return { viewMode: 'map', mapFilters: { security: value } };
  if (kind === 'industry') return { viewMode: 'archive', noteFilters: { industry: value }, mapFilters: { industryOrTheme: value } };
  if (kind === 'theme') return { viewMode: 'archive', noteFilters: { theme: value }, mapFilters: { industryOrTheme: value } };
  if (kind === 'watchlist') return { viewMode: 'archive', noteFilters: { watchlist: value } };
  if (kind === 'kpi') return { viewMode: 'archive', noteFilters: { kpi: value } };
  return { viewMode: 'archive', noteFilters: { sourcePerson: value }, mapFilters: { sourcePerson: value } };
}

function workspaceLabel(role?: Role | string, teamName?: string): string {
  const roleLabel = role?.trim();
  const teamLabel = teamName?.trim();
  if (roleLabel && teamLabel) return `${roleLabel} / ${teamLabel}`;
  return roleLabel || teamLabel || 'Workspace';
}

function statusToneFor(input: SaveStatusInput, label: string): ContextStatusTone {
  if (input.saving) return 'saving';
  if (input.error?.trim()) return 'attention';
  if (input.readOnly) return 'readonly';
  if (input.dirty) return 'dirty';
  if (label === 'Draft recovered') return 'info';
  return 'ready';
}

function savedAtLabel(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match ? `Saved ${match[1]}` : 'Saved';
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function metadataTokenOption(kind: MetadataTokenKind, rawValue: string): MetadataTokenOption | undefined {
  const value = rawValue.trim();
  if (!value) return undefined;

  if (kind === 'security') {
    const security = findSecurity(value);
    if (security) {
      return {
        value: security.ticker,
        label: security.ticker,
        detail: issuerForSecurity(security)?.name ?? `${security.exchange} security`
      };
    }
    return { value, label: value, detail: 'Manual security' };
  }

  if (kind === 'company') {
    const issuer = findIssuer(value);
    if (issuer) {
      return {
        value: issuer.name,
        label: issuer.name,
        detail: securityForIssuer(issuer)?.ticker ?? 'Company'
      };
    }
    return { value, label: value, detail: 'Manual company' };
  }

  if (kind === 'industry') {
    const industry = findIndustry(value);
    if (industry) {
      const hierarchy = industriesForKeys([industry.key]);
      const parent = hierarchy.length > 1 ? hierarchy[hierarchy.length - 2] : undefined;
      return {
        value: industry.name,
        label: industry.name,
        detail: parent?.name ?? 'Industry'
      };
    }
    return { value, label: value, detail: 'Manual industry' };
  }

  if (kind === 'watchlist') {
    const watchlist = findWatchlist(value);
    if (watchlist) {
      const issuers = watchlist.issuerKeys.map(key => findIssuer(key)?.name).filter(Boolean);
      return {
        value: watchlist.name,
        label: watchlist.name,
        detail: issuers.length ? issuers.join(', ') : 'Watchlist'
      };
    }
    return { value, label: value, detail: 'Manual watchlist' };
  }

  return {
    value,
    label: value,
    detail: `Manual ${kind.replace('_', ' ')}`
  };
}
