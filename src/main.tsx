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
  Command,
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
  createNote,
  deleteNoteDraft,
  loadAuthBootstrap,
  loadDashboard,
  loadNoteDraft,
  loadNoteHistory,
  loadWorkspace,
  updateClaim,
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
  type Claim,
  type Direction,
  type Entity,
  type Horizon,
  type Note,
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
import type {
  ClaimReviewStatus,
  DashboardRange,
  DashboardScope,
  DashboardSnapshot,
  DashboardTopItem,
  NoteDraft,
  NoteRevision,
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
  visibility: Note['visibility'];
  observedAt?: string;
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
}
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

type ViewMode = 'notes' | 'dashboard' | 'map' | 'archive';
const DEFAULT_NOTE_SOURCE_TYPE = 'Typed note';

function App() {
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [authError, setAuthError] = useState('');
  const [appError, setAppError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('Nvidia');
  const [noteTitle, setNoteTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState<Note['visibility']>('team');
  const [observedAt, setObservedAt] = useState(today());
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>('workspace');
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>('90d');
  const [dashboardTeamId, setDashboardTeamId] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
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
  const clearedDraftSignatureRef = useRef('');

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
            setDashboard(null);
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

  useEffect(() => {
    if (!session) return;
    void refreshDashboard(session);
  }, [session, dashboardScope, dashboardRange, dashboardTeamId]);

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

  function focusCapture() {
    setViewMode('notes');
  }

  function clearNoteFilters() {
    setNoteFilters({ sort: 'newest' });
  }

  function clearMapFilters() {
    setMapFilters({});
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
      setVisibility(savedDraft.visibility);
      setObservedAt(savedDraft.observedAt ?? today());
      applyWorkbenchMetadata(savedDraft);
      clearedDraftSignatureRef.current = draftSignature(savedDraft);
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
      visibility,
      observedAt,
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
  }, [session, workspace, selectedNoteId, noteTitle, draft, visibility, observedAt, tickers, manualThemes, kpis, industries, companyTags, watchlistTags, sourcePeople]);

  async function saveWorkbenchNote() {
    if (selectedNoteId) {
      await saveExistingNote();
    } else {
      await addNote();
    }
  }

  async function addNote() {
    if (!session || !draft.trim()) return;
    try {
      const input: FrontendNotePayload = {
        title: noteTitle.trim() || undefined,
        body: draft,
        visibility,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      };
      const next = await createNote(session, input);
      setWorkspace(next);
      const firstClaim = extractClaims(previewNote())[0];
      if (firstClaim) setSelected(firstClaim.subject);
      setNoteTitle('');
      setDraft('');
      resetWorkbenchMetadata();
      setSelectedNoteId('');
      setViewMode('notes');
      clearedDraftSignatureRef.current = '';
      await deleteNoteDraft(session);
      void refreshDashboard(session);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
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
        visibility,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      };
      const next = await updateNote(session, selectedNoteId, input);
      setWorkspace(next);
      clearedDraftSignatureRef.current = draftSignature({
        selectedNoteId,
        title: noteTitle,
        body: draft,
        visibility,
        observedAt,
        ...currentMetadataArrays(),
        linkedEntities: currentLinkedEntities()
      });
      await deleteNoteDraft(session);
      const history = await loadNoteHistory(session, selectedNoteId);
      setNoteHistory(history);
      setHistoryDrawerOpen(false);
      void refreshDashboard(session);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
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
      setWorkspace(await updateClaim(session, id, input));
      void refreshDashboard(session);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  async function patchRelation(id: string, input: UpdateRelationInput) {
    if (!session) return;
    try {
      setWorkspace(await updateRelation(session, id, input));
      void refreshDashboard(session);
    } catch (error) {
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
      team: viewer?.team ?? 'Research',
      visibility,
      sourceType: DEFAULT_NOTE_SOURCE_TYPE,
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
    setVisibility('team');
    setObservedAt(date);
    resetWorkbenchMetadata();
    setNoteHistory([]);
    setHistoryDrawerOpen(false);
    clearedDraftSignatureRef.current = '';
    setViewMode('notes');
    if (session) {
      deleteNoteDraft(session).catch(error => {
        setAppError(error instanceof Error ? error.message : String(error));
      });
    }
  }

  async function signOut() {
    await authClient?.auth.signOut();
    setWorkspace(null);
    setDashboard(null);
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
  const user = graph?.viewer;
  const selectedNote = selectedNoteId ? graph?.visibleNotes.find(note => note.id === selectedNoteId) : undefined;
  const canEditSelectedNote = !selectedNoteId || selectedNote?.authorId === user?.id;
  const workbenchActionLabel = selectedNoteId ? 'Save note' : 'Add note';
  const subjects = graph ? [...graph.companies, ...graph.themes] : [];
  const selectedSynth = subjects.find(s => s.subject === selected) ?? graph?.companies[0] ?? graph?.themes[0];
  const subjectRelations = graph?.relations.filter(r => !selectedSynth || relationMatchesSubject(r, selectedSynth.subject)) ?? [];
  const mapRelations = graph ? (subjectRelations.length ? subjectRelations : graph.relations) : [];
  const preview = previewNote();
  const previewClaims = extractClaims(preview);
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
  const mapFilterOptions = graph ? deriveMapFilterOptions(graph) : emptyMapFilterOptions();
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

  if (loading) return <StatusScreen title="Connecting to Mycelium" body="Loading auth and workspace services." />;
  if (!session || !workspace || !user) {
    return <AuthScreen authClient={authClient} error={authError || appError} onError={setAuthError} />;
  }

  return <main className={`app-main ${notesCollapsed ? 'notes-collapsed' : ''}`}>
    <aside className="left-rail" aria-label="Workspace navigation">
      <div className="mark"><span>M</span></div>
      <nav>
        <button className={viewMode === 'notes' ? 'active' : ''} onClick={() => setViewMode('notes')} title="Notes"><BookOpen size={18}/></button>
        <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => setViewMode('dashboard')} title="Dashboard"><BarChart3 size={18}/></button>
        <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')} title="Relationship map"><GitBranch size={18}/></button>
        <button className={viewMode === 'archive' ? 'active' : ''} onClick={() => setViewMode('archive')} title="Archive"><Layers3 size={18}/></button>
      </nav>
      <button className="rail-footer" type="button" onClick={signOut} title="Sign out"><LogOut size={16}/><span>{user.role}</span></button>
    </aside>

    <NotesSidebar
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
        clearedDraftSignatureRef.current = draftSignature({
          selectedNoteId: note.id,
          title: note.title,
          body: note.body,
          visibility: note.visibility,
          observedAt: note.observedAt ?? note.createdAt,
          ...metadataArraysFromSource(note),
          linkedEntities: (note as FrontendWorkspaceNote).linkedEntities ?? []
        });
        setSelectedNoteId(note.id);
        setNoteTitle(note.title);
        setDraft(note.body);
        setVisibility(note.visibility);
        setObservedAt(note.observedAt ?? note.createdAt);
        applyWorkbenchMetadata(note as FrontendWorkspaceNote);
        setNoteHistory([]);
        setHistoryDrawerOpen(false);
        clearedDraftSignatureRef.current = '';
        setViewMode('notes');
      }}
    />

    <section className={`shell page-shell ${viewMode}-page`}>
      {appError && <div className="inline-error">{appError}</div>}

      {viewMode === 'notes' && <NotesPage>
      <section className="note-workbench">
        <article className="capture panel primary-note">
          <div className="note-panel-head">
            <div className="panel-title"><FilePlus2/> Note</div>
            <div className="note-panel-actions">
              {selectedNoteId && <button type="button" className="history-note-action" onClick={openNoteHistory}><History size={14}/>History</button>}
              <button type="button" className="new-note-action" onClick={startNewNote}><FilePlus2 size={14}/>New note</button>
            </div>
          </div>
          <div className="note-meta">
            <span>{user.team}</span>
            <span>{observedAt}</span>
          </div>
          <input className="note-title-input" value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Title..." aria-label="Note title" />
          <MarkdownEditor value={draft} onChange={setDraft} onSubmit={saveWorkbenchNote} />
          <div className="metadata-grid">
            <label><span>Observed</span><input type="date" value={observedAt} onChange={e => setObservedAt(e.target.value)} /></label>
            <label><span>Visibility</span><select value={visibility} onChange={e => setVisibility(e.target.value as Note['visibility'])}><option value="public">public</option><option value="team">team</option><option value="private">private</option></select></label>
            <label><span>Team</span><input value={user.team} readOnly /></label>
          </div>
          <div className="metadata-linking">
            <MetadataChipInput label="Securities/Tickers" values={tickers} options={knownTickers()} onChange={setTickers} transform={value => value.toUpperCase()} placeholder="Add ticker" />
            <MetadataChipInput label="Industries/Sectors" values={industries} options={industryOptions(noteFilterOptions)} onChange={setIndustries} placeholder="Add industry" />
            <MetadataChipInput label="Themes" values={manualThemes} options={themeLexicon} onChange={setManualThemes} placeholder="Add theme" />
            <MetadataChipInput label="KPIs" values={kpis} options={kpiWords} onChange={setKpis} placeholder="Add KPI" />
            <MetadataChipInput label="Watchlists" values={watchlistTags} options={noteFilterOptions.watchlists} onChange={setWatchlistTags} placeholder="Add watchlist" />
            <MetadataChipInput label="Participants" values={sourcePeople} options={noteFilterOptions.sourcePeople} onChange={setSourcePeople} placeholder="Add person" />
          </div>
          <div className="capture-actions">
            <button onClick={saveWorkbenchNote} disabled={!draft.trim() || !canEditSelectedNote}>{workbenchActionLabel} <span><Command size={13}/> Enter</span></button>
          </div>
          {selectedNoteId && !canEditSelectedNote && <p className="note-edit-lock"><LockKeyhole size={13}/> Only the note author can save changes.</p>}
        </article>

        <aside className="note-side">
          <article className="panel live-preview">
            <div className="panel-title"><Eye/> Live extraction</div>
            {previewEntities.length ? <div className="entity-cloud">
              {previewEntities.slice(0, 12).map(e => <button type="button" className={`chip ${chipKind(e.kind)}`} key={`${e.kind}-${e.name}`} onClick={() => addPreviewEntity(e)}><Plus size={12}/>{suggestionLabel(e.kind)}<b>{e.name}</b></button>)}
            </div> : <EmptyState title="No entities yet" body="Mention a company, ticker, KPI, or theme and the graph starts forming here." />}
            <div className="preview-claims">
              {previewClaims.map(c => <ClaimCard key={c.id} claim={c} compact />)}
            </div>
          </article>

        </aside>
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
            <RelationshipMap relations={mapRelations} notes={graph.visibleNotes} selected={selectedSynth?.subject ?? selected} asOf={graph.asOf} filters={mapFilters} options={mapFilterOptions} onFilterChange={patch => setMapFilters(current => ({ ...current, ...patch }))} onClearFilters={clearMapFilters} onStartCapture={focusCapture} onSelect={setSelected} onUpdate={patchRelation} />
          </section>
        </section>
      </MapPage>}

      {viewMode === 'archive' && <ArchivePage notes={filteredNotes} totalNotes={graph.visibleNotes.length} selectedNoteId={selectedNoteId} hasActiveFilters={activeFilterCount(noteFilters) > 0} onClearFilters={clearNoteFilters} onStartCapture={focusCapture} />}
    </section>
  </main>;
}

function NotesPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout notes-layout">{children}</div>;
}

function MapPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout map-layout">{children}</div>;
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
      <DashboardMetricCard icon={<BookOpen/>} label="Notes" value={dashboard.totals.notes} sub={`${dashboardRangeLabel(dashboard.range)} ${dashboard.scope}`} />
      <DashboardMetricCard icon={<Network/>} label="Claims" value={dashboard.totals.claims} sub={`${dashboard.reviewBacklog.claims} awaiting claim review`} />
      <DashboardMetricCard icon={<GitBranch/>} label="Relations" value={dashboard.totals.relations} sub={`${dashboard.reviewBacklog.relations} open relation reviews`} />
      <DashboardMetricCard icon={<AlertTriangle/>} label="Signals" value={dashboard.signals.length} sub={`as of ${dashboard.asOf}`} />
    </section>}

    {dashboard && <>
    <section className="dashboard-insight-grid">
      <article className="dashboard-chart-card relation-mix-card">
        <div className="panel-title"><Workflow/> Relation mix</div>
        <div className="dashboard-bars">
          {relationTypes.map(type => <div key={type} className={`dashboard-bar-row ${type}`}>
            <span>{relationLabel(type)}</span>
            <i><b style={{ ['--share' as string]: `${Math.round((dashboard.relationMix[type] / relationTotal) * 100)}%` }} /></i>
            <strong>{dashboard.relationMix[type]}</strong>
          </div>)}
        </div>
      </article>

      <article className="dashboard-chart-card freshness-card">
        <div className="panel-title"><CircleDot/> Freshness</div>
        <div className="dashboard-donut" style={{ ['--fresh' as string]: dashboardFreshnessShare(dashboard, 'fresh'), ['--aging' as string]: dashboardFreshnessShare(dashboard, 'aging') }}>
          <b>{dashboard.freshness.fresh}</b>
        </div>
        <div className="dashboard-donut-caption">fresh claims</div>
        <div className="dashboard-legend">
          <span>Fresh {dashboard.freshness.fresh}</span>
          <span>Aging {dashboard.freshness.aging}</span>
          <span>Stale {dashboard.freshness.stale}</span>
        </div>
      </article>
    </section>

    <section className="dashboard-widget-grid">
      <DashboardTopList title="Companies" icon={<Building2/>} items={dashboard.topCompanies} onSelect={onSelectCompany} />
      <DashboardTopList title="Themes" icon={<PanelLeft/>} items={dashboard.topThemes} />
      <DashboardTopList title="KPIs" icon={<BarChart3/>} items={dashboard.topKpis} />
      <DashboardTopList title="Securities" icon={<Layers3/>} items={dashboard.topSecurities} />
      <DashboardTopList title="Watchlists" icon={<ListFilter/>} items={dashboard.topWatchlists} />
      <DashboardTopList title="Source people" icon={<UsersRound/>} items={dashboard.topSourcePeople} onSelect={onSelectPerson} />

      <article className="dashboard-chart-card dashboard-widget-card signals-card">
        <div className="panel-title"><AlertTriangle/> Signals</div>
        {dashboard.signals.length ? dashboard.signals.map(signal => <button key={signal.id} className={`alert ${signal.severity}`} onClick={() => signal.company && onSelectCompany(signal.company)}>
          <span>{signal.severity}</span><h3>{signal.title}</h3><p>{signal.body}</p>
        </button>) : <EmptyState title="No alerts" body="The selected dashboard scope is quiet for this timeframe." />}
      </article>

      <PersonMemoryPanel people={people} onSelectPerson={onSelectPerson} onStartCapture={onStartCapture} />
    </section>
    </>}
  </div>;
}

function DashboardMetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <article className="dashboard-metric-card">{icon}<span>{label}</span><b>{value}</b><small>{sub}</small></article>;
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
    </div> : <EmptyState title={`No ${title.toLowerCase()} yet`} body="Add and review notes in this scope to populate this dashboard panel." />}
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
    {selectedRelation && <RelationDetailDrawer relation={selectedRelation} />}
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
          <div><h3>{n.title}</h3><small>{n.team} · {n.visibility} · {n.createdAt}</small></div>
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
          <FilterSelect label="Visibility" value={filters.visibility ?? ''} options={options.visibilities} onChange={value => onFilterChange({ visibility: value as NoteFilters['visibility'] })} />
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

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label><span>{label}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="">all</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
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
    filters.visibility
  ].filter(Boolean).length;
}

function activeMapFilterCount(filters: MapFilters) {
  return [
    filters.security,
    filters.industryOrTheme,
    filters.relationType,
    filters.freshness,
    filters.sourcePerson
  ].filter(Boolean).length;
}

function MarkdownEditor({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedHtmlRef = useRef('');
  const [slashQuery, setSlashQuery] = useState('');
  const [slashTriggerLength, setSlashTriggerLength] = useState(0);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const tools: { command: RichMarkdownCommand; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { command: 'undo', label: 'Undo', shortcut: 'Ctrl/Cmd+Z', icon: <Undo2 size={15}/> },
    { command: 'redo', label: 'Redo', shortcut: 'Ctrl/Cmd+Y', icon: <Redo2 size={15}/> },
    { command: 'bold', label: 'Bold', shortcut: 'Ctrl/Cmd+B', icon: <Bold size={15}/> },
    { command: 'italic', label: 'Italic', shortcut: 'Ctrl/Cmd+I', icon: <Italic size={15}/> },
    { command: 'underline', label: 'Underline', shortcut: 'Ctrl/Cmd+U', icon: <Underline size={15}/> },
    { command: 'heading-1', label: 'Heading 1', shortcut: 'Ctrl/Cmd+Alt+1', icon: <Heading1 size={15}/> },
    { command: 'heading-2', label: 'Heading 2', shortcut: 'Ctrl/Cmd+Alt+2', icon: <Heading2 size={15}/> },
    { command: 'heading-3', label: 'Heading 3', shortcut: 'Ctrl/Cmd+Alt+3', icon: <Heading3 size={15}/> },
    { command: 'font-small', label: 'Small text', shortcut: 'Ctrl/Cmd+Shift+,', icon: <CaseLower size={15}/> },
    { command: 'font-large', label: 'Large text', shortcut: 'Ctrl/Cmd+Shift+.', icon: <CaseUpper size={15}/> },
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

  function syncFromEditor() {
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
    editorRef.current?.focus();
    if (selectTextBeforeCursor(slashTriggerLength)) {
      document.execCommand('delete');
    }
    closeSlashPalette();
    runCommand(command);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const modifier = event.metaKey || event.ctrlKey;
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

  return <div className="markdown-editor">
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
      {tools.map(tool => <button type="button" key={tool.command} onClick={() => runCommand(tool.command)} title={`${tool.label} (${tool.shortcut})`} aria-label={tool.label}>{tool.icon}</button>)}
    </div>
    <div
      ref={editorRef}
      className="markdown-display-editor"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Research note display editor"
      onInput={syncFromEditor}
      onBlur={syncFromEditor}
      onKeyDown={onKeyDown}
      onPaste={event => {
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
  transform = value => value
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  transform?: (value: string) => string;
}) {
  const [draft, setDraft] = useState('');

  function addValue(value: string) {
    const next = transform(value).trim();
    if (!next) return;
    onChange(normalizeTags([...values, next]));
    setDraft('');
  }

  function removeValue(value: string) {
    onChange(values.filter(item => item.toLowerCase() !== value.toLowerCase()));
  }

  return <div className="metadata-chip-input">
    <div className="metadata-chip-head">
      <span>{label}</span>
      <select value="" onChange={event => addValue(event.target.value)}><option value="">Choose</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
    </div>
    <div className="metadata-chip-entry">
      <input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addValue(draft);
        }
      }} placeholder={placeholder} />
      <button type="button" onClick={() => addValue(draft)}><Plus size={14}/></button>
    </div>
    <div className="metadata-chip-list">
      {values.map(value => <button type="button" key={value} onClick={() => removeValue(value)}>{value}<X size={12}/></button>)}
    </div>
  </div>;
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
      <p>Sign in with Supabase Auth. New accounts create an organization, profile, team membership, and demo notes through the database trigger.</p>
      {error && <div className="inline-error">{error}</div>}
      {message && <div className="inline-success">{message}</div>}
      <div className="auth-grid">
        <label><span>Email</span><input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <label><span>Name</span><input value={name} onChange={e => setName(e.target.value)} /></label>
        <label><span>Organization</span><input value={organizationName} onChange={e => setOrganizationName(e.target.value)} /></label>
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
    <small>{claim.subject} · {claim.direction} · observed {claim.observedAt} · applies {claim.appliesToStart} to {claim.appliesToEnd ?? 'open'} · {claim.freshness} · {claim.visibility} · {status}</small>
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
  filters,
  options,
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
  filters: MapFilters;
  options: ReturnType<typeof emptyMapFilterOptions>;
  onFilterChange: (patch: Partial<MapFilters>) => void;
  onClearFilters: () => void;
  onStartCapture: () => void;
  onSelect: (subject: string) => void;
  onUpdate: (id: string, input: UpdateRelationInput) => void;
}) {
  const [selectedRelationId, setSelectedRelationId] = useState(relations[0]?.id ?? '');
  const filteredRelations = filterMapRelations(relations, filters, notes);
  const selectedRelation = filteredRelations.find(relation => relation.id === selectedRelationId) ?? filteredRelations[0];
  const relationEmptyState = emptyStateForRelations({ hasRelations: relations.length > 0, hasActiveFilters: activeMapFilterCount(filters) > 0 });

  useEffect(() => {
    if (filteredRelations.length && !filteredRelations.some(relation => relation.id === selectedRelationId)) {
      setSelectedRelationId(filteredRelations[0].id);
    }
  }, [filteredRelations, selectedRelationId]);

  return <article className="panel graph-panel">
    <div className="panel-title"><GitBranch/> Temporal claim graph - as of {asOf}</div>
    <div className="map-filter-bar">
      <FilterSelect label="Security" value={filters.security ?? ''} options={options.securities} onChange={value => onFilterChange({ security: value })} />
      <FilterSelect label="Industry / Theme" value={filters.industryOrTheme ?? ''} options={options.industriesAndThemes} onChange={value => onFilterChange({ industryOrTheme: value })} />
      <FilterSelect label="Relation" value={filters.relationType ?? ''} options={relationTypes} onChange={value => onFilterChange({ relationType: value as RelationType | '' })} />
      <FilterSelect label="Freshness" value={filters.freshness ?? ''} options={options.freshness} onChange={value => onFilterChange({ freshness: value as MapFilters['freshness'] })} />
      <FilterSelect label="Participant" value={filters.sourcePerson ?? ''} options={options.sourcePeople} onChange={value => onFilterChange({ sourcePerson: value })} />
    </div>
    <div className="timeline-affordance"><span>historical</span><i/><b>{asOf}</b><span>current view</span></div>
    <div className="relation-legend"><span className="contradiction">red true contradiction</span><span className="open_tension">amber tension</span><span className="update_or_trend_reversal">blue trend reversal</span><span className="corroboration">green corroboration</span><span className="stale_evidence">grey stale evidence</span></div>
    {filteredRelations.length ? <div className="graph-canvas" aria-label="Relationship graph">
      <div className="node primary"><CircleDot/> {selected}</div>
      {filteredRelations.slice(0, 8).map((r, i) => <React.Fragment key={r.id}>
        <button className={`node satellite n${i} ${r.type}`} onClick={() => {
          setSelectedRelationId(r.id);
          onSelect(r.a.subject);
        }}>{r.a.subject}<small>{relationLabel(r.type)}</small></button>
        <i className={`edge e${i} ${r.type}`} />
      </React.Fragment>)}
    </div> : <EmptyState title={relationEmptyState.title} body={relationEmptyState.body} actions={emptyStateActions(relationEmptyState, { capture: onStartCapture, 'clear-filters': onClearFilters })} />}
    <div className="relation-list">
      {filteredRelations.slice(0, 5).map(r => <RelationCard key={r.id} relation={r} selected={r.id === selectedRelation?.id} onSelect={() => setSelectedRelationId(r.id)} onUpdate={input => onUpdate(r.id, input)} />)}
    </div>
    {selectedRelation && <RelationDetailDrawer relation={selectedRelation} />}
  </article>;
}

