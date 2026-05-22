import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import TurndownService from 'turndown';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  BarChart3,
  BookOpen,
  Bold,
  Building2,
  CaseLower,
  CaseUpper,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardPaste,
  Edit3,
  Eye,
  FilePlus2,
  GitBranch,
  Gauge,
  Heading1,
  Heading2,
  Heading3,
  History,
  Italic,
  KeyRound,
  Layers3,
  List,
  ListFilter,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  LockKeyhole,
  LogIn,
  LogOut,
  Network,
  PanelLeft,
  Plus,
  Quote,
  Radar,
  Redo2,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Underline,
  Undo2,
  Workflow,
  UsersRound,
  X,
  XCircle
} from 'lucide-react';
import {
  createAuthClient,
  archiveAdminTeam,
  cancelAdminInvite,
  createAudioImportJob,
  createAdminInvite,
  createAdminTeam,
  createNote,
  deleteNoteDraft,
  loadAuthBootstrap,
  loadAdminOrganization,
  loadDashboard,
  loadNoteDraft,
  loadNoteHistory,
  loadWorkspace,
  updateClaim,
  replaceAdminMemberTeams,
  updateAdminMember,
  updateAdminTeam,
  updateNote,
  updateRelation,
  upsertNoteDraft
} from './api';
import {
  companyLexicon,
  detectEntities,
  extractClaims,
  kpiWords,
  relationLabel,
  themeLexicon,
  accessScopeFromVisibility,
  visibilityFromAccessScope,
  type Claim,
  type AccessScope,
  type Direction,
  type Entity,
  type Horizon,
  type Note,
  type OrgRole,
  type Role,
  type RelationType
} from './engine';
import {
  deriveNoteFilterOptions,
  filterAndSortNotes,
  normalizeTags,
  noteRecencyDate,
  type NoteFilterOptions,
  type NoteFilters,
  type NoteSort
} from './note-filters';
import { slashMarkdownCommands, type MarkdownCommand, type SlashMarkdownCommand } from './markdown-tools';
import { parsePastedNoteImport, type ParsedNoteImport } from './note-import';
import { NOTE_IMPORT_FILE_ACCEPT, AUDIO_IMPORT_FILE_ACCEPT, readNoteImportFile, summarizeAudioImportFile } from './note-import-files';
import { normalizeReadyAudioTranscriptionJob } from './audio-transcription';
import {
  buildMapLaneModel,
  mapDensityLimits,
  relationWindowStatuses,
  type MapDensity,
  type UiWindowStatus
} from './map-layout';
import {
  buildCommandItems,
  buildContextHeaderModel,
  buildDashboardDrilldown,
  buildMetadataTokenOptions,
  type CommandItem,
  type DashboardDrilldownKind
} from './premium-ui';
import { CommandPalette, ContextHeader, StatusToastStack, type StatusToast } from './premium-shell';
import type {
  ClaimReviewStatus,
  AdminOrganizationSnapshot,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  DashboardTopItem,
  AudioImportJob,
  OrganizationTeam,
  NoteDraft,
  NoteRevision,
  TranscriptChunkRecord,
  UpdateClaimInput,
  UpdateRelationInput,
  WorkspaceClaim,
  WorkspaceNote,
  WorkspaceRelation,
  WorkspaceSnapshot
} from '../server/workspace-service';
import {
  legacyArraysToLinkedEntities,
  metadataArraysFromLinkedEntities,
  mergeLinkedEntities,
  type EntityRole,
  type LinkedEntity,
  type MetadataArrays
} from './entity-links';
import {
  emptyStateForNotes,
  emptyStateForRelations,
  emptyStates,
  type EmptyStateActionTarget,
  type EmptyStateCopy
} from './empty-states';
import './styles.css';

const relationTypes: RelationType[] = ['contradiction', 'update_or_trend_reversal', 'historical_tension', 'open_tension', 'corroboration', 'agreement', 'stale_evidence'];
type RichMarkdownCommand = MarkdownCommand | 'undo' | 'redo';
type SourcePersonContext = 'same_source_person' | 'different_source_people' | 'unknown';
type PreviewEntityKind = Entity['kind'] | 'industry' | 'watchlist' | 'source_person';
type PreviewEntity = { name: string; kind: PreviewEntityKind; ticker?: string };
type FrontendMetadata = Partial<MetadataArrays> & { linkedEntities?: LinkedEntity[] };
type NoteImportWarningForUi = string | { message: string };
type ParsedNoteImportForUi = ParsedNoteImport & {
  warnings: NoteImportWarningForUi[];
};
type FrontendWorkspaceNote = WorkspaceNote & FrontendMetadata;
type FrontendWorkspaceClaim = WorkspaceClaim & FrontendMetadata;
type FrontendWorkspaceRelation = Omit<WorkspaceRelation, 'a' | 'b'> & {
  a: FrontendWorkspaceClaim;
  b: FrontendWorkspaceClaim;
  sourcePersonContext?: SourcePersonContext;
};
interface PersonMemorySummary {
  name: string;
  claimCount: number;
  latestObservedAt?: string;
  latestDirection?: Direction;
  positiveCount?: number;
  negativeCount?: number;
  neutralCount?: number;
  contradictionCount?: number;
  trendReversalCount?: number;
  subjects?: string[];
  latestClaims?: FrontendWorkspaceClaim[];
}
interface FrontendWorkspaceSnapshot extends Omit<WorkspaceSnapshot, 'visibleNotes' | 'claims' | 'relations' | 'people'> {
  visibleNotes: FrontendWorkspaceNote[];
  claims: FrontendWorkspaceClaim[];
  relations: FrontendWorkspaceRelation[];
  people: PersonMemorySummary[];
}

declare global {
  interface Window {
    __myceliumRoot?: Root;
  }
}

type FrontendNoteDraft = NoteDraft & FrontendMetadata;
type FrontendNotePayload = {
  title?: string;
  body: string;
  accessScope: AccessScope;
  teamId?: string;
  visibility?: Note['visibility'];
  observedAt?: string;
  sourceType?: string;
  audioImportJobId?: string;
} & MetadataArrays & { linkedEntities: LinkedEntity[] };
type FrontendDraftPayload = Partial<FrontendNotePayload> & { selectedNoteId?: string };
type FrontendUpdateClaimInput = UpdateClaimInput & FrontendMetadata;
type FrontendNoteFilters = NoteFilters & {
  industry?: string;
  watchlist?: string;
  sourcePerson?: string;
};
interface FrontendNoteFilterOptions extends NoteFilterOptions {
  industries: string[];
  watchlists: string[];
  sourcePeople: string[];
}
interface MapFilters {
  security?: string;
  industryOrTheme?: string;
  relationType?: RelationType | '';
  freshness?: '' | 'fresh' | 'aging' | 'stale';
  sourcePerson?: string;
  authorId?: string;
  team?: string;
}
type SelectOption = string | { value: string; label: string };
const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'span'],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['data-size', 'small', 'large'],
      ['dataSize', 'small', 'large']
    ]
  }
};
const turndownService = new TurndownService({ bulletListMarker: '-', headingStyle: 'atx' });
turndownService.addRule('underline', {
  filter: ['u'],
  replacement: content => `<u>${content}</u>`
});
turndownService.addRule('fontSizeSpan', {
  filter: node => node.nodeName === 'SPAN' && (node as HTMLElement).hasAttribute('data-size'),
  replacement: (content, node) => `<span data-size="${(node as HTMLElement).getAttribute('data-size')}">${content}</span>`
});

type ViewMode = 'notes' | 'dashboard' | 'map' | 'archive' | 'admin';
const DEFAULT_NOTE_SOURCE_TYPE = 'Typed note';
const IMPORTED_NOTE_SOURCE_TYPE = 'Meeting transcript';