function RelationCard({ relation, selected, onSelect, onUpdate }: { relation: FrontendWorkspaceRelation; selected: boolean; onSelect: () => void; onUpdate: (input: UpdateRelationInput) => void }) {
  const [type, setType] = useState<RelationType>(relation.type);
  const [reviewNote, setReviewNote] = useState(relation.reviewNote ?? '');

  useEffect(() => {
    setType(relation.type);
    setReviewNote(relation.reviewNote ?? '');
  }, [relation.id, relation.type, relation.reviewNote]);

  return <article className={`${relation.type} ${selected ? 'selected' : ''}`}>
    <b>{relationLabel(relation.type)} · {Math.round(relation.score * 100)}% · {relation.reviewStatus}</b>
    <p><span>{relation.a.appliesToStart} to {relation.a.appliesToEnd ?? 'open'}</span> {relation.a.text}</p>
    <p><span>{relation.b.appliesToStart} to {relation.b.appliesToEnd ?? 'open'}</span> {relation.b.text}</p>
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

function RelationDetailDrawer({ relation }: { relation: FrontendWorkspaceRelation }) {
  return <aside className="relation-detail-drawer" aria-label="Relation detail">
    <div className="panel-title"><PanelLeft/> Relation detail</div>
    <div className="relation-detail-grid">
      <span>Current type<b>{relationLabel(relation.type)}</b></span>
      <span>Original type<b>{relationLabel(relation.originalType)}</b></span>
      <span>Overlap days<b>{relation.overlapDays}</b></span>
      <span>Score<b>{Math.round(relation.score * 100)}%</b></span>
      <span>Review state<b>{relation.reviewStatus}</b></span>
      <span>People context<b>{relation.sourcePersonContext ?? 'unknown'}</b></span>
      <span>Review note<b>{relation.reviewNote || 'None'}</b></span>
    </div>
    <div className="relation-detail-claims">
      <div className="relation-detail-claim">
        <b>{relation.a.subject} · {relation.a.direction}</b>
        <small>observed {relation.a.observedAt} · applies {relation.a.appliesToStart} to {relation.a.appliesToEnd ?? 'open'}</small>
        <p>{relation.a.text}</p>
      </div>
      <div className="relation-detail-claim">
        <b>{relation.b.subject} · {relation.b.direction}</b>
        <small>observed {relation.b.observedAt} · applies {relation.b.appliesToStart} to {relation.b.appliesToEnd ?? 'open'}</small>
        <p>{relation.b.text}</p>
      </div>
    </div>
    <p>{relation.reason}</p>
  </aside>;
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
    </div> : <EmptyState title={emptyState.title} body={emptyState.body} actions={emptyStateActions(emptyState, { capture: onStartCapture })} />}
  </article>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <div className="metric">{icon}<b>{value}</b><span>{label}</span><small>{sub}</small></div>;
}