function App() {
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [mapWorkspace, setMapWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [mapAsOf, setMapAsOf] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [mapDensity, setMapDensity] = useState<MapDensity>('medium');
  const [authError, setAuthError] = useState('');
  const [appError, setAppError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('Nvidia');
  const [noteTitle, setNoteTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [accessScope, setAccessScope] = useState<AccessScope>('personal');
  const [noteTeamId, setNoteTeamId] = useState('');
  const [observedAt, setObservedAt] = useState(today());
  const [noteSourceType, setNoteSourceType] = useState(DEFAULT_NOTE_SOURCE_TYPE);
  const [noteImportOpen, setNoteImportOpen] = useState(false);
  const [noteImportText, setNoteImportText] = useState('');
  const [parsedFileNoteImport, setParsedFileNoteImport] = useState<ParsedNoteImport | null>(null);
  const [parsedAudioNoteImport, setParsedAudioNoteImport] = useState<ParsedNoteImport | null>(null);
  const [noteImportFileError, setNoteImportFileError] = useState('');
  const [audioImportSummary, setAudioImportSummary] = useState<ReturnType<typeof summarizeAudioImportFile> | null>(null);
  const [audioImportConsent, setAudioImportConsent] = useState(false);
  const [audioImportLoading, setAudioImportLoading] = useState(false);
  const [audioImportJobId, setAudioImportJobId] = useState('');
  const [workbenchAudioImportJobId, setWorkbenchAudioImportJobId] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>('workspace');
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('90d');
  const [dashboardTeamId, setDashboardTeamId] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [adminSnapshot, setAdminSnapshot] = useState<AdminOrganizationSnapshot | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);
  const [manualThemes, setManualThemes] = useState<string[]>([]);
  const [kpis, setKpis] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [companyTags, setCompanyTags] = useState<string[]>([]);
  const [watchlistTags, setWatchlistTags] = useState<string[]>([]);
  const [sourcePeople, setSourcePeople] = useState<string[]>([]);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [noteFiltersCollapsed, setNoteFiltersCollapsed] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [noteFilters, setNoteFilters] = useState<FrontendNoteFilters>({ sort: 'newest' });
  const [mapFilters, setMapFilters] = useState<MapFilters>({});
  const [noteHistory, setNoteHistory] = useState<NoteRevision[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [editorFocusSignal, setEditorFocusSignal] = useState(0);
  const [workbenchSaving, setWorkbenchSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [toasts, setToasts] = useState<StatusToast[]>([]);
  const clearedDraftSignatureRef = useRef('');
  const workbenchBaselineSignatureRef = useRef('');
  const previousWorkspaceAsOfRef = useRef('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function boot() {
      try {
        const config = await loadAuthBootstrap();
        if (!active) return;
        const client = createAuthClient(config);
        setAuthClient(client);
        const current = await client.auth.getSession();
        if (!active) return;
        const currentSession = current.data.session;
        setSession(currentSession);
        if (currentSession) {
          const next = await refreshWorkspace(currentSession);
          if (next) await restoreNoteDraft(currentSession, next);
        }
        const subscription = client.auth.onAuthStateChange(async (_event, nextSession) => {
          setSession(nextSession);
          if (nextSession) {
            const next = await refreshWorkspace(nextSession);
            if (next) await restoreNoteDraft(nextSession, next);
          } else {
            setWorkspace(null);
            setMapWorkspace(null);
            setMapAsOf('');
            setMapError('');
            setDashboard(null);
            setAdminSnapshot(null);
          }
        });
        unsubscribe = () => subscription.data.subscription.unsubscribe();
      } catch (error) {
        setAppError(error instanceof Error ? error.message : String(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    boot();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function refreshWorkspace(nextSession = session): Promise<WorkspaceSnapshot | undefined> {
    if (!nextSession) return undefined;
    setAppError('');
    const next = await loadWorkspace(nextSession);
    setWorkspace(next);
    const subjects = [...next.companies, ...next.themes];
    if (subjects.length && !subjects.some(subject => subject.subject === selected)) {
      setSelected(subjects[0].subject);
    }
    return next;
  }

  async function refreshDashboard(nextSession = session): Promise<DashboardSnapshot | undefined> {
    if (!nextSession) return undefined;
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const next = await loadDashboard(nextSession, {
        scope: dashboardScope,
        range: dashboardRange,
        teamId: dashboardScope === 'team' ? dashboardTeamId || undefined : undefined
      });
      setDashboard(normalizeDashboardSnapshot(next));
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDashboardError(message);
      return undefined;
    } finally {
      setDashboardLoading(false);
    }
  }

  async function refreshAdmin(nextSession = session): Promise<AdminOrganizationSnapshot | undefined> {
    if (!nextSession) return undefined;
    setAdminLoading(true);
    setAdminError('');
    try {
      const next = await loadAdminOrganization(nextSession);
      setAdminSnapshot(next);
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAdminError(message);
      return undefined;
    } finally {
      setAdminLoading(false);
    }
  }

  async function refreshMapWorkspace(nextWorkspace: WorkspaceSnapshot, targetAsOf = mapAsOf) {
    if (!session || !targetAsOf || targetAsOf === nextWorkspace.asOf) {
      setMapWorkspace(null);
      setMapError('');
      setMapLoading(false);
      return;
    }
    setMapLoading(true);
    try {
      setMapWorkspace(await loadWorkspace(session, { asOf: targetAsOf }));
      setMapError('');
    } catch (error) {
      setMapWorkspace(null);
      setMapError(error instanceof Error ? error.message : String(error));
    } finally {
      setMapLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    void refreshDashboard(session);
  }, [session, dashboardScope, dashboardRange, dashboardTeamId]);

  useEffect(() => {
    if (!session || viewMode !== 'admin' || workspace?.viewer.orgRole !== 'admin') return;
    void refreshAdmin(session);
  }, [session, viewMode, workspace?.viewer.orgRole]);

  const parsedNoteImport = useMemo(() => parsePastedNoteImport(noteImportText), [noteImportText]);

  useEffect(() => {
    if (!workspace) return;
    const previousAsOf = previousWorkspaceAsOfRef.current;
    previousWorkspaceAsOfRef.current = workspace.asOf;
    setMapAsOf(current => {
      if (!current || current === previousAsOf || current > workspace.asOf) return workspace.asOf;
      return current;
    });
  }, [workspace?.asOf]);

  useEffect(() => {
    if (!session || !workspace || !mapAsOf) return;
    let active = true;
    if (mapAsOf === workspace.asOf) {
      setMapWorkspace(null);
      setMapError('');
      setMapLoading(false);
      return;
    }
    setMapLoading(true);
    setMapError('');
    loadWorkspace(session, { asOf: mapAsOf })
      .then(next => {
        if (active) setMapWorkspace(next);
      })
      .catch(error => {
        if (!active) return;
        setMapWorkspace(null);
        setMapError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setMapLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, workspace?.asOf, mapAsOf]);

  function currentMetadataArrays(): MetadataArrays {
    return {
      tickers,
      manualThemes,
      kpis,
      industries,
      companyTags,
      watchlistTags,
      sourcePeople
    };
  }

  function currentLinkedEntities(): LinkedEntity[] {
    return legacyArraysToLinkedEntities(currentMetadataArrays());
  }

  function applyWorkbenchMetadata(source: FrontendMetadata) {
    const metadata = metadataArraysFromSource(source);
    setTickers(metadata.tickers);
    setManualThemes(metadata.manualThemes);
    setKpis(metadata.kpis);
    setIndustries(metadata.industries);
    setCompanyTags(metadata.companyTags);
    setWatchlistTags(metadata.watchlistTags);
    setSourcePeople(metadata.sourcePeople);
  }

  function resetWorkbenchMetadata() {
    setTickers([]);
    setManualThemes([]);
    setKpis([]);
    setIndustries([]);
    setCompanyTags([]);
    setWatchlistTags([]);
    setSourcePeople([]);
  }

  function focusCapture(options: { focusEditor?: boolean; enableFocusMode?: boolean } = {}) {
    setViewMode('notes');
    if (options.enableFocusMode) setFocusMode(true);
    if (options.focusEditor) setEditorFocusSignal(value => value + 1);
  }

  function clearNoteFilters() {
    setNoteFilters({ sort: 'newest' });
  }

  function clearMapFilters() {
    setMapFilters({});
    if (workspace?.asOf) setMapAsOf(workspace.asOf);
    setMapError('');
  }

  function pushToast(toast: Omit<StatusToast, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts(current => [...current.slice(-2), { id, ...toast }]);
    window.setTimeout(() => {
      setToasts(current => current.filter(item => item.id !== id));
    }, 4200);
  }

  function currentWorkbenchSignature() {
    return draftSignature({
      selectedNoteId: selectedNoteId || undefined,
      title: noteTitle,
      body: draft,
      accessScope,
      teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
      observedAt,
      audioImportJobId: workbenchAudioImportJobId || undefined,
      ...currentMetadataArrays(),
      linkedEntities: currentLinkedEntities()
    });
  }

  async function restoreNoteDraft(nextSession: Session, nextWorkspace: WorkspaceSnapshot) {
    try {
      const savedDraft = await loadNoteDraft(nextSession) as FrontendNoteDraft | null;
      if (!savedDraft || !hasDraftContent(savedDraft)) return;
      const linkedNote = savedDraft.selectedNoteId
        ? nextWorkspace.visibleNotes.find(note => note.id === savedDraft.selectedNoteId)
        : undefined;
      setSelectedNoteId(linkedNote?.id ?? '');
      setNoteTitle(savedDraft.title);
      setDraft(savedDraft.body);
      setAccessScope(savedDraft.accessScope ?? accessScopeFromVisibility(savedDraft.visibility));
      setNoteTeamId(savedDraft.teamId ?? linkedNote?.teamId ?? nextWorkspace.viewer.primaryTeamId ?? nextWorkspace.viewer.teamId ?? '');
      setObservedAt(savedDraft.observedAt ?? today());
      setNoteSourceType(DEFAULT_NOTE_SOURCE_TYPE);
      setWorkbenchAudioImportJobId(savedDraft.audioImportJobId ?? '');
      applyWorkbenchMetadata(savedDraft);
      clearedDraftSignatureRef.current = draftSignature(savedDraft);
      workbenchBaselineSignatureRef.current = draftSignature(savedDraft);
      setDraftRecovered(true);
      pushToast({ tone: 'info', title: 'Draft recovered', body: 'Recovered your latest unsaved workbench draft.' });
      setViewMode('notes');
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    if (!session || !workspace) return;
    const draftInput: FrontendDraftPayload = {
      selectedNoteId: selectedNoteId || undefined,
      title: noteTitle,
      body: draft,
      accessScope,
      teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
      observedAt,
      audioImportJobId: workbenchAudioImportJobId || undefined,
      ...currentMetadataArrays(),
      linkedEntities: currentLinkedEntities()
    };
    if (!hasDraftContent(draftInput)) return;
    const signature = draftSignature(draftInput);
    if (clearedDraftSignatureRef.current === signature) return;

    const handle = window.setTimeout(() => {
      upsertNoteDraft(session, draftInput).catch(error => {
        setAppError(error instanceof Error ? error.message : String(error));
      });
    }, 700);

    return () => window.clearTimeout(handle);
  }, [session, workspace, selectedNoteId, noteTitle, draft, accessScope, noteTeamId, observedAt, workbenchAudioImportJobId, tickers, manualThemes, kpis, industries, companyTags, watchlistTags, sourcePeople]);

  async function saveWorkbenchNote() {
    if (workbenchSaving) return;
    setWorkbenchSaving(true);
    try {
      if (selectedNoteId) {
        await saveExistingNote();
      } else {
        await addNote();
      }
    } finally {
      setWorkbenchSaving(false);
    }
  }

  async function addNote() {
    if (!session || !draft.trim()) return;
    try {
      const input: FrontendNotePayload = {
        title: noteTitle.trim() || undefined,
        body: draft,
        accessScope,
        teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
        sourceType: noteSourceType,
        audioImportJobId: workbenchAudioImportJobId || undefined,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      };
      const next = await createNote(session, input);
      setWorkspace(next);
      await refreshMapWorkspace(next);
      const firstClaim = extractClaims(previewNote())[0];
      if (firstClaim) setSelected(firstClaim.subject);
      setNoteTitle('');
      setDraft('');
      resetWorkbenchMetadata();
      setNoteSourceType(DEFAULT_NOTE_SOURCE_TYPE);
      setWorkbenchAudioImportJobId('');
      setSelectedNoteId('');
      setViewMode('notes');
      clearedDraftSignatureRef.current = '';
      workbenchBaselineSignatureRef.current = '';
      await deleteNoteDraft(session);
      setLastSavedAt(new Date().toISOString());
      setDraftRecovered(false);
      pushToast({ tone: 'success', title: 'Note added', body: 'The graph has been refreshed.' });
      void refreshDashboard(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAppError(message);
      pushToast({ tone: 'error', title: 'Could not add note', body: message });
    }
  }

  async function saveExistingNote() {
    if (!session || !selectedNoteId || !draft.trim()) return;
    const selectedNote = workspace?.visibleNotes.find(note => note.id === selectedNoteId);
    if (selectedNote && selectedNote.authorId !== workspace?.viewer.id) {
      setAppError('Only the note author can edit this note.');
      return;
    }
    try {
      const input: Partial<FrontendNotePayload> = {
        title: noteTitle.trim() || undefined,
        body: draft,
        accessScope,
        teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
        audioImportJobId: workbenchAudioImportJobId || undefined,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      };
      const next = await updateNote(session, selectedNoteId, input);
      setWorkspace(next);
      await refreshMapWorkspace(next);
      clearedDraftSignatureRef.current = draftSignature({
        selectedNoteId,
        title: noteTitle,
        body: draft,
        accessScope,
        teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
        audioImportJobId: workbenchAudioImportJobId || undefined,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      });
      await deleteNoteDraft(session);
      const history = await loadNoteHistory(session, selectedNoteId);
      setNoteHistory(history);
      setHistoryDrawerOpen(false);
      workbenchBaselineSignatureRef.current = currentWorkbenchSignature();
      setLastSavedAt(new Date().toISOString());
      setDraftRecovered(false);
      setWorkbenchAudioImportJobId('');
      pushToast({ tone: 'success', title: 'Note saved', body: 'Review state and map snapshots were refreshed.' });
      void refreshDashboard(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAppError(message);
      pushToast({ tone: 'error', title: 'Could not save note', body: message });
    }
  }

  async function openNoteHistory() {
    if (!session || !selectedNoteId) return;
    try {
      setNoteHistory(await loadNoteHistory(session, selectedNoteId));
      setHistoryDrawerOpen(true);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  async function patchClaim(id: string, input: FrontendUpdateClaimInput) {
    if (!session) return;
    try {
      const next = await updateClaim(session, id, input);
      setWorkspace(next);
      await refreshMapWorkspace(next);
      void refreshDashboard(session);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  async function patchRelation(id: string, input: UpdateRelationInput) {
    if (!session) return;
    try {
      const next = await updateRelation(session, id, input);
      setWorkspace(next);
      await refreshMapWorkspace(next);
      void refreshDashboard(session);
    } catch (error) {
      setMapLoading(false);
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  function previewNote(): Note {
    const viewer = workspace?.viewer;
    return {
      id: 'preview',
      title: noteTitle.trim() || 'Draft preview',
      body: draft,
      authorId: viewer?.id ?? 'preview',
      team: activeTeamMemberships.find(team => team.teamId === effectiveNoteTeamId)?.teamName ?? viewer?.team ?? 'Research',
      teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
      visibility: visibilityFromAccessScope(accessScope),
      accessScope,
      sourceType: noteSourceType,
      createdAt: observedAt || today(),
      observedAt,
      ...currentMetadataArrays(),
      linkedEntities: currentLinkedEntities()
    };
  }

  function startNewNote() {
    const date = today();
    setSelectedNoteId('');
    setNoteTitle('');
    setDraft('');
    setAccessScope('personal');
    setNoteTeamId(workspace?.viewer.primaryTeamId ?? workspace?.viewer.teamId ?? '');
    setObservedAt(date);
    setNoteSourceType(DEFAULT_NOTE_SOURCE_TYPE);
    setWorkbenchAudioImportJobId('');
    resetWorkbenchMetadata();
    setNoteHistory([]);
    setHistoryDrawerOpen(false);
    clearedDraftSignatureRef.current = '';
    workbenchBaselineSignatureRef.current = '';
    setDraftRecovered(false);
    setViewMode('notes');
    if (session) {
      deleteNoteDraft(session).catch(error => {
        setAppError(error instanceof Error ? error.message : String(error));
      });
    }
  }

  async function importNoteFile(file: File | undefined) {
    if (!file) return;
    try {
      const imported = await readNoteImportFile(file);
      setParsedFileNoteImport(imported);
      setParsedAudioNoteImport(null);
      setAudioImportJobId('');
      setNoteImportFileError('');
      setAudioImportSummary(null);
    } catch (error) {
      setParsedFileNoteImport(null);
      setNoteImportFileError(error instanceof Error ? error.message : String(error));
    }
  }

  async function importAudioFile(file: File | undefined) {
    if (!file) return;
    try {
      setAudioImportSummary(summarizeAudioImportFile(file));
      if (!session) throw new Error('Sign in before transcribing audio.');
      if (!audioImportConsent) throw new Error('Confirm consent before transcribing audio.');
      setAudioImportLoading(true);
      setNoteImportFileError('');
      const result = await createAudioImportJob(session, file, {
        consentConfirmed: true,
        accessScope,
        teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
        selectedNoteId: selectedNoteId || undefined,
        language: 'en'
      });
      setAudioImportJobId(result.job.id);
      if (result.job.status !== 'ready') {
        setParsedAudioNoteImport(null);
        setNoteImportFileError(result.job.error ?? 'Audio transcription did not produce a ready transcript.');
        return;
      }
      const parsedAudio = normalizeAudioImportJobForWorkbench(result.job, result.transcriptChunks);
      setParsedAudioNoteImport(parsedAudio);
      setParsedFileNoteImport(null);
    } catch (error) {
      setParsedAudioNoteImport(null);
      setAudioImportJobId('');
      setAudioImportSummary(null);
      setNoteImportFileError(error instanceof Error ? error.message : String(error));
    } finally {
      setAudioImportLoading(false);
    }
  }

  function applyImportedNoteToWorkbench(parsed: ParsedNoteImport, audioJobId?: string) {
    const imported = parsed as ParsedNoteImportForUi;
    if (!imported.body.trim()) return;
    setSelectedNoteId('');
    setNoteTitle(imported.title ?? '');
    setDraft(imported.body);
    setObservedAt(imported.observedAt ?? today());
    applyWorkbenchMetadata(metadataFromParsedNoteImport(imported));
    setWorkbenchAudioImportJobId(audioJobId ?? '');
    setNoteHistory([]);
    setHistoryDrawerOpen(false);
    setNoteSourceType(IMPORTED_NOTE_SOURCE_TYPE);
    setNoteImportOpen(false);
    clearedDraftSignatureRef.current = '';
    workbenchBaselineSignatureRef.current = '';
    setDraftRecovered(false);
    setViewMode('notes');
  }

  async function signOut() {
    await authClient?.auth.signOut();
    setWorkspace(null);
    setMapWorkspace(null);
    setMapAsOf('');
    setMapError('');
    setDashboard(null);
    setAdminSnapshot(null);
  }

  function addPreviewEntity(entity: PreviewEntity) {
    if (entity.kind === 'company') {
      setCompanyTags(values => addTag(values, entity.name));
      const ticker = entity.ticker;
      if (ticker) setTickers(values => addTag(values, ticker, value => value.toUpperCase()));
      setSelected(entity.name);
      return;
    }
    if (entity.kind === 'ticker') {
      setTickers(values => addTag(values, entity.name, value => value.toUpperCase()));
      setSelected(tickerToCompany(entity.name));
      return;
    }
    if (entity.kind === 'industry') {
      setIndustries(values => addTag(values, entity.name));
      return;
    }
    if (entity.kind === 'theme') {
      setManualThemes(values => addTag(values, entity.name));
      return;
    }
    if (entity.kind === 'kpi') {
      setKpis(values => addTag(values, entity.name));
      return;
    }
    if (entity.kind === 'watchlist') {
      setWatchlistTags(values => addTag(values, entity.name));
      return;
    }
    setSourcePeople(values => addTag(values, entity.name));
  }

  const graph = workspace as FrontendWorkspaceSnapshot | null;
  const mapGraph = (mapAsOf && workspace && mapAsOf !== workspace.asOf && mapWorkspace ? mapWorkspace : workspace) as FrontendWorkspaceSnapshot | null;
  const user = graph?.viewer;
  const activeTeamMemberships = user?.teamMemberships?.filter(team => team.status !== 'archived') ?? [];
  const effectiveNoteTeamId = noteTeamId || activeTeamMemberships[0]?.teamId || '';
  const selectedNoteTeamName = activeTeamMemberships.find(team => team.teamId === effectiveNoteTeamId)?.teamName ?? user?.team ?? 'Personal';
  const selectedNote = selectedNoteId ? graph?.visibleNotes.find(note => note.id === selectedNoteId) : undefined;
  const canEditSelectedNote = !selectedNoteId || selectedNote?.authorId === user?.id;
  const workbenchActionLabel = selectedNoteId ? 'Save note' : 'Add note';
  const appMainClass = [
    'app-main',
    viewMode === 'notes' && notesCollapsed ? 'notes-collapsed' : '',
    viewMode !== 'notes' ? 'without-notes-sidebar' : ''
  ].filter(Boolean).join(' ');
  const subjects = graph ? [...graph.companies, ...graph.themes] : [];
  const selectedSynth = subjects.find(s => s.subject === selected) ?? graph?.companies[0] ?? graph?.themes[0];
  const subjectRelations = mapGraph?.relations.filter(r => !selectedSynth || relationMatchesSubject(r, selectedSynth.subject)) ?? [];
  const mapRelations = mapGraph ? (subjectRelations.length ? subjectRelations : mapGraph.relations) : [];
  const preview = previewNote();
  const previewClaims = extractClaims(preview);
  const parsedImport = parsedAudioNoteImport ?? parsedFileNoteImport ?? parsedNoteImport as ParsedNoteImportForUi;
  const canApplyParsedImport = Boolean(parsedImport.body.trim());
  const transcriptChunkPreview = parsedImport.transcriptChunks?.slice(0, 2) ?? [];
  const noteImportWarnings = noteImportFileError ? [noteImportFileError, ...(parsedImport.warnings ?? [])] : parsedImport.warnings ?? [];
  const noteImportMetadata = metadataArraysFromSource(metadataFromParsedNoteImport(parsedImport));
  const noteImportTags = [
    ...noteImportMetadata.companyTags,
    ...noteImportMetadata.tickers,
    ...noteImportMetadata.industries,
    ...noteImportMetadata.manualThemes,
    ...noteImportMetadata.kpis,
    ...noteImportMetadata.watchlistTags,
    ...noteImportMetadata.sourcePeople
  ];
  const previewEntities = mergeEntities(detectEntities(draft), [
    ...companyTags.map(name => ({ name, kind: 'company' as const })),
    ...tickers.map(name => ({ name, kind: 'ticker' as const })),
    ...industries.map(name => ({ name, kind: 'industry' as const })),
    ...manualThemes.map(name => ({ name, kind: 'theme' as const })),
    ...kpis.map(name => ({ name, kind: 'kpi' as const })),
    ...watchlistTags.map(name => ({ name, kind: 'watchlist' as const })),
    ...sourcePeople.map(name => ({ name, kind: 'source_person' as const }))
  ]);
  const noteFilterOptions = graph ? extendNoteFilterOptions(deriveNoteFilterOptions(graph.visibleNotes), graph.visibleNotes) : emptyFilterOptions();
  const mapFilterOptions = mapGraph ? deriveMapFilterOptions(mapGraph) : emptyMapFilterOptions();
  const filteredNotes = graph ? filterFrontendNotes(graph.visibleNotes, noteFilters) : [];
  const currentNoteClaims = selectedNoteId && graph ? graph.claims.filter(claim => claim.noteId === selectedNoteId) : [];
  const currentNoteRelations = selectedNoteId && graph ? graph.relations.filter(relation => relationTouchesSelectedNote(relation, selectedNoteId)) : [];
  const dashboardPeople = (dashboard?.topSourcePeople ?? []).map(item => ({
    name: item.label,
    claimCount: item.value,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    subjects: []
  })) ?? [];
  const currentWorkbenchSignatureValue = currentWorkbenchSignature();
  const currentWorkbenchHasContent = hasDraftContent({
    selectedNoteId: selectedNoteId || undefined,
    title: noteTitle,
    body: draft,
    accessScope,
    teamId: accessScope === 'team' ? effectiveNoteTeamId : undefined,
    observedAt,
    ...currentMetadataArrays(),
    linkedEntities: currentLinkedEntities()
  });
  const workbenchDirty = currentWorkbenchHasContent && currentWorkbenchSignatureValue !== workbenchBaselineSignatureRef.current;
  const saveStateError = appError || mapError || dashboardError;
  const contextHeaderModel = buildContextHeaderModel({
    viewMode,
    userRole: user?.role ?? 'Analyst',
    teamName: selectedNoteTeamName,
    selectedNoteTitle: noteTitle || selectedNote?.title,
    accessScope,
    mapAsOf,
    latestAsOf: graph?.asOf,
    dirty: workbenchDirty,
    saving: workbenchSaving,
    readOnly: !canEditSelectedNote,
    error: saveStateError,
    draftRecovered,
    lastSavedAt
  });
  const commandItems = buildCommandItems({
    viewMode,
    canSaveNote: Boolean(draft.trim() && canEditSelectedNote && !workbenchSaving),
    canOpenHistory: Boolean(selectedNoteId),
    canUseAdmin: user?.orgRole === 'admin',
    hasNoteFilters: activeFilterCount(noteFilters) > 0,
    hasMapFilters: activeMapFilterCount(mapFilters, mapAsOf, graph?.asOf) > 0,
    noteImportOpen,
    selectedNoteTitle: noteTitle || selectedNote?.title
  });

  function runCommand(id: CommandItem['id']) {
    if (id === 'open-notes') setViewMode('notes');
    if (id === 'open-dashboard') setViewMode('dashboard');
    if (id === 'open-map') setViewMode('map');
    if (id === 'open-archive') setViewMode('archive');
    if (id === 'open-admin' && user?.orgRole === 'admin') setViewMode('admin');
    if (id === 'new-note') startNewNote();
    if (id === 'save-note') void saveWorkbenchNote();
    if (id === 'import-note') {
      setViewMode('notes');
      setNoteImportOpen(open => !open);
    }
    if (id === 'open-history') void openNoteHistory();
    if (id === 'focus-editor') focusCapture({ focusEditor: true, enableFocusMode: true });
    if (id === 'clear-filters') {
      clearNoteFilters();
      clearMapFilters();
    }
  }

  function toggleFocusMode() {
    if (viewMode !== 'notes') return;
    if (!focusMode) setEditorFocusSignal(value => value + 1);
    setFocusMode(value => !value);
  }

  function handleDashboardDrilldown(kind: DashboardDrilldownKind, label: string) {
    const drilldown = buildDashboardDrilldown(kind, label);
    if (drilldown.noteFilters) {
      setNoteFilters(current => ({ ...current, ...drilldown.noteFilters }));
    }
    if (drilldown.mapFilters) {
      setMapFilters(current => ({ ...current, ...drilldown.mapFilters }));
    }
    if (drilldown.selected) setSelected(drilldown.selected);
    setViewMode(drilldown.viewMode as ViewMode);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey;
      if (modifier && key === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(open => !open);
      }
      if (event.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (viewMode !== 'notes' && focusMode) setFocusMode(false);
  }, [viewMode, focusMode]);

  if (loading) return <StatusScreen title="Connecting to Mycelium" body="Loading auth and workspace services." />;
  if (!session || !workspace || !user) {
    return <AuthScreen authClient={authClient} error={authError || appError} onError={setAuthError} />;
  }

  return <main className={appMainClass}>
    <aside className="left-rail" aria-label="Workspace navigation">
      <div className="mark"><span>M</span></div>
      <nav>
        <button className={viewMode === 'notes' ? 'active' : ''} onClick={() => setViewMode('notes')} title="Notes" aria-label="Open notes"><BookOpen size={18}/></button>
        <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => setViewMode('dashboard')} title="Dashboard" aria-label="Open dashboard"><BarChart3 size={18}/></button>
        <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')} title="Relationship map" aria-label="Open relationship map"><GitBranch size={18}/></button>
        <button className={viewMode === 'archive' ? 'active' : ''} onClick={() => setViewMode('archive')} title="Archive" aria-label="Open archive"><Layers3 size={18}/></button>
        {user.orgRole === 'admin' && <button className={viewMode === 'admin' ? 'active' : ''} onClick={() => setViewMode('admin')} title="Organisation admin" aria-label="Open organisation admin"><ShieldCheck size={18}/></button>}
      </nav>
      <button className="rail-footer" type="button" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={16}/><span>{user.role}</span></button>
    </aside>

    {viewMode === 'notes' && <NotesSidebar
      collapsed={notesCollapsed}
      filters={noteFilters}
      notes={filteredNotes}
      options={noteFilterOptions}
      filtersCollapsed={noteFiltersCollapsed}
      selectedNoteId={selectedNoteId}
      totalNotes={graph.visibleNotes.length}
      onToggle={() => setNotesCollapsed(value => !value)}
      onToggleFilters={() => setNoteFiltersCollapsed(value => !value)}
      onFilterChange={patch => setNoteFilters(current => ({ ...current, ...patch }))}
      onClearFilters={clearNoteFilters}
      onStartCapture={focusCapture}
      onSelectNote={note => {
        const loadedSignature = draftSignature({
          selectedNoteId: note.id,
          title: note.title,
          body: note.body,
          accessScope: note.accessScope ?? accessScopeFromVisibility(note.visibility),
          teamId: note.teamId,
          observedAt: note.observedAt ?? note.createdAt,
          audioImportJobId: undefined,
          ...metadataArraysFromSource(note),
          linkedEntities: (note as FrontendWorkspaceNote).linkedEntities ?? []
        });
        clearedDraftSignatureRef.current = loadedSignature;
        workbenchBaselineSignatureRef.current = loadedSignature;
        setSelectedNoteId(note.id);
        setNoteTitle(note.title);
        setDraft(note.body);
        setAccessScope(note.accessScope ?? accessScopeFromVisibility(note.visibility));
        setNoteTeamId(note.teamId ?? user.primaryTeamId ?? user.teamId ?? '');
        setObservedAt(note.observedAt ?? note.createdAt);
        setNoteSourceType(DEFAULT_NOTE_SOURCE_TYPE);
        setWorkbenchAudioImportJobId('');
        applyWorkbenchMetadata(note as FrontendWorkspaceNote);
        setNoteHistory([]);
        setHistoryDrawerOpen(false);
        setDraftRecovered(false);
        clearedDraftSignatureRef.current = '';
        setViewMode('notes');
      }}
    />}

    <section className={`shell page-shell ${viewMode}-page`}>
      <ContextHeader
        model={contextHeaderModel}
        focusMode={viewMode === 'notes' && focusMode}
        canToggleFocusMode={viewMode === 'notes'}
        onOpenCommands={() => setCommandPaletteOpen(true)}
        onToggleFocusMode={toggleFocusMode}
      />
      {appError && <div className="inline-error">{appError}</div>}
      <StatusToastStack toasts={toasts} onDismiss={id => setToasts(current => current.filter(toast => toast.id !== id))} />
      <CommandPalette open={commandPaletteOpen} items={commandItems} onClose={() => setCommandPaletteOpen(false)} onRun={runCommand} />

      {viewMode === 'notes' && <NotesPage>
      <section className={`note-workbench ${focusMode ? 'focus-mode' : ''}`}>
        <article className="capture panel primary-note">
          <div className="note-panel-head">
            <div className="panel-title"><FilePlus2/> Note</div>
            <div className="note-panel-actions">
              {selectedNoteId && <button type="button" className="history-note-action" onClick={openNoteHistory}><History size={14}/>History</button>}
              <button type="button" className="note-import-action" onClick={() => setNoteImportOpen(open => !open)}><ClipboardPaste size={14}/>Import</button>
              <button type="button" className="new-note-action" onClick={startNewNote}><FilePlus2 size={14}/>New note</button>
            </div>
          </div>
          {noteImportOpen && <section className="note-import-panel" aria-label="Import pasted note">
            <textarea
              className="note-import-input"
              value={noteImportText}
              onChange={event => {
                setNoteImportText(event.target.value);
                setParsedFileNoteImport(null);
                setParsedAudioNoteImport(null);
                setAudioImportJobId('');
                setNoteImportFileError('');
              }}
              placeholder="Paste meeting notes or transcript text"
            />
            <div className="note-import-file-row">
              <label className="note-import-file-button">
                <input
                  type="file"
                  accept={NOTE_IMPORT_FILE_ACCEPT}
                  onChange={event => {
                    void importNoteFile(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
                Choose TXT, Markdown, DOCX, PDF, VTT, or SRT
              </label>
              <label className="note-import-file-button">
                <input
                  type="file"
                  accept={AUDIO_IMPORT_FILE_ACCEPT}
                  onChange={event => {
                    void importAudioFile(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
                Choose audio
              </label>
            </div>
            <label className="note-import-consent">
              <input type="checkbox" checked={audioImportConsent} onChange={event => setAudioImportConsent(event.target.checked)} />
              <span>I have permission to transcribe this audio and share the transcript in the selected workspace location.</span>
            </label>
            <div className="note-import-audio-controls">
              {audioImportLoading && <span>Transcribing audio...</span>}
              {audioImportJobId && parsedAudioNoteImport && <span>Transcript job ready</span>}
            </div>
            {audioImportSummary && <div className={`note-import-audio-status ${parsedAudioNoteImport ? 'ready' : noteImportFileError ? 'failed' : ''}`}>
              <b>{audioImportSummary.filename}</b>
              <span>{formatBytes(audioImportSummary.sizeBytes)}</span>
              <small>{parsedAudioNoteImport ? 'Audio transcript is ready to apply to the workbench.' : audioImportLoading ? 'Transcribing audio in memory.' : audioImportSummary.message}</small>
            </div>}
            <div className="note-import-preview">
              <b>{parsedImport.title || 'Untitled import'}</b>
              <span>{parsedImport.observedAt || 'Observed date not found'}</span>
              <p>{parsedImport.body.trim() || 'Paste note text to preview the imported workbench draft.'}</p>
              {noteImportTags.length > 0 && <small>{noteImportTags.slice(0, 8).join(' / ')}</small>}
            </div>
            {parsedImport.transcriptChunks && parsedImport.transcriptChunks.length > 0 && <div className="note-import-transcript-preview">
              <span>{parsedImport.transcriptChunks.length} timestamped chunk{parsedImport.transcriptChunks.length === 1 ? '' : 's'}</span>
              {transcriptChunkPreview.map((chunk, index) => <small key={`${chunk.startTime}-${index}`}>
                {chunk.startTime}{chunk.endTime ? `-${chunk.endTime}` : ''}{chunk.speaker ? ` ${chunk.speaker}` : ''}: {chunk.text}
              </small>)}
            </div>}
            {noteImportWarnings.length > 0 && <div className="note-import-warning">
              {noteImportWarnings.map((warning, index) => {
                const message = noteImportWarningMessage(warning);
                return <span key={`${message}-${index}`}>{message}</span>;
              })}
            </div>}
            <div className="note-import-actions">
              <button type="button" onClick={() => applyImportedNoteToWorkbench(parsedImport, parsedImport === parsedAudioNoteImport ? audioImportJobId : undefined)} disabled={!canApplyParsedImport}>Apply to workbench</button>
              <button type="button" onClick={() => setNoteImportOpen(false)}>Close</button>
            </div>
          </section>}
          <div className="note-meta">
            <span>{accessScope === 'team' ? selectedNoteTeamName : accessScope === 'organization' ? 'Organisation' : 'Personal'}</span>
            <span>{observedAt}</span>
          </div>
          <input className="note-title-input" value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Title..." aria-label="Note title" disabled={!canEditSelectedNote} />
          <MarkdownEditor value={draft} onChange={setDraft} onSubmit={saveWorkbenchNote} readOnly={!canEditSelectedNote} focusSignal={editorFocusSignal} />
          <div className="metadata-grid">
            <label><span>Observed</span><input type="date" value={observedAt} onChange={e => setObservedAt(e.target.value)} disabled={!canEditSelectedNote} /></label>
            <label><span>Location</span><select value={accessScope} onChange={e => setAccessScope(e.target.value as AccessScope)} disabled={!canEditSelectedNote}><option value="personal">Personal</option><option value="team">Team</option><option value="organization">Organisation</option></select></label>
            {accessScope === 'team' && <label><span>Team</span><select value={effectiveNoteTeamId} onChange={e => setNoteTeamId(e.target.value)} disabled={!canEditSelectedNote}>{activeTeamMemberships.map(team => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}</select></label>}
          </div>
          <div className="metadata-linking">
            <MetadataChipInput label="Securities/Tickers" values={tickers} options={knownTickers()} onChange={setTickers} transform={value => value.toUpperCase()} placeholder="Add ticker" disabled={!canEditSelectedNote} />
            <MetadataChipInput label="Industries/Sectors" values={industries} options={industryOptions(noteFilterOptions)} onChange={setIndustries} placeholder="Add industry" disabled={!canEditSelectedNote} />
            <MetadataChipInput label="Themes" values={manualThemes} options={themeLexicon} onChange={setManualThemes} placeholder="Add theme" disabled={!canEditSelectedNote} />
            <MetadataChipInput label="KPIs" values={kpis} options={kpiWords} onChange={setKpis} placeholder="Add KPI" disabled={!canEditSelectedNote} />
            <MetadataChipInput label="Watchlists" values={watchlistTags} options={noteFilterOptions.watchlists} onChange={setWatchlistTags} placeholder="Add watchlist" disabled={!canEditSelectedNote} />
            <MetadataChipInput label="Participants" values={sourcePeople} options={noteFilterOptions.sourcePeople} onChange={setSourcePeople} placeholder="Add person" disabled={!canEditSelectedNote} />
          </div>
          <div className="capture-actions">
            <button onClick={saveWorkbenchNote} disabled={!draft.trim() || !canEditSelectedNote || workbenchSaving}>{workbenchSaving ? 'Saving...' : workbenchActionLabel} <span><Save size={13}/> Ctrl+Enter</span></button>
          </div>
          {selectedNoteId && !canEditSelectedNote && <p className="note-edit-lock"><LockKeyhole size={13}/> Only the note author can save changes.</p>}
        </article>

        {!focusMode && <aside className="note-side">
          <article className="panel live-preview">
            <div className="panel-title"><Eye/> Live extraction</div>
            {previewEntities.length ? <div className="entity-cloud">
              {previewEntities.slice(0, 12).map(e => <button type="button" className={`chip ${chipKind(e.kind)}`} key={`${e.kind}-${e.name}`} onClick={() => addPreviewEntity(e)}><Plus size={12}/>{suggestionLabel(e.kind)}<b>{e.name}</b></button>)}
            </div> : <EmptyState title="No entities yet" body="Mention a company, ticker, KPI, or theme and the graph starts forming here." />}
            <div className="preview-claims">
              {previewClaims.map(c => <ClaimCard key={c.id} claim={c} compact />)}
            </div>
          </article>

        </aside>}
      </section>
      {historyDrawerOpen && <NoteHistoryDrawer history={noteHistory} onClose={() => setHistoryDrawerOpen(false)} />}

      <section className="note-intelligence panel">
        <div className="panel-title"><PanelLeft/> Current-note intelligence</div>
        <div className="note-intelligence-grid">
          <article>
            <h3>Saved claims</h3>
            {selectedNoteId
              ? currentNoteClaims.length
                ? <div className="claim-list">{currentNoteClaims.map(claim => <ClaimCard key={claim.id} claim={claim} participantOptions={noteFilterOptions.sourcePeople} onUpdate={input => patchClaim(claim.id, input)} />)}</div>
                : <EmptyState title="No saved claims for this note" body="Save evidence-bearing note text so extracted claims can be reviewed here." />
              : <EmptyState title="Save this note to review claims" body="Draft extraction stays live above. Saved-note claims appear here after the note is added to the graph." />}
          </article>
          <article>
            <h3>Saved relations</h3>
            {selectedNoteId
              ? <NoteRelationsPanel relations={currentNoteRelations} onUpdate={patchRelation} />
              : <EmptyState title="Save this note to compare evidence" body="Relations are only shown here when they involve the currently selected saved note." />}
          </article>
        </div>
      </section>
      </NotesPage>}

      {viewMode === 'dashboard' && <DashboardPage
        dashboard={dashboard}
        people={dashboardPeople}
        loading={dashboardLoading}
        error={dashboardError}
        scope={dashboardScope}
        range={dashboardRange}
        teamId={dashboardTeamId}
        onScopeChange={setDashboardScope}
        onRangeChange={setDashboardRange}
        onTeamChange={setDashboardTeamId}
        onSelectCompany={company => {
          setSelected(company);
          setViewMode('map');
        }}
        onSelectPerson={name => {
          setNoteFilters(current => ({ ...current, sourcePerson: name }));
          setMapFilters(current => ({ ...current, sourcePerson: name }));
        }}
        onDrilldown={handleDashboardDrilldown}
        onStartCapture={focusCapture}
      />}

      {viewMode === 'map' && <MapPage>
        <section className="workspace map-workspace">
          <aside className="subject-rail panel">
            <div className="panel-title"><Search/> Companies & themes</div>
            {subjects.length ? subjects.map(s => <button className={selected === s.subject ? 'active' : ''} key={s.subject} onClick={() => setSelected(s.subject)}>
              <span>{s.subject}</span>
              <small>{s.total} claims · {s.stance}</small>
              <i style={{ ['--mix' as string]: `${Math.min(100, (s.positives / Math.max(1, s.total)) * 100)}%` }} />
            </button>) : <EmptyState title={emptyStates['no-graph'].title} body={emptyStates['no-graph'].body} actions={emptyStateActions(emptyStates['no-graph'], { capture: focusCapture })} />}
          </aside>

          <section className="center-stage">
            <RelationshipMap
              relations={mapRelations}
              notes={mapGraph?.visibleNotes ?? graph.visibleNotes}
              selected={selectedSynth?.subject ?? selected}
              asOf={(mapGraph?.asOf ?? mapAsOf) || graph.asOf}
              latestAsOf={graph.asOf}
              mapAsOf={mapAsOf || graph.asOf}
              loading={mapLoading}
              error={mapError}
              density={mapDensity}
              filters={mapFilters}
              options={mapFilterOptions}
              onAsOfChange={value => setMapAsOf(value > graph.asOf ? graph.asOf : value)}
              onCurrentAsOf={() => setMapAsOf(graph.asOf)}
              onDensityChange={setMapDensity}
              onFilterChange={patch => setMapFilters(current => ({ ...current, ...patch }))}
              onClearFilters={clearMapFilters}
              onStartCapture={focusCapture}
              onSelect={setSelected}
              onUpdate={patchRelation}
            />
          </section>
        </section>
      </MapPage>}

      {viewMode === 'archive' && <ArchivePage notes={filteredNotes} totalNotes={graph.visibleNotes.length} selectedNoteId={selectedNoteId} hasActiveFilters={activeFilterCount(noteFilters) > 0} onClearFilters={clearNoteFilters} onStartCapture={focusCapture} />}
      {viewMode === 'admin' && <AdminPage session={session} snapshot={adminSnapshot} loading={adminLoading} error={adminError} onLoad={refreshAdmin} onError={setAdminError} />}
    </section>
  </main>;
}

function NotesPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout notes-layout">{children}</div>;
}

function MapPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout map-layout">{children}</div>;
}

function AdminPage({
  session,
  snapshot,
  loading,
  error,
  onLoad,
  onError
}: {
  session: Session;
  snapshot: AdminOrganizationSnapshot | null;
  loading: boolean;
  error: string;
  onLoad: () => Promise<AdminOrganizationSnapshot | undefined>;
  onError: (value: string) => void;
}) {
  const [teamName, setTeamName] = useState('');
  const [teamEdits, setTeamEdits] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Analyst');
  const [inviteOrgRole, setInviteOrgRole] = useState<OrgRole>('member');
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);

  async function run(action: () => Promise<unknown>) {
    try {
      onError('');
      await action();
      await onLoad();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  const activeTeams = snapshot?.teams.filter(team => team.status === 'active') ?? [];
  const productRoles: Role[] = ['Analyst', 'PM', 'Compliance'];
  const orgRoles: OrgRole[] = ['member', 'admin'];

  return <div className="page-layout admin-layout">
    <section className="workspace admin-workspace">
      <article className="panel admin-panel">
        <div className="panel-title"><ShieldCheck/> Organisation admin</div>
        {error && <div className="inline-error">{error}</div>}
        {loading && <p>Loading organisation...</p>}
        {!snapshot && !loading && <button type="button" onClick={() => void onLoad()}><Radar size={14}/> Load admin workspace</button>}
        {snapshot && <>
          <div className="admin-section">
            <h2>{snapshot.organization.name}</h2>
            <div className="admin-create-row">
              <label><span>New team</span><input value={teamName} onChange={event => setTeamName(event.target.value)} placeholder="Team name" /></label>
              <button type="button" onClick={() => void run(async () => {
                if (!teamName.trim()) return;
                await createAdminTeam(session, { name: teamName });
                setTeamName('');
              })}><Plus size={14}/> Create team</button>
            </div>
          </div>

          <div className="admin-section">
            <h3>Teams</h3>
            <div className="admin-list">
              {snapshot.teams.map(team => <div className="admin-row" key={team.id}>
                <span><b>{team.name}</b><small>{team.status}</small></span>
                <div className="admin-inline-edit">
                  <input value={teamEdits[team.id] ?? team.name} onChange={event => setTeamEdits(previous => ({ ...previous, [team.id]: event.target.value }))} aria-label={`Rename ${team.name}`} />
                  <button type="button" onClick={() => void run(async () => {
                    const nextName = (teamEdits[team.id] ?? team.name).trim();
                    if (!nextName) return;
                    await updateAdminTeam(session, team.id, { name: nextName });
                    setTeamEdits(previous => {
                      const next = { ...previous };
                      delete next[team.id];
                      return next;
                    });
                  })}><Edit3 size={14}/> Rename</button>
                  {team.status === 'active' && <button type="button" onClick={() => void run(() => archiveAdminTeam(session, team.id))}><ArchiveIcon/> Archive</button>}
                </div>
              </div>)}
            </div>
          </div>

          <div className="admin-section">
            <h3>Invite</h3>
            <div className="admin-create-row">
              <label><span>Email</span><input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="analyst@example.com" /></label>
              <label><span>Product role</span><select value={inviteRole} onChange={event => setInviteRole(event.target.value as Role)}>{productRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
              <label><span>Org role</span><select value={inviteOrgRole} onChange={event => setInviteOrgRole(event.target.value as OrgRole)}>{orgRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
              <label><span>Teams</span><select multiple value={inviteTeamIds} onChange={event => setInviteTeamIds(Array.from(event.currentTarget.selectedOptions).map(option => option.value))}>{activeTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
              <button type="button" onClick={() => void run(async () => {
                if (!inviteEmail.trim()) return;
                await createAdminInvite(session, { email: inviteEmail, role: inviteRole, orgRole: inviteOrgRole, teamIds: inviteTeamIds });
                setInviteEmail('');
                setInviteTeamIds([]);
              })}><KeyRound size={14}/> Invite</button>
            </div>
            <div className="admin-list">
              {snapshot.invites.map(invite => <div className="admin-row" key={invite.id}>
                <span><b>{invite.email}</b><small>{invite.status}</small></span>
                {invite.status === 'pending' && <button type="button" onClick={() => void run(() => cancelAdminInvite(session, invite.id))}><X size={14}/> Cancel</button>}
              </div>)}
            </div>
          </div>

          <div className="admin-section">
            <h3>Members</h3>
            <div className="admin-list">
              {snapshot.members.map(member => {
                const assignedTeamIds = new Set(member.teamMemberships.filter(team => team.status === 'active').map(team => team.teamId));
                const primaryTeamOptions = activeTeams.filter(team => assignedTeamIds.has(team.id));
                return <div className="admin-row admin-member-row" key={member.id}>
                  <span><b>{member.name}</b><small>{member.email ?? member.id} · {member.status}</small></span>
                  <div className="admin-member-controls">
                    <label><span>Product role</span><select value={member.role} onChange={event => void run(() => updateAdminMember(session, member.id, { role: event.target.value as Role }))}>{productRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
                    <label><span>Org role</span><select value={member.orgRole} onChange={event => void run(() => updateAdminMember(session, member.id, { orgRole: event.target.value as OrgRole }))}>{orgRoles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
                    <label><span>Primary team</span><select value={member.primaryTeamId ?? ''} onChange={event => void run(() => updateAdminMember(session, member.id, { primaryTeamId: event.target.value || null }))}><option value="">None</option>{primaryTeamOptions.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                    <div className="admin-team-checks" aria-label={`${member.name} teams`}>
                      {activeTeams.map(team => <label key={team.id}><input type="checkbox" checked={assignedTeamIds.has(team.id)} onChange={event => {
                        const nextTeamIds = new Set(assignedTeamIds);
                        if (event.currentTarget.checked) nextTeamIds.add(team.id);
                        else nextTeamIds.delete(team.id);
                        void run(() => replaceAdminMemberTeams(session, member.id, Array.from(nextTeamIds)));
                      }} /><span>{team.name}</span></label>)}
                    </div>
                    <button type="button" onClick={() => void run(() => updateAdminMember(session, member.id, { status: member.status === 'active' ? 'deactivated' : 'active' }))}>{member.status === 'active' ? <Ban size={14}/> : <Check size={14}/>} {member.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
                  </div>
                </div>;
              })}
            </div>
          </div>
        </>}
      </article>
    </section>
  </div>;
}

function ArchiveIcon() {
  return <Layers3 size={14}/>;
}

function DashboardPage({
  dashboard,
  people,
  loading,
  error,
  scope,
  range,
  teamId,
  onScopeChange,
  onRangeChange,
  onTeamChange,
  onSelectCompany,
  onSelectPerson,
  onDrilldown,
  onStartCapture
}: {
  dashboard: DashboardSnapshot | null;
  people: PersonMemorySummary[];
  loading: boolean;
  error: string;
  scope: DashboardScope;
  range: DashboardRange;
  teamId: string;
  onScopeChange: (scope: DashboardScope) => void;
  onRangeChange: (range: DashboardRange) => void;
  onTeamChange: (teamId: string) => void;
  onSelectCompany: (company: string) => void;
  onSelectPerson: (name: string) => void;
  onDrilldown: (kind: DashboardDrilldownKind, label: string) => void;
  onStartCapture: () => void;
}) {
  const availability = dashboard?.scopeAvailability ?? defaultDashboardScopeAvailability();
  const relationTotal = Math.max(1, dashboard?.totals.relations ?? 0);
  const activeTeamId = teamId || dashboard?.selectedTeam?.id || '';

  return <div className="page-layout dashboard-layout">
    <header className="dashboard-header panel">
      <div>
        <div className="panel-title"><Gauge/> Research dashboard</div>
        <h1>Workspace pulse</h1>
        <p>Permission-aware research intelligence across notes, claims, relations, freshness, review backlog, and source-person coverage.</p>
      </div>
      <div className="dashboard-controls">
        <div className="dashboard-scope-toggle">
          {availability.map(item => <button type="button" key={item.scope} className={scope === item.scope ? 'active' : ''} disabled={!item.enabled} title={item.reason} onClick={() => item.enabled && onScopeChange(item.scope)}>{item.label}</button>)}
        </div>
        <div className="dashboard-range-toggle">
          {(['30d', '90d', 'all'] as DashboardRange[]).map(item => <button type="button" key={item} className={range === item ? 'active' : ''} onClick={() => onRangeChange(item)}>{dashboardRangeLabel(item)}</button>)}
        </div>
        {scope === 'team' && <select value={activeTeamId} onChange={event => onTeamChange(event.target.value)} aria-label="Dashboard team">
          {(dashboard?.teams ?? []).map(team => <option key={team.id ?? team.name} value={team.id ?? ''}>{team.name}</option>)}
        </select>}
      </div>
    </header>

    {error && <div className="inline-error">{error}</div>}
    {loading && !dashboard && <div className="panel dashboard-loading"><div className="panel-title"><Sparkles/> Loading dashboard</div><p>Preparing scoped research aggregates.</p></div>}

    {dashboard && <section className="dashboard-metric-grid">
      <DashboardMetricCard icon={<BookOpen/>} label="Notes" value={dashboard.totals.notes} sub={`${dashboardRangeLabel(dashboard.range)} ${dashboard.scope}`} onClick={() => onDrilldown('metric-notes', 'Notes')} />
      <DashboardMetricCard icon={<Network/>} label="Claims" value={dashboard.totals.claims} sub={`${dashboard.reviewBacklog.claims} awaiting claim review`} onClick={() => onDrilldown('metric-claims', 'Claims')} />
      <DashboardMetricCard icon={<GitBranch/>} label="Relations" value={dashboard.totals.relations} sub={`${dashboard.reviewBacklog.relations} open relation reviews`} onClick={() => onDrilldown('metric-relations', 'Relations')} />
      <DashboardMetricCard icon={<AlertTriangle/>} label="Signals" value={dashboard.signals.length} sub={`as of ${dashboard.asOf}`} onClick={() => onDrilldown('metric-relations', 'Signals')} />
    </section>}

    {dashboard && <>
    <section className="dashboard-insight-grid">
      <article className="dashboard-chart-card relation-mix-card">
        <div className="panel-title"><Workflow/> Relation mix</div>
        <div className="dashboard-bars">
          {relationTypes.map(type => <button type="button" key={type} className={`dashboard-bar-row ${type}`} onClick={() => onDrilldown('relation-type', type)}>
            <span>{relationLabel(type)}</span>
            <i><b style={{ ['--share' as string]: `${Math.round((dashboard.relationMix[type] / relationTotal) * 100)}%` }} /></i>
            <strong>{dashboard.relationMix[type]}</strong>
          </button>)}
        </div>
      </article>

      <article className="dashboard-chart-card freshness-card">
        <div className="panel-title"><CircleDot/> Freshness</div>
        <button type="button" className="dashboard-donut" onClick={() => onDrilldown('freshness', 'fresh')} style={{ ['--fresh' as string]: dashboardFreshnessShare(dashboard, 'fresh'), ['--aging' as string]: dashboardFreshnessShare(dashboard, 'aging') }}>
          <b>{dashboard.freshness.fresh}</b>
        </button>
        <div className="dashboard-donut-caption">fresh claims</div>
        <div className="dashboard-legend">
          <button type="button" onClick={() => onDrilldown('freshness', 'fresh')}>Fresh {dashboard.freshness.fresh}</button>
          <button type="button" onClick={() => onDrilldown('freshness', 'aging')}>Aging {dashboard.freshness.aging}</button>
          <button type="button" onClick={() => onDrilldown('freshness', 'stale')}>Stale {dashboard.freshness.stale}</button>
        </div>
      </article>
    </section>

    <section className="dashboard-widget-grid">
      <DashboardTopList title="Companies" icon={<Building2/>} items={dashboard.topCompanies} onSelect={label => { onSelectCompany(label); onDrilldown('company', label); }} />
      <DashboardTopList title="Themes" icon={<PanelLeft/>} items={dashboard.topThemes} onSelect={label => onDrilldown('theme', label)} />
      <DashboardTopList title="KPIs" icon={<BarChart3/>} items={dashboard.topKpis} onSelect={label => onDrilldown('kpi', label)} />
      <DashboardTopList title="Securities" icon={<Layers3/>} items={dashboard.topSecurities} onSelect={label => onDrilldown('security', label)} />
      <DashboardTopList title="Watchlists" icon={<ListFilter/>} items={dashboard.topWatchlists} onSelect={label => onDrilldown('watchlist', label)} />
      <DashboardTopList title="Source people" icon={<UsersRound/>} items={dashboard.topSourcePeople} onSelect={label => { onSelectPerson(label); onDrilldown('source-person', label); }} />

      <article className="dashboard-chart-card dashboard-widget-card signals-card">
        <div className="panel-title"><AlertTriangle/> Signals</div>
        {dashboard.signals.length ? dashboard.signals.map(signal => <button key={signal.id} className={`alert ${signal.severity}`} onClick={() => signal.company && onSelectCompany(signal.company)}>
          <span>{signal.severity}</span><h3>{signal.title}</h3><p>{signal.body}</p>
        </button>) : <EmptyState title="No alerts" body="The selected dashboard scope is quiet for this timeframe." showIcon={false} />}
      </article>

      <PersonMemoryPanel people={people} onSelectPerson={onSelectPerson} onStartCapture={onStartCapture} />
    </section>
    </>}
  </div>;
}

function DashboardMetricCard({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: number; sub: string; onClick?: () => void }) {
  return <button type="button" className="dashboard-metric-card" onClick={onClick}>{icon}<span>{label}</span><b>{value}</b><small>{sub}</small></button>;
}

function DashboardTopList({ title, icon, items, onSelect }: { title: string; icon: React.ReactNode; items: DashboardTopItem[]; onSelect?: (label: string) => void }) {
  return <article className="dashboard-chart-card dashboard-widget-card">
    <div className="panel-title">{icon}{title}</div>
    {items.length ? <div className="dashboard-top-list">
      {items.map(item => <button type="button" key={item.label} onClick={() => onSelect?.(item.label)} disabled={!onSelect}>
        <span>{item.label}</span>
        <i><b style={{ ['--share' as string]: `${item.share}%` }} /></i>
        <strong>{item.value}</strong>
      </button>)}
    </div> : <EmptyState title={`No ${title.toLowerCase()} yet`} body="Add and review notes in this scope to populate this dashboard panel." showIcon={false} />}
  </article>;
}

function NoteRelationsPanel({ relations, onUpdate }: { relations: FrontendWorkspaceRelation[]; onUpdate: (id: string, input: UpdateRelationInput) => void }) {
  const [selectedRelationId, setSelectedRelationId] = useState(relations[0]?.id ?? '');
  const selectedRelation = relations.find(relation => relation.id === selectedRelationId) ?? relations[0];

  useEffect(() => {
    if (relations.length && !relations.some(relation => relation.id === selectedRelationId)) {
      setSelectedRelationId(relations[0].id);
    }
  }, [relations, selectedRelationId]);

  if (!relations.length) {
    return <EmptyState title="No relations for this note" body="When this note corroborates, contradicts, updates, or tensions with accessible evidence, those relations appear here." />;
  }

  return <div className="note-relations-panel">
    <div className="relation-list">
      {relations.map(relation => <RelationCard key={relation.id} relation={relation} selected={relation.id === selectedRelation?.id} onSelect={() => setSelectedRelationId(relation.id)} onUpdate={input => onUpdate(relation.id, input)} />)}
    </div>
    {selectedRelation && <RelationDetailDrawer relation={selectedRelation} onUpdate={input => onUpdate(selectedRelation.id, input)} />}
  </div>;
}


function NoteHistoryDrawer({ history, onClose }: { history: NoteRevision[]; onClose: () => void }) {
  return <aside className="note-history-drawer panel" aria-label="Note history">
    <div className="note-history-head">
      <div className="panel-title"><History/> Note history</div>
      <button type="button" onClick={onClose} title="Close history"><X size={15}/></button>
    </div>
    {history.length ? <div className="note-history-list">
      {history.map(revision => <article key={revision.id} className="note-history-item">
        <small>{new Date(revision.createdAt).toLocaleString()} Â· {revision.editorName} Â· {revision.changedFields.join(', ')}</small>
        <h3>{revision.previousTitle}</h3>
        <div className="revision-meta">
          <span>{revision.previousVisibility}</span>
          <span>{revision.previousObservedAt ?? 'No observed date'}</span>
          <span>{revision.previousTickers.join(', ') || 'No stocks'}</span>
        </div>
        <b>Previous body</b>
        <MarkdownPreview source={revision.previousBody} />
      </article>)}
    </div> : <EmptyState title="No history yet" body="Saved note edits will appear here." />}
  </aside>;
}

function ArchivePage({
  notes,
  totalNotes,
  selectedNoteId,
  hasActiveFilters,
  onClearFilters,
  onStartCapture
}: {
  notes: FrontendWorkspaceNote[];
  totalNotes: number;
  selectedNoteId: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onStartCapture: () => void;
}) {
  const emptyState = emptyStateForNotes({ hasWorkspaceNotes: totalNotes > 0, hasActiveFilters });
  return <div className="page-layout archive-layout">
    <section className="workspace archive-workspace">
      <article className="panel notes">
        <div className="panel-title"><LockKeyhole/> Permission-aware note archive</div>
        <p className="archive-count">{notes.length} of {totalNotes} visible notes</p>
        {notes.length ? notes.map(n => <article key={n.id} className={`note-card ${selectedNoteId === n.id ? 'selected' : ''}`}>
          <div><h3>{n.title}</h3><small>{noteLocationLabel(n)} · {n.createdAt}</small></div>
          <NoteMetadataChips note={n} />
          <MarkdownPreview source={n.body} />
        </article>) : <EmptyState title={emptyState.title} body={emptyState.body} actions={emptyStateActions(emptyState, { capture: onStartCapture, 'clear-filters': onClearFilters })} />}
      </article>
    </section>
  </div>;
}

function NotesSidebar({
  collapsed,
  filters,
  notes,
  options,
  filtersCollapsed,
  selectedNoteId,
  totalNotes,
  onToggle,
  onToggleFilters,
  onFilterChange,
  onClearFilters,
  onStartCapture,
  onSelectNote
}: {
  collapsed: boolean;
  filters: FrontendNoteFilters;
  notes: FrontendWorkspaceNote[];
  options: FrontendNoteFilterOptions;
  filtersCollapsed: boolean;
  selectedNoteId: string;
  totalNotes: number;
  onToggle: () => void;
  onToggleFilters: () => void;
  onFilterChange: (patch: Partial<FrontendNoteFilters>) => void;
  onClearFilters: () => void;
  onStartCapture: () => void;
  onSelectNote: (note: FrontendWorkspaceNote) => void;
}) {
  if (collapsed) {
    return <aside className="notes-sidebar collapsed" aria-label="Notes sidebar">
      <button className="notes-toggle collapsed" onClick={onToggle} title="Open notes"><ChevronRight size={17}/><span>{totalNotes}</span></button>
    </aside>;
  }

  const emptyState = emptyStateForNotes({ hasWorkspaceNotes: totalNotes > 0, hasActiveFilters: activeFilterCount(filters) > 0 });

  return <aside className="notes-sidebar panel" aria-label="Notes sidebar">
    <div className="notes-sidebar-head">
      <div>
        <div className="panel-title"><BookOpen/> Notes</div>
        <p>{notes.length} of {totalNotes} visible</p>
      </div>
      <button className="notes-toggle" onClick={onToggle} title="Collapse notes"><ChevronLeft size={17}/></button>
    </div>

    <div className={`note-filter-panel ${filtersCollapsed ? 'collapsed' : ''}`}>
      <button className="note-filter-toggle" onClick={onToggleFilters} aria-expanded={!filtersCollapsed}><ListFilter size={14}/><span>Filters</span><b>{activeFilterCount(filters)}</b></button>
      {!filtersCollapsed && <div className="note-filter-stack">
        <label className="note-search"><span><Search size={13}/> Search</span><input value={filters.query ?? ''} onChange={event => onFilterChange({ query: event.target.value })} placeholder="Title or body" /></label>
        <div className="note-filter-grid">
          <FilterSelect label="Stock" value={filters.ticker ?? ''} options={options.tickers} onChange={value => onFilterChange({ ticker: value })} />
          <FilterSelect label="Industry" value={filters.industry ?? ''} options={options.industries} onChange={value => onFilterChange({ industry: value })} />
          <FilterSelect label="Theme" value={filters.theme ?? ''} options={options.themes} onChange={value => onFilterChange({ theme: value })} />
          <FilterSelect label="KPI" value={filters.kpi ?? ''} options={options.kpis} onChange={value => onFilterChange({ kpi: value })} />
          <FilterSelect label="Watchlist" value={filters.watchlist ?? ''} options={options.watchlists} onChange={value => onFilterChange({ watchlist: value })} />
          <FilterSelect label="Participant" value={filters.sourcePerson ?? ''} options={options.sourcePeople} onChange={value => onFilterChange({ sourcePerson: value })} />
          <FilterSelect label="Location" value={filters.accessScope ?? ''} options={options.accessScopes.map(scope => ({ value: scope, label: accessScopeLabel(scope) }))} onChange={value => onFilterChange({ accessScope: value as NoteFilters['accessScope'] })} />
          <label><span>Sort</span><select value={filters.sort ?? 'newest'} onChange={event => onFilterChange({ sort: event.target.value as NoteSort })}><option value="newest">newest</option><option value="oldest">oldest</option><option value="title">title</option></select></label>
        </div>
        <div className="date-filter-grid">
          <label><span>From</span><input type="date" value={filters.dateFrom ?? ''} onChange={event => onFilterChange({ dateFrom: event.target.value })} /></label>
          <label><span>To</span><input type="date" value={filters.dateTo ?? ''} onChange={event => onFilterChange({ dateTo: event.target.value })} /></label>
        </div>
        <button className="clear-note-filters" onClick={onClearFilters}><ListFilter size={14}/> Clear filters</button>
      </div>}
    </div>

    <div className="notes-list">
      {notes.length ? notes.map(note => <button className={`sidebar-note ${selectedNoteId === note.id ? 'selected' : ''}`} key={note.id} onClick={() => onSelectNote(note)}>
        <span className="sidebar-note-row"><b className="sidebar-note-title">{note.title}</b><span className="sidebar-note-date">{noteRecencyDate(note)}</span></span>
      </button>) : <EmptyState title={emptyState.title} body={emptyState.body} actions={emptyStateActions(emptyState, { capture: onStartCapture, 'clear-filters': onClearFilters })} />}
    </div>
  </aside>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">all</option>{options.map(option => {
    const optionValue = typeof option === 'string' ? option : option.value;
    const optionLabel = typeof option === 'string' ? option : option.label;
    return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
  })}</select></label>;
}

function activeFilterCount(filters: NoteFilters) {
  return [
    filters.query,
    filters.ticker,
    filters.industry,
    filters.theme,
    filters.kpi,
    filters.watchlist,
    filters.sourcePerson,
    filters.dateFrom,
    filters.dateTo,
    filters.visibility,
    filters.accessScope
  ].filter(Boolean).length;
}

function activeMapFilterCount(filters: MapFilters, mapAsOf?: string, latestAsOf?: string) {
  const fieldCount = [
    filters.security,
    filters.industryOrTheme,
    filters.relationType,
    filters.freshness,
    filters.sourcePerson,
    filters.authorId,
    filters.team
  ].filter(Boolean).length;
  return fieldCount + (mapAsOf && latestAsOf && mapAsOf !== latestAsOf ? 1 : 0);
}

function activeMapFilterEntries(filters: MapFilters, mapAsOf?: string, latestAsOf?: string) {
  return [
    filters.security && `Security: ${filters.security}`,
    filters.industryOrTheme && `Industry/theme: ${filters.industryOrTheme}`,
    filters.relationType && `Relation: ${relationLabel(filters.relationType)}`,
    filters.freshness && `Freshness: ${filters.freshness}`,
    filters.sourcePerson && `Participant: ${filters.sourcePerson}`,
    filters.authorId && `Author: ${filters.authorId}`,
    filters.team && `Team: ${filters.team}`,
    mapAsOf && latestAsOf && mapAsOf !== latestAsOf && `As of: ${mapAsOf}`
  ].filter(Boolean) as string[];
}

function MarkdownEditor({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  focusSignal = 0
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  readOnly?: boolean;
  focusSignal?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedHtmlRef = useRef('');
  const [slashQuery, setSlashQuery] = useState('');
  const [slashTriggerLength, setSlashTriggerLength] = useState(0);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const tools: { command: RichMarkdownCommand; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { command: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: <Undo2 size={15}/> },
    { command: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', icon: <Redo2 size={15}/> },
    { command: 'bold', label: 'Bold', shortcut: 'Ctrl+B', icon: <Bold size={15}/> },
    { command: 'italic', label: 'Italic', shortcut: 'Ctrl+I', icon: <Italic size={15}/> },
    { command: 'underline', label: 'Underline', shortcut: 'Ctrl+U', icon: <Underline size={15}/> },
    { command: 'heading-1', label: 'Heading 1', shortcut: 'Ctrl+Alt+1', icon: <Heading1 size={15}/> },
    { command: 'heading-2', label: 'Heading 2', shortcut: 'Ctrl+Alt+2', icon: <Heading2 size={15}/> },
    { command: 'heading-3', label: 'Heading 3', shortcut: 'Ctrl+Alt+3', icon: <Heading3 size={15}/> },
    { command: 'font-small', label: 'Small text', shortcut: 'Ctrl+Shift+,', icon: <CaseLower size={15}/> },
    { command: 'font-large', label: 'Large text', shortcut: 'Ctrl+Shift+.', icon: <CaseUpper size={15}/> },
    { command: 'bullet-list', label: 'Bulleted list', shortcut: 'Toolbar', icon: <List size={15}/> },
    { command: 'numbered-list', label: 'Numbered list', shortcut: 'Toolbar', icon: <ListOrdered size={15}/> },
    { command: 'quote', label: 'Quote', shortcut: 'Toolbar', icon: <Quote size={15}/> },
    { command: 'indent', label: 'Indent', shortcut: 'Tab', icon: <ListIndentIncrease size={15}/> },
    { command: 'outdent', label: 'Outdent', shortcut: 'Shift+Tab', icon: <ListIndentDecrease size={15}/> }
  ];
  const slashOptions = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return slashMarkdownCommands;
    return slashMarkdownCommands.filter(option => option.label.toLowerCase().includes(query) || option.command.includes(query.replace(/\s+/g, '-')));
  }, [slashQuery]);
  const slashPaletteOpen = slashTriggerLength > 0 && slashOptions.length > 0;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const html = renderMarkdownHtml(value);
    if (renderedHtmlRef.current !== html || editor.innerHTML !== html) {
      renderedHtmlRef.current = html;
      editor.innerHTML = html;
    }
  }, [value]);

  useEffect(() => {
    if (focusSignal > 0 && !readOnly) editorRef.current?.focus();
  }, [focusSignal, readOnly]);

  function syncFromEditor() {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    renderedHtmlRef.current = html;
    onChange(turndownService.turndown(html).trim());
    refreshSlashPalette();
  }

  function closeSlashPalette() {
    setSlashQuery('');
    setSlashTriggerLength(0);
    setSlashSelectedIndex(0);
  }

  function refreshSlashPalette() {
    const trigger = getSlashTriggerBeforeCursor();
    if (!trigger) {
      closeSlashPalette();
      return;
    }
    setSlashQuery(trigger.query);
    setSlashTriggerLength(trigger.length);
    setSlashSelectedIndex(0);
  }

  function getSlashTriggerBeforeCursor() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return null;
    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(editor);
    prefixRange.setEnd(range.endContainer, range.endOffset);
    const textBeforeCursor = prefixRange.toString();
    const lineStart = Math.max(textBeforeCursor.lastIndexOf('\n'), textBeforeCursor.lastIndexOf('\r')) + 1;
    const lineBeforeCursor = textBeforeCursor.slice(lineStart);
    const match = lineBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9 ]{0,24})$/);
    if (!match) return null;
    return { query: match[1], length: match[1].length + 1 };
  }

  function runCommand(command: RichMarkdownCommand) {
    if (readOnly) return;
    closeSlashPalette();
    editorRef.current?.focus();
    if (command === 'undo') {
      document.execCommand('undo');
      window.requestAnimationFrame(syncFromEditor);
      return;
    }
    if (command === 'redo') {
      document.execCommand('redo');
      window.requestAnimationFrame(syncFromEditor);
      return;
    }
    if (command === 'bold' || command === 'italic' || command === 'underline') {
      document.execCommand(command);
      window.requestAnimationFrame(syncFromEditor);
      return;
    }
    if (command === 'paragraph') {
      document.execCommand('formatBlock', false, 'p');
      window.requestAnimationFrame(syncFromEditor);
      return;
    }
    if (command === 'heading-1' || command === 'heading-2' || command === 'heading-3') {
      document.execCommand('formatBlock', false, `h${command.slice(-1)}`);
      window.requestAnimationFrame(syncFromEditor);
      return;
    }
    if (command === 'bullet-list') document.execCommand('insertUnorderedList');
    if (command === 'numbered-list') document.execCommand('insertOrderedList');
    if (command === 'quote') document.execCommand('formatBlock', false, 'blockquote');
    if (command === 'indent') document.execCommand('indent');
    if (command === 'outdent') document.execCommand('outdent');
    if (command === 'font-small') document.execCommand('fontSize', false, '2');
    if (command === 'font-large') document.execCommand('fontSize', false, '4');
    window.requestAnimationFrame(() => {
      editorRef.current?.querySelectorAll('font[size="2"]').forEach(node => {
        const span = document.createElement('span');
        span.setAttribute('data-size', 'small');
        span.innerHTML = node.innerHTML;
        node.replaceWith(span);
      });
      editorRef.current?.querySelectorAll('font[size="4"]').forEach(node => {
        const span = document.createElement('span');
        span.setAttribute('data-size', 'large');
        span.innerHTML = node.innerHTML;
        node.replaceWith(span);
      });
      syncFromEditor();
    });
  }

  function selectTextBeforeCursor(characterCount: number) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    for (let index = 0; index < characterCount; index += 1) {
      selection.modify?.('extend', 'backward', 'character');
    }
    return !selection.isCollapsed;
  }

  function applySlashCommand(command: SlashMarkdownCommand) {
    if (readOnly) return;
    editorRef.current?.focus();
    if (selectTextBeforeCursor(slashTriggerLength)) {
      document.execCommand('delete');
    }
    closeSlashPalette();
    runCommand(command);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (readOnly) return;
    const modifier = event.ctrlKey;
    const key = event.key.toLowerCase();
    if (modifier && key === 'enter') {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (slashPaletteOpen && !modifier) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashSelectedIndex(index => (index + 1) % slashOptions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashSelectedIndex(index => (index - 1 + slashOptions.length) % slashOptions.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        applySlashCommand(slashOptions[Math.min(slashSelectedIndex, slashOptions.length - 1)].command);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlashPalette();
        return;
      }
    }
    if (modifier && key === 'z') {
      event.preventDefault();
      runCommand(event.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (modifier && key === 'y') {
      event.preventDefault();
      runCommand('redo');
      return;
    }
    if (modifier && !event.altKey && !event.shiftKey && (key === 'b' || key === 'i' || key === 'u')) {
      event.preventDefault();
      runCommand(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
      return;
    }
    if (modifier && event.altKey && (key === '1' || key === '2' || key === '3')) {
      event.preventDefault();
      runCommand(`heading-${key}` as MarkdownCommand);
      return;
    }
    if (modifier && event.shiftKey && (key === '.' || key === '>')) {
      event.preventDefault();
      runCommand('font-large');
      return;
    }
    if (modifier && event.shiftKey && (key === ',' || key === '<')) {
      event.preventDefault();
      runCommand('font-small');
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      runCommand(event.shiftKey ? 'outdent' : 'indent');
    }
  }

  return <div className={`markdown-editor ${readOnly ? 'read-only' : ''}`}>
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
      {tools.map(tool => <button type="button" key={tool.command} onClick={() => runCommand(tool.command)} title={`${tool.label} (${tool.shortcut})`} aria-label={tool.label} disabled={readOnly}>{tool.icon}</button>)}
    </div>
    <div
      ref={editorRef}
      className="markdown-display-editor"
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-readonly={readOnly}
      aria-label="Research note display editor"
      onInput={syncFromEditor}
      onBlur={syncFromEditor}
      onKeyDown={onKeyDown}
      onPaste={event => {
        if (readOnly) return;
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
        window.requestAnimationFrame(syncFromEditor);
      }}
    />
    {slashPaletteOpen && <div className="markdown-slash-palette" role="listbox" aria-label="Markdown commands">
      {slashOptions.map((option, index) => <button
        type="button"
        key={option.command}
        className={index === slashSelectedIndex ? 'active' : ''}
        role="option"
        aria-selected={index === slashSelectedIndex}
        onMouseDown={event => event.preventDefault()}
        onClick={() => applySlashCommand(option.command)}
      >{option.label}</button>)}
    </div>}
  </div>;
}

function MarkdownPreview({ source }: { source: string }) {
  return <div className="markdown-preview" aria-label="Rendered note">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema]]}>{source || ' '}</ReactMarkdown>
  </div>;
}

function renderMarkdownHtml(source: string) {
  const parsed = marked.parse(source || '<br>', { async: false }) as string;
  return sanitizeEditorHtml(parsed) || '<p><br></p>';
}

function sanitizeEditorHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style').forEach(node => node.remove());
  doc.body.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) element.removeAttribute(attribute.name);
    }
  });
  return doc.body.innerHTML;
}

function MetadataChipInput({
  label,
  values,
  options,
  onChange,
  placeholder,
  transform = value => value,
  disabled = false
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  transform?: (value: string) => string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const tokenKind = metadataKindForLabel(label);
  const tokenOptions = buildMetadataTokenOptions({ kind: tokenKind, values, options });
  const visibleOptions = tokenOptions.filter(option => !values.some(value => value.toLowerCase() === option.value.toLowerCase())).slice(0, 4);

  function addValue(value: string) {
    if (disabled) return;
    const next = transform(value).trim();
    if (!next) return;
    onChange(normalizeTags([...values, next]));
    setDraft('');
  }

  function removeValue(value: string) {
    if (disabled) return;
    onChange(values.filter(item => item.toLowerCase() !== value.toLowerCase()));
  }

  return <div className="metadata-chip-input">
    <div className="metadata-chip-head">
      <span>{label}</span>
      <select value="" onChange={event => addValue(event.target.value)} disabled={disabled}><option value="">Choose</option>{tokenOptions.map(option => <option key={option.value} value={option.value}>{option.label}{option.detail ? ` - ${option.detail}` : ''}</option>)}</select>
    </div>
    <div className="metadata-chip-entry">
      <input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addValue(draft);
        }
      }} placeholder={placeholder} disabled={disabled} />
      <button type="button" onClick={() => addValue(draft)} disabled={disabled}><Plus size={14}/></button>
    </div>
    {visibleOptions.length > 0 && <div className="metadata-token-options">
      {visibleOptions.map(option => <button type="button" className="metadata-token-option" key={option.value} onClick={() => addValue(option.value)} disabled={disabled}>
        <b>{option.label}</b>{option.detail && <small>{option.detail}</small>}
      </button>)}
    </div>}
    <div className="metadata-chip-list">
      {values.map(value => <button type="button" key={value} onClick={() => removeValue(value)} disabled={disabled}>{value}<X size={12}/></button>)}
    </div>
  </div>;
}

function metadataKindForLabel(label: string) {
  if (label.includes('Securities')) return 'security';
  if (label.includes('Industries')) return 'industry';
  if (label.includes('Watchlists')) return 'watchlist';
  if (label.includes('Participants')) return 'source_person';
  if (label.includes('KPI')) return 'kpi';
  return 'theme';
}

function NoteMetadataChips({ note, compact = false }: { note: FrontendMetadata; compact?: boolean }) {
  const metadata = metadataArraysFromSource(note);
  const items = [
    ...metadata.companyTags.map(value => ({ value, kind: 'company' })),
    ...metadata.tickers.map(value => ({ value, kind: 'ticker' })),
    ...metadata.industries.map(value => ({ value, kind: 'industry' })),
    ...metadata.manualThemes.map(value => ({ value, kind: 'theme' })),
    ...metadata.kpis.map(value => ({ value, kind: 'kpi' })),
    ...metadata.watchlistTags.map(value => ({ value, kind: 'watchlist' })),
    ...metadata.sourcePeople.map(value => ({ value, kind: 'source_person' }))
  ];

  if (!items.length) return null;
  return <div className={`note-metadata-chips ${compact ? 'compact' : ''}`}>
    {items.slice(0, compact ? 5 : items.length).map(item => <span className={`chip ${item.kind}`} key={`${item.kind}-${item.value}`}>{item.value}</span>)}
  </div>;
}

function AuthScreen({ authClient, error, onError }: { authClient: SupabaseClient | null; error: string; onError: (value: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('Mycelium Capital');
  const [teamName, setTeamName] = useState('Research');
  const [role, setRole] = useState('Analyst');
  const [message, setMessage] = useState('');

  async function signIn() {
    if (!authClient) return;
    onError('');
    const { error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) onError(error.message);
  }

  async function signUp() {
    if (!authClient) return;
    onError('');
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0], organization_name: organizationName, team_name: teamName, role }
      }
    });
    if (error) onError(error.message);
    if (!data.session) setMessage('Check your email to finish sign-up.');
  }

  async function magicLink() {
    if (!authClient) return;
    onError('');
    const { error } = await authClient.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) onError(error.message);
    else setMessage('Magic link sent.');
  }

  return <main className="auth-shell">
    <section className="auth-panel panel">
      <div className="panel-title"><LogIn/> Secure workspace</div>
      <h1>Mycelium</h1>
      <p>Sign in with Supabase Auth. The first account creates an organisation admin; later same-domain accounts need a pending invite.</p>
      {error && <div className="inline-error">{error}</div>}
      {message && <div className="inline-success">{message}</div>}
      <div className="auth-grid">
        <label><span>Email</span><input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <label><span>Name</span><input value={name} onChange={e => setName(e.target.value)} /></label>
        <label><span>Organisation</span><input value={organizationName} onChange={e => setOrganizationName(e.target.value)} /></label>
        <label><span>Team</span><input value={teamName} onChange={e => setTeamName(e.target.value)} /></label>
        <label><span>Role</span><select value={role} onChange={e => setRole(e.target.value)}><option>Analyst</option><option>PM</option><option>Compliance</option></select></label>
      </div>
      <div className="auth-actions">
        <button onClick={signIn}><LogIn size={15}/> Sign in</button>
        <button onClick={signUp}><Sparkles size={15}/> Create account</button>
        <button onClick={magicLink}><KeyRound size={15}/> Magic link</button>
      </div>
    </section>
  </main>;
}

function ClaimCard({ claim, compact = false, participantOptions = [], onUpdate }: { claim: Claim | FrontendWorkspaceClaim; compact?: boolean; participantOptions?: string[]; onUpdate?: (input: FrontendUpdateClaimInput) => void }) {
  const workspaceClaim = claim as Partial<FrontendWorkspaceClaim>;
  const status = workspaceClaim.reviewStatus ?? 'machine';
  const claimMetadata = metadataArraysFromSource(workspaceClaim);
  const [text, setText] = useState(claim.text);
  const [subject, setSubject] = useState(claim.subject);
  const [direction, setDirection] = useState<Direction>(claim.direction);
  const [themes, setThemes] = useState(claim.themes.join(', '));
  const [observedAt, setObservedAt] = useState(claim.observedAt);
  const [appliesToStart, setAppliesToStart] = useState(claim.appliesToStart);
  const [appliesToEnd, setAppliesToEnd] = useState(claim.appliesToEnd ?? '');
  const [horizon, setHorizon] = useState<Horizon>(claim.horizon);
  const [sourcePeople, setClaimSourcePeople] = useState(claimMetadata.sourcePeople);
  const [reviewNote, setReviewNote] = useState(workspaceClaim.reviewNote ?? '');

  useEffect(() => {
    const metadata = metadataArraysFromSource(workspaceClaim);
    setText(claim.text);
    setSubject(claim.subject);
    setDirection(claim.direction);
    setThemes(claim.themes.join(', '));
    setObservedAt(claim.observedAt);
    setAppliesToStart(claim.appliesToStart);
    setAppliesToEnd(claim.appliesToEnd ?? '');
    setHorizon(claim.horizon);
    setClaimSourcePeople(metadata.sourcePeople);
    setReviewNote(workspaceClaim.reviewNote ?? '');
  }, [claim.id, claim.text, claim.subject, claim.direction, claim.observedAt, claim.appliesToStart, claim.appliesToEnd, claim.horizon, claim.themes, workspaceClaim.reviewNote, workspaceClaim.linkedEntities, workspaceClaim.sourcePeople]);

  function save(reviewStatus: ClaimReviewStatus) {
    const linkedEntities = replaceLinkedEntityRoles(
      workspaceClaim.linkedEntities,
      legacyArraysToLinkedEntities({ sourcePeople }),
      ['source_person']
    );
    onUpdate?.({
      reviewStatus,
      text,
      subject,
      direction,
      themes: themes.split(',').map(theme => theme.trim()).filter(Boolean),
      observedAt,
      appliesToStart,
      appliesToEnd: appliesToEnd || undefined,
      horizon,
      sourcePeople,
      linkedEntities,
      reviewNote,
    });
  }

  return <article className={`claim ${claim.direction} ${status !== 'machine' ? 'reviewed' : ''} ${!compact && onUpdate ? 'editable' : ''}`}>
    <p>{claim.text}</p>
    <small>{claim.subject} · {claim.direction} · Extraction confidence {Math.round(claim.confidence * 100)}% · observed {claim.observedAt} · applies {claim.appliesToStart} to {claim.appliesToEnd ?? 'open'} · {claim.freshness} · {claim.visibility} · {status}</small>
    {!compact && onUpdate && <div className="claim-editor">
      <label><span>Claim</span><textarea value={text} onChange={e => setText(e.target.value)} /></label>
      <div className="metadata-grid compact">
        <label><span>Subject</span><input value={subject} onChange={e => setSubject(e.target.value)} /></label>
        <label><span>Direction</span><select value={direction} onChange={e => setDirection(e.target.value as Direction)}><option value="positive">positive</option><option value="negative">negative</option><option value="neutral">neutral</option></select></label>
        <label><span>Themes</span><input value={themes} onChange={e => setThemes(e.target.value)} /></label>
        <label><span>Observed</span><input type="date" value={observedAt} onChange={e => setObservedAt(e.target.value)} /></label>
        <label><span>Applies from</span><input type="date" value={appliesToStart} onChange={e => setAppliesToStart(e.target.value)} /></label>
        <label><span>Applies to</span><input type="date" value={appliesToEnd} onChange={e => setAppliesToEnd(e.target.value)} /></label>
        <label><span>Horizon</span><select value={horizon} onChange={e => setHorizon(e.target.value as Horizon)}><option value="point_in_time">point in time</option><option value="near_term">near term</option><option value="quarter">quarter</option><option value="year">year</option><option value="unknown">unknown</option></select></label>
      </div>
      <MetadataChipInput label="Participants" values={sourcePeople} options={participantOptions} onChange={setClaimSourcePeople} placeholder="Add person" />
      <label><span>Review note</span><textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} /></label>
      <div className="review-actions">
        <button onClick={() => save('edited')}><Save size={14}/> Save edit</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_confirmed', reviewNote, sourcePeople, linkedEntities: replaceLinkedEntityRoles(workspaceClaim.linkedEntities, legacyArraysToLinkedEntities({ sourcePeople }), ['source_person']) })}><Check size={14}/> Approve</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_rejected', reviewNote, sourcePeople, linkedEntities: replaceLinkedEntityRoles(workspaceClaim.linkedEntities, legacyArraysToLinkedEntities({ sourcePeople }), ['source_person']) })}><Ban size={14}/> Reject</button>
      </div>
    </div>}
  </article>;
}

function RelationshipMap({
  relations,
  notes,
  selected,
  asOf,
  latestAsOf,
  mapAsOf,
  loading,
  error,
  density,
  filters,
  options,
  onAsOfChange,
  onCurrentAsOf,
  onDensityChange,
  onFilterChange,
  onClearFilters,
  onStartCapture,
  onSelect,
  onUpdate
}: {
  relations: FrontendWorkspaceRelation[];
  notes: FrontendWorkspaceNote[];
  selected: string;
  asOf: string;
  latestAsOf: string;
  mapAsOf: string;
  loading: boolean;
  error: string;
  density: MapDensity;
  filters: MapFilters;
  options: ReturnType<typeof emptyMapFilterOptions>;
  onAsOfChange: (value: string) => void;
  onCurrentAsOf: () => void;
  onDensityChange: (value: MapDensity) => void;
  onFilterChange: (patch: Partial<MapFilters>) => void;
  onClearFilters: () => void;
  onStartCapture: () => void;
  onSelect: (subject: string) => void;
  onUpdate: (id: string, input: UpdateRelationInput) => void;
}) {
  const [selectedRelationId, setSelectedRelationId] = useState(relations[0]?.id ?? '');
  const filteredRelations = filterMapRelations(relations, filters, notes);
  const densityLimits = mapDensityLimits[density];
  const currentLane = buildMapLaneModel(filteredRelations, { asOf, density, lane: 'current', selectedRelationId, selectedSubject: selected });
  const historicalLane = buildMapLaneModel(filteredRelations, { asOf, density, lane: 'historical', selectedRelationId, selectedSubject: selected });
  const selectedRelation = filteredRelations.find(relation => relation.id === selectedRelationId) ?? filteredRelations[0];
  const relationEmptyState = emptyStateForRelations({ hasRelations: relations.length > 0, hasActiveFilters: activeMapFilterCount(filters, mapAsOf, latestAsOf) > 0 });

  useEffect(() => {
    if (filteredRelations.length && !filteredRelations.some(relation => relation.id === selectedRelationId)) {
      setSelectedRelationId(filteredRelations[0].id);
    }
  }, [filteredRelations, selectedRelationId]);

  return <article className="panel graph-panel">
    <div className="panel-title"><GitBranch/> Temporal claim graph - as of {asOf}</div>
    <div className="timeline-control">
      <label><span>As of</span><input type="date" value={mapAsOf} max={latestAsOf} onChange={event => onAsOfChange(event.target.value)} /></label>
      <button type="button" onClick={onCurrentAsOf} disabled={mapAsOf === latestAsOf || loading}>Current</button>
      <strong>Displayed {asOf}</strong>
      {loading && <span className="map-loading-state">Loading map...</span>}
      {error && <span className="map-error-state">{error}</span>}
    </div>
    <div className="map-filter-bar">
      <FilterSelect label="Security" value={filters.security ?? ''} options={options.securities} onChange={value => onFilterChange({ security: value })} />
      <FilterSelect label="Industry / Theme" value={filters.industryOrTheme ?? ''} options={options.industriesAndThemes} onChange={value => onFilterChange({ industryOrTheme: value })} />
      <FilterSelect label="Author" value={filters.authorId ?? ''} options={options.authors} onChange={value => onFilterChange({ authorId: value })} />
      <FilterSelect label="Team" value={filters.team ?? ''} options={options.teams} onChange={value => onFilterChange({ team: value })} />
      <FilterSelect label="Relation" value={filters.relationType ?? ''} options={relationTypes} onChange={value => onFilterChange({ relationType: value as RelationType | '' })} />
      <FilterSelect label="Freshness" value={filters.freshness ?? ''} options={options.freshness} onChange={value => onFilterChange({ freshness: value as MapFilters['freshness'] })} />
      <FilterSelect label="Participant" value={filters.sourcePerson ?? ''} options={options.sourcePeople} onChange={value => onFilterChange({ sourcePerson: value })} />
    </div>
    <div className="map-density-control" role="group" aria-label="Map density">
      <span>Density</span>
      {(['low', 'medium', 'high'] as MapDensity[]).map(value => <button key={value} type="button" className={density === value ? 'active' : ''} onClick={() => onDensityChange(value)}>{value}</button>)}
      <small>{densityLimits.graph} graph / {densityLimits.list} list</small>
    </div>
    {activeMapFilterEntries(filters, mapAsOf, latestAsOf).length > 0 && <div className="map-active-filters" aria-label="Active map filters">
      {activeMapFilterEntries(filters, mapAsOf, latestAsOf).map(item => <span key={item}>{item}</span>)}
      <button type="button" onClick={onClearFilters}>Clear</button>
    </div>}
    <div className="relation-legend"><span className="contradiction">red true contradiction</span><span className="open_tension">amber tension</span><span className="update_or_trend_reversal">blue trend reversal</span><span className="corroboration">green corroboration</span><span className="stale_evidence">grey stale evidence</span></div>
    {filteredRelations.length ? <div className="map-lanes">
      <section className="map-lane current">
        <div className="map-lane-head"><h3>Current / upcoming</h3><span>{currentLane.relations.length} relations</span></div>
        {currentLane.graphRelations.length ? <div className="graph-canvas" aria-label="Current relationship graph">
          <div className="node primary"><CircleDot/> {selected}</div>
          {currentLane.graphRelations.map(r => {
            const node = currentLane.nodes.find(item => item.relationId === r.id);
            return node ? <React.Fragment key={r.id}>
              <button className={`node satellite ${node.type} ${node.selected ? 'selected' : ''}`} style={mapNodeStyle(node)} onClick={() => {
                setSelectedRelationId(r.id);
                onSelect(node.subject);
              }}>{node.subject}<small>{node.label}</small></button>
              <i className={`edge ${node.type}`} style={mapEdgeStyle(node)} />
            </React.Fragment> : null;
          })}
        </div> : <p className="map-lane-empty">No current or upcoming endpoints at this as-of date.</p>}
        {currentLane.hiddenGraphCount > 0 && <p className="map-lane-overflow">{currentLane.hiddenGraphCount} hidden by density</p>}
        <div className="relation-list">
          {currentLane.listRelations.map(r => <RelationCard key={r.id} relation={r} asOf={asOf} selected={r.id === selectedRelation?.id} onSelect={() => setSelectedRelationId(r.id)} onUpdate={input => onUpdate(r.id, input)} />)}
        </div>
        {currentLane.hiddenListCount > 0 && <p className="map-lane-overflow">{currentLane.hiddenListCount} list items hidden by density</p>}
      </section>
      <section className="map-lane historical">
        <div className="map-lane-head"><h3>Historical / ended</h3><span>{historicalLane.relations.length} relations</span></div>
        {historicalLane.graphRelations.length ? <div className="graph-canvas" aria-label="Historical relationship graph">
          <div className="node primary"><CircleDot/> {selected}</div>
          {historicalLane.graphRelations.map(r => {
            const node = historicalLane.nodes.find(item => item.relationId === r.id);
            return node ? <React.Fragment key={r.id}>
              <button className={`node satellite ${node.type} ${node.selected ? 'selected' : ''}`} style={mapNodeStyle(node)} onClick={() => {
                setSelectedRelationId(r.id);
                onSelect(node.subject);
              }}>{node.subject}<small>{node.label}</small></button>
              <i className={`edge ${node.type}`} style={mapEdgeStyle(node)} />
            </React.Fragment> : null;
          })}
        </div> : <p className="map-lane-empty">No fully historical or ended relations at this as-of date.</p>}
        {historicalLane.hiddenGraphCount > 0 && <p className="map-lane-overflow">{historicalLane.hiddenGraphCount} hidden by density</p>}
        <div className="relation-list">
          {historicalLane.listRelations.map(r => <RelationCard key={r.id} relation={r} asOf={asOf} selected={r.id === selectedRelation?.id} onSelect={() => setSelectedRelationId(r.id)} onUpdate={input => onUpdate(r.id, input)} />)}
        </div>
        {historicalLane.hiddenListCount > 0 && <p className="map-lane-overflow">{historicalLane.hiddenListCount} list items hidden by density</p>}
      </section>
    </div> : <EmptyState title={relationEmptyState.title} body={relationEmptyState.body} actions={emptyStateActions(relationEmptyState, { capture: onStartCapture, 'clear-filters': onClearFilters })} />}
    {selectedRelation && <RelationDetailDrawer relation={selectedRelation} asOf={asOf} onUpdate={input => onUpdate(selectedRelation.id, input)} />}
  </article>;
}

function mapNodeStyle(node: { x: string; y: string }): React.CSSProperties & Record<'--node-x' | '--node-y', string> {
  return {
    '--node-x': node.x,
    '--node-y': node.y
  };
}

function mapEdgeStyle(node: { edgeRotation: string; edgeWidth: string }): React.CSSProperties & Record<'--edge-rotation' | '--edge-width', string> {
  return {
    '--edge-rotation': node.edgeRotation,
    '--edge-width': node.edgeWidth
  };
}

function RelationCard({ relation, asOf = today(), selected, onSelect, onUpdate }: { relation: FrontendWorkspaceRelation; asOf?: string; selected: boolean; onSelect: () => void; onUpdate: (input: UpdateRelationInput) => void }) {
  const [type, setType] = useState<RelationType>(relation.type);
  const [reviewNote, setReviewNote] = useState(relation.reviewNote ?? '');
  const statuses = relationWindowStatuses(relation, asOf);

  useEffect(() => {
    setType(relation.type);
    setReviewNote(relation.reviewNote ?? '');
  }, [relation.id, relation.type, relation.reviewNote]);

  return <article className={`${relation.type} ${selected ? 'selected' : ''}`}>
    <b>{relationLabel(relation.type)} · Evidence strength {Math.round(relation.score * 100)}% · {relation.reviewStatus}</b>
    <p><span>{relation.a.appliesToStart} to {relation.a.appliesToEnd ?? 'open'}</span><span className={`window-status-chip ${statuses.a}`}>{statusLabel(statuses.a)}</span> {relation.a.text}</p>
    <p><span>{relation.b.appliesToStart} to {relation.b.appliesToEnd ?? 'open'}</span><span className={`window-status-chip ${statuses.b}`}>{statusLabel(statuses.b)}</span> {relation.b.text}</p>
    <small>{relation.reason} Source-person context: {relation.sourcePersonContext ?? 'unknown'}. Snippets are shown so analysts can see why this is or is not a contradiction.</small>
    <label className="relation-review-note"><span>Review note</span><textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} /></label>
    <div className="relation-actions">
      <button onClick={onSelect}><Eye size={14}/> Details</button>
      <button onClick={() => onUpdate({ reviewStatus: 'confirmed', reviewNote })}><Check size={14}/> Confirm</button>
      <button onClick={() => onUpdate({ reviewStatus: 'dismissed', reviewNote })}><Ban size={14}/> Dismiss</button>
      <select value={type} onChange={event => setType(event.target.value as RelationType)}>{relationTypes.map(item => <option key={item} value={item}>{relationLabel(item)}</option>)}</select>
      <button onClick={() => onUpdate({ reviewStatus: 'reclassified', type, reviewNote })}><Edit3 size={14}/> Reclassify</button>
    </div>
  </article>;
}

function RelationDetailDrawer({ relation, asOf = today(), onUpdate }: { relation: FrontendWorkspaceRelation; asOf?: string; onUpdate?: (input: UpdateRelationInput) => void }) {
  const [type, setType] = useState<RelationType>(relation.type);
  const [reviewNote, setReviewNote] = useState(relation.reviewNote ?? '');
  const statuses = relationWindowStatuses(relation, asOf);

  useEffect(() => {
    setType(relation.type);
    setReviewNote(relation.reviewNote ?? '');
  }, [relation.id, relation.type, relation.reviewNote]);

  return <aside className="relation-detail-drawer" aria-label="Relation detail">
    <div className="panel-title"><PanelLeft/> Relation detail</div>
    <div className="relation-detail-grid">
      <span>Current type<b>{relationLabel(relation.type)}</b></span>
      <span>Original type<b>{relationLabel(relation.originalType)}</b></span>
      <span>Overlap days<b>{relation.overlapDays}</b></span>
      <span>Evidence strength<b>{Math.round(relation.score * 100)}%</b></span>
      <span>Review state<b>{relation.reviewStatus}</b></span>
      <span>People context<b>{relation.sourcePersonContext ?? 'unknown'}</b></span>
      <span>Review note<b>{relation.reviewNote || 'None'}</b></span>
      <span>Endpoint A window<b><i className={`window-status-chip ${statuses.a}`}>{statusLabel(statuses.a)}</i></b></span>
      <span>Endpoint B window<b><i className={`window-status-chip ${statuses.b}`}>{statusLabel(statuses.b)}</i></b></span>
    </div>
    <div className="relation-detail-claims">
      <div className="relation-detail-claim">
        <b>{relation.a.subject} · {relation.a.direction}</b>
        <small>observed {relation.a.observedAt} · applies {relation.a.appliesToStart} to {relation.a.appliesToEnd ?? 'open'} · {statusLabel(statuses.a)}</small>
        <p>{relation.a.text}</p>
      </div>
      <div className="relation-detail-claim">
        <b>{relation.b.subject} · {relation.b.direction}</b>
        <small>observed {relation.b.observedAt} · applies {relation.b.appliesToStart} to {relation.b.appliesToEnd ?? 'open'} · {statusLabel(statuses.b)}</small>
        <p>{relation.b.text}</p>
      </div>
    </div>
    <p>{relation.reason}</p>
    {onUpdate && <div className="relation-detail-review">
      <label className="relation-review-note"><span>Analyst review note</span><textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} /></label>
      <div className="relation-actions">
        <button onClick={() => onUpdate({ reviewStatus: 'confirmed', reviewNote })}><Check size={14}/> Confirm</button>
        <button onClick={() => onUpdate({ reviewStatus: 'dismissed', reviewNote })}><Ban size={14}/> Dismiss</button>
        <select value={type} onChange={event => setType(event.target.value as RelationType)}>{relationTypes.map(item => <option key={item} value={item}>{relationLabel(item)}</option>)}</select>
        <button onClick={() => onUpdate({ reviewStatus: 'reclassified', type, reviewNote })}><Edit3 size={14}/> Reclassify</button>
      </div>
    </div>}
  </aside>;
}

function statusLabel(status: UiWindowStatus): string {
  return status;
}

function PersonMemoryPanel({ people, onSelectPerson, onStartCapture }: { people: PersonMemorySummary[]; onSelectPerson: (name: string) => void; onStartCapture: () => void }) {
  const emptyState = emptyStates['no-source-person-history'];
  return <article className="dashboard-chart-card dashboard-widget-card person-memory-panel">
    <div className="panel-title"><Network/> Source-person memory</div>
    {people.length ? <div className="person-memory-list">
      {people.slice(0, 6).map(person => <button type="button" key={person.name} onClick={() => onSelectPerson(person.name)}>
        <span>{person.name}</span>
        <small>{person.claimCount} claims Â· latest {person.latestDirection ?? 'unknown'}{person.latestObservedAt ? ` Â· ${person.latestObservedAt}` : ''}</small>
        <b>{person.positiveCount ?? 0}+ / {person.negativeCount ?? 0}- / {person.neutralCount ?? 0} neutral</b>
        <em>{(person.subjects ?? []).slice(0, 3).join(', ') || 'No subjects yet'} Â· {person.contradictionCount ?? 0} contradictions Â· {person.trendReversalCount ?? 0} reversals</em>
      </button>)}
    </div> : <EmptyState title={emptyState.title} body={emptyState.body} actions={emptyStateActions(emptyState, { capture: onStartCapture })} showIcon={false} />}
  </article>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <div className="metric">{icon}<b>{value}</b><span>{label}</span><small>{sub}</small></div>;
}

type EmptyStateButtonAction = {
  label: string;
  onClick: () => void;
};

function EmptyState({ title, body, actions = [], showIcon = true }: { title: string; body: string; actions?: EmptyStateButtonAction[]; showIcon?: boolean }) {
  return <div className={showIcon ? 'empty' : 'empty no-icon'}>
    {showIcon && <Sparkles size={18}/>}
    <b>{title}</b>
    <p>{body}</p>
    {actions.length > 0 && <div className="empty-actions">
      {actions.map(action => <button type="button" key={action.label} onClick={action.onClick}>{action.label}<ArrowUpRight size={12}/></button>)}
    </div>}
  </div>;
}

function emptyStateActions(copy: EmptyStateCopy, handlers: Partial<Record<EmptyStateActionTarget, () => void>>): EmptyStateButtonAction[] {
  return copy.actions.flatMap(action => {
    const onClick = handlers[action.target];
    return onClick ? [{ label: action.label, onClick }] : [];
  });
}

function StatusScreen({ title, body }: { title: string; body: string }) {
  return <main className="auth-shell"><section className="auth-panel panel"><div className="panel-title"><Sparkles/> Mycelium</div><h1>{title}</h1><p>{body}</p></section></main>;
}

function tickerToCompany(ticker: string) {
  const map: Record<string, string> = { NVDA: 'Nvidia', AAPL: 'Apple', TSLA: 'Tesla', SHOP: 'Shopify', MSFT: 'Microsoft' };
  return map[ticker] ?? ticker;
}

function knownTickers(): string[] {
  return Object.values(companyLexicon).map(item => item.ticker).sort((a, b) => a.localeCompare(b));
}

function mergeEntities(primary: PreviewEntity[], manual: PreviewEntity[]): PreviewEntity[] {
  const seen = new Set<string>();
  return [...primary, ...manual].filter(entity => {
    const key = `${entity.kind}:${entity.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyFilterOptions(): FrontendNoteFilterOptions {
  return { tickers: [], themes: [], kpis: [], industries: [], watchlists: [], sourcePeople: [], visibilities: [], accessScopes: [] };
}

function emptyMapFilterOptions() {
  return {
    securities: [] as string[],
    industriesAndThemes: [] as string[],
    sourcePeople: [] as string[],
    authors: [] as SelectOption[],
    teams: [] as string[],
    freshness: ['fresh', 'aging', 'stale']
  };
}

function hasDraftContent(draft: Partial<FrontendNoteDraft>) {
  const metadata = metadataArraysFromSource(draft);
  return Boolean(
    draft.title?.trim()
    || draft.body?.trim()
    || metadata.tickers.length
    || metadata.manualThemes.length
    || metadata.kpis.length
    || metadata.industries.length
    || metadata.companyTags.length
    || metadata.watchlistTags.length
    || metadata.sourcePeople.length
    || draft.audioImportJobId
  );
}

function draftSignature(draft: Partial<FrontendNoteDraft>) {
  const metadata = metadataArraysFromSource(draft);
  return JSON.stringify({
    selectedNoteId: draft.selectedNoteId ?? '',
    title: draft.title ?? '',
    body: draft.body ?? '',
    accessScope: draft.accessScope ?? (draft.visibility ? accessScopeFromVisibility(draft.visibility) : 'personal'),
    teamId: draft.teamId ?? '',
    observedAt: draft.observedAt ?? '',
    audioImportJobId: draft.audioImportJobId ?? '',
    ...metadata,
    linkedEntities: draft.linkedEntities ?? legacyArraysToLinkedEntities(metadata)
  });
}

function metadataArraysFromSource(source: FrontendMetadata = {}): MetadataArrays {
  const linked = metadataArraysFromLinkedEntities(source.linkedEntities ?? []);
  return {
    tickers: normalizeTickerTags([...(source.tickers ?? []), ...linked.tickers]),
    manualThemes: normalizeTags([...(source.manualThemes ?? []), ...linked.manualThemes]),
    kpis: normalizeTags([...(source.kpis ?? []), ...linked.kpis]),
    industries: normalizeTags([...(source.industries ?? []), ...linked.industries]),
    companyTags: normalizeTags([...(source.companyTags ?? []), ...linked.companyTags]),
    watchlistTags: normalizeTags([...(source.watchlistTags ?? []), ...linked.watchlistTags]),
    sourcePeople: normalizeTags([...(source.sourcePeople ?? []), ...linked.sourcePeople])
  };
}

function metadataFromParsedNoteImport(imported: ParsedNoteImport): FrontendMetadata {
  return {
    tickers: imported.tickers,
    manualThemes: imported.manualThemes,
    kpis: imported.kpis,
    industries: imported.industries,
    companyTags: imported.companyTags,
    watchlistTags: imported.watchlistTags,
    sourcePeople: imported.sourcePeople,
    linkedEntities: imported.linkedEntities
  };
}

function noteImportWarningMessage(warning: NoteImportWarningForUi): string {
  return typeof warning === 'string' ? warning : warning.message;
}

function normalizeAudioImportJobForWorkbench(job: AudioImportJob, transcriptChunks: TranscriptChunkRecord[]): ParsedNoteImport {
  return normalizeReadyAudioTranscriptionJob({
    id: job.id,
    status: job.status === 'ready' ? 'ready' : job.status === 'failed' ? 'failed' : 'processing',
    filename: job.fileName,
    chunks: transcriptChunks.map(chunk => ({
      startTime: audioMsToTimestamp(chunk.startMs),
      endTime: audioMsToTimestamp(chunk.endMs) || undefined,
      speaker: chunk.speaker,
      text: chunk.text,
      confidence: chunk.confidence
    }))
  });
}

function audioMsToTimestamp(value: number | undefined): string {
  if (value == null) return '';
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const milliseconds = Math.max(0, value % 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function addTag(values: string[], value: string, transform: (value: string) => string = item => item): string[] {
  return normalizeTags([...values, transform(value).trim()]);
}

function normalizeTickerTags(values: string[]): string[] {
  return normalizeTags(values.map(value => value.toUpperCase()));
}

function extendNoteFilterOptions(options: NoteFilterOptions, notes: FrontendWorkspaceNote[]): FrontendNoteFilterOptions {
  return {
    ...options,
    industries: sortedUnique(notes.flatMap(note => metadataArraysFromSource(note).industries)),
    watchlists: sortedUnique(notes.flatMap(note => metadataArraysFromSource(note).watchlistTags)),
    sourcePeople: sortedUnique(notes.flatMap(note => metadataArraysFromSource(note).sourcePeople)),
    accessScopes: options.accessScopes.length ? options.accessScopes : ['personal', 'team', 'organization']
  };
}

function filterFrontendNotes(notes: FrontendWorkspaceNote[], filters: FrontendNoteFilters): FrontendWorkspaceNote[] {
  return filterAndSortNotes(notes, filters).filter(note => {
    const metadata = metadataArraysFromSource(note);
    return matchesTag(metadata.industries, filters.industry)
      && matchesTag(metadata.watchlistTags, filters.watchlist)
      && matchesTag(metadata.sourcePeople, filters.sourcePerson);
  });
}

function deriveMapFilterOptions(graph: FrontendWorkspaceSnapshot): ReturnType<typeof emptyMapFilterOptions> {
  const empty = emptyMapFilterOptions();
  const claimMetadata = graph.claims.map(claim => metadataArraysFromSource(claim));
  const noteMetadata = graph.visibleNotes.map(note => metadataArraysFromSource(note));
  return {
    securities: sortedUnique([...claimMetadata, ...noteMetadata].flatMap(metadata => metadata.tickers)),
    industriesAndThemes: sortedUnique([...claimMetadata, ...noteMetadata].flatMap(metadata => [...metadata.industries, ...metadata.manualThemes])),
    sourcePeople: sortedUnique([...claimMetadata, ...noteMetadata].flatMap(metadata => metadata.sourcePeople)),
    authors: authorOptions(graph),
    teams: sortedUnique([
      ...graph.claims.map(claim => claim.team),
      ...graph.visibleNotes.map(note => note.team)
    ].filter((team): team is string => Boolean(team))),
    freshness: empty.freshness
  };
}

function authorOptions(graph: FrontendWorkspaceSnapshot): SelectOption[] {
  const authors = new Map<string, string>();
  for (const note of graph.visibleNotes) {
    authors.set(note.authorId, note.authorName || note.authorId);
  }
  for (const claim of graph.claims) {
    authors.set(claim.authorId, claim.authorName || claim.authorId);
  }
  return [...authors.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
}

function filterMapRelations(relations: FrontendWorkspaceRelation[], filters: MapFilters, notes: FrontendWorkspaceNote[]): FrontendWorkspaceRelation[] {
  return relations.filter(relation => {
    const a = claimMetadataWithNoteFallback(relation.a, notes);
    const b = claimMetadataWithNoteFallback(relation.b, notes);
    return (!filters.security || matchesTag([...a.tickers, ...b.tickers], filters.security))
      && (!filters.industryOrTheme || matchesTag([...a.industries, ...a.manualThemes, ...b.industries, ...b.manualThemes], filters.industryOrTheme))
      && (!filters.relationType || relation.type === filters.relationType)
      && (!filters.freshness || relation.a.freshness === filters.freshness || relation.b.freshness === filters.freshness)
      && (!filters.sourcePerson || matchesTag([...a.sourcePeople, ...b.sourcePeople], filters.sourcePerson))
      && (!filters.authorId || relation.a.authorId === filters.authorId || relation.b.authorId === filters.authorId)
      && (!filters.team || relation.a.team === filters.team || relation.b.team === filters.team);
  });
}

function accessScopeLabel(scope: AccessScope): string {
  if (scope === 'organization') return 'Organisation';
  if (scope === 'team') return 'Team';
  return 'Personal';
}

function noteLocationLabel(note: Pick<FrontendWorkspaceNote, 'accessScope' | 'visibility' | 'team'>): string {
  const scope = note.accessScope ?? accessScopeFromVisibility(note.visibility);
  return scope === 'team' ? note.team ?? 'Team' : accessScopeLabel(scope);
}

function claimMetadataWithNoteFallback(claim: FrontendWorkspaceClaim, notes: FrontendWorkspaceNote[]): MetadataArrays {
  const claimMetadata = metadataArraysFromSource(claim);
  const note = notes.find(item => item.id === claim.noteId);
  if (!note) return claimMetadata;
  const noteMetadata = metadataArraysFromSource(note);
  return {
    tickers: sortedUnique([...claimMetadata.tickers, ...noteMetadata.tickers]),
    manualThemes: sortedUnique([...claimMetadata.manualThemes, ...noteMetadata.manualThemes]),
    kpis: sortedUnique([...claimMetadata.kpis, ...noteMetadata.kpis]),
    industries: sortedUnique([...claimMetadata.industries, ...noteMetadata.industries]),
    companyTags: sortedUnique([...claimMetadata.companyTags, ...noteMetadata.companyTags]),
    watchlistTags: sortedUnique([...claimMetadata.watchlistTags, ...noteMetadata.watchlistTags]),
    sourcePeople: sortedUnique([...claimMetadata.sourcePeople, ...noteMetadata.sourcePeople])
  };
}

function relationMatchesSubject(relation: FrontendWorkspaceRelation, subject: string): boolean {
  return relation.a.subject === subject
    || relation.b.subject === subject
    || relation.a.themes.includes(subject)
    || relation.b.themes.includes(subject);
}

function relationTouchesSelectedNote(relation: FrontendWorkspaceRelation, selectedNoteId: string): boolean {
  return relation.a.noteId === selectedNoteId || relation.b.noteId === selectedNoteId;
}

function normalizeDashboardSnapshot(snapshot: DashboardSnapshot): DashboardSnapshot {
  const partial = snapshot as Partial<DashboardSnapshot>;
  const totals = partial.totals;
  const relationMix = partial.relationMix;
  const freshness = partial.freshness;
  const reviewBacklog = partial.reviewBacklog;

  return {
    ...snapshot,
    totals: {
      notes: totals?.notes ?? 0,
      claims: totals?.claims ?? 0,
      relations: totals?.relations ?? 0,
      activeClaims: totals?.activeClaims ?? totals?.claims ?? 0
    },
    relationMix: {
      contradiction: relationMix?.contradiction ?? 0,
      update_or_trend_reversal: relationMix?.update_or_trend_reversal ?? 0,
      historical_tension: relationMix?.historical_tension ?? 0,
      open_tension: relationMix?.open_tension ?? 0,
      corroboration: relationMix?.corroboration ?? 0,
      agreement: relationMix?.agreement ?? 0,
      stale_evidence: relationMix?.stale_evidence ?? 0
    },
    freshness: {
      fresh: freshness?.fresh ?? 0,
      aging: freshness?.aging ?? 0,
      stale: freshness?.stale ?? 0
    },
    reviewBacklog: {
      claims: reviewBacklog?.claims ?? 0,
      relations: reviewBacklog?.relations ?? 0
    },
    scopeAvailability: partial.scopeAvailability ?? defaultDashboardScopeAvailability(),
    teams: partial.teams ?? [],
    topCompanies: partial.topCompanies ?? [],
    topThemes: partial.topThemes ?? [],
    topKpis: partial.topKpis ?? [],
    topSecurities: partial.topSecurities ?? [],
    topWatchlists: partial.topWatchlists ?? [],
    topSourcePeople: partial.topSourcePeople ?? [],
    signals: partial.signals ?? [],
    activity: partial.activity ?? []
  };
}

function defaultDashboardScopeAvailability(): DashboardSnapshot['scopeAvailability'] {
  return [
    { scope: 'workspace', label: 'Workspace', enabled: true },
    { scope: 'team', label: 'Team', enabled: true },
    { scope: 'org', label: 'Org', enabled: false, reason: 'Only PM or Compliance users can view organization-wide dashboard aggregates.' }
  ];
}

function dashboardRangeLabel(range: DashboardRange): string {
  if (range === '30d') return 'Last 30 days';
  if (range === '90d') return 'Last 90 days';
  return 'All time';
}

function dashboardFreshnessShare(dashboard: DashboardSnapshot, key: 'fresh' | 'aging' | 'stale'): string {
  const total = Math.max(1, dashboard.freshness.fresh + dashboard.freshness.aging + dashboard.freshness.stale);
  return `${Math.round((dashboard.freshness[key] / total) * 100)}%`;
}

function replaceLinkedEntityRoles(existing: LinkedEntity[] = [], replacements: LinkedEntity[] = [], roles: EntityRole[]): LinkedEntity[] {
  const roleSet = new Set<EntityRole>(roles);
  return mergeLinkedEntities(existing.filter(entity => !roleSet.has(entity.role)), replacements);
}

function industryOptions(options: FrontendNoteFilterOptions): string[] {
  return sortedUnique([...options.industries, ...themeLexicon]);
}

function suggestionLabel(kind: PreviewEntityKind): string {
  if (kind === 'source_person') return 'person';
  return kind;
}

function chipKind(kind: PreviewEntityKind): string {
  return kind === 'source_person' ? 'person' : kind;
}

function matchesTag(values: string[] | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  return (values ?? []).some(value => value.toLowerCase() === expected.toLowerCase());
}

function sortedUnique(values: string[]): string[] {
  return normalizeTags(values).sort((a, b) => a.localeCompare(b));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function browserStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Mycelium root element was not found.');
const root = window.__myceliumRoot ?? createRoot(rootElement);
window.__myceliumRoot = root;
root.render(<App />);