type EmptyStateButtonAction = {
  label: string;
  onClick: () => void;
};

function EmptyState({ title, body, actions = [] }: { title: string; body: string; actions?: EmptyStateButtonAction[] }) {
  return <div className="empty">
    <Sparkles size={18}/>
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
  return { tickers: [], themes: [], kpis: [], industries: [], watchlists: [], sourcePeople: [], visibilities: [] };
}

function emptyMapFilterOptions() {
  return {
    securities: [] as string[],
    industriesAndThemes: [] as string[],
    sourcePeople: [] as string[],
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
  );
}

function draftSignature(draft: Partial<FrontendNoteDraft>) {
  const metadata = metadataArraysFromSource(draft);
  return JSON.stringify({
    selectedNoteId: draft.selectedNoteId ?? '',
    title: draft.title ?? '',
    body: draft.body ?? '',
    visibility: draft.visibility ?? 'team',
    observedAt: draft.observedAt ?? '',
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
    sourcePeople: sortedUnique(notes.flatMap(note => metadataArraysFromSource(note).sourcePeople))
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
    freshness: empty.freshness
  };
}

function filterMapRelations(relations: FrontendWorkspaceRelation[], filters: MapFilters, notes: FrontendWorkspaceNote[]): FrontendWorkspaceRelation[] {
  return relations.filter(relation => {
    const a = claimMetadataWithNoteFallback(relation.a, notes);
    const b = claimMetadataWithNoteFallback(relation.b, notes);
    return (!filters.security || matchesTag([...a.tickers, ...b.tickers], filters.security))
      && (!filters.industryOrTheme || matchesTag([...a.industries, ...a.manualThemes, ...b.industries, ...b.manualThemes], filters.industryOrTheme))
      && (!filters.relationType || relation.type === filters.relationType)
      && (!filters.freshness || relation.a.freshness === filters.freshness || relation.b.freshness === filters.freshness)
      && (!filters.sourcePerson || matchesTag([...a.sourcePeople, ...b.sourcePeople], filters.sourcePerson));
  });
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
