import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
  BookOpen,
  Bold,
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
  Heading1,
  Heading2,
  Heading3,
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
  X,
  XCircle
} from 'lucide-react';
import {
  createAuthClient,
  createNote,
  loadAuthBootstrap,
  loadWorkspace,
  updateClaim,
  updateRelation
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
  UpdateClaimInput,
  UpdateRelationInput,
  WorkspaceClaim,
  WorkspaceNote,
  WorkspaceRelation,
  WorkspaceSnapshot
} from '../server/workspace-service';
import './styles.css';

const relationTypes: RelationType[] = ['contradiction', 'update_or_trend_reversal', 'historical_tension', 'open_tension', 'corroboration', 'agreement', 'stale_evidence'];
type RichMarkdownCommand = MarkdownCommand | 'undo' | 'redo';
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

type ViewMode = 'review' | 'map' | 'archive';
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
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [tickers, setTickers] = useState<string[]>([]);
  const [manualThemes, setManualThemes] = useState<string[]>([]);
  const [kpis, setKpis] = useState<string[]>([]);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [noteFiltersCollapsed, setNoteFiltersCollapsed] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [noteFilters, setNoteFilters] = useState<NoteFilters>({ sort: 'newest' });

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
        if (currentSession) await refreshWorkspace(currentSession);
        const subscription = client.auth.onAuthStateChange(async (_event, nextSession) => {
          setSession(nextSession);
          if (nextSession) {
            await refreshWorkspace(nextSession);
          } else {
            setWorkspace(null);
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

  async function refreshWorkspace(nextSession = session) {
    if (!nextSession) return;
    setAppError('');
    const next = await loadWorkspace(nextSession);
    setWorkspace(next);
    const subjects = [...next.companies, ...next.themes];
    if (subjects.length && !subjects.some(subject => subject.subject === selected)) {
      setSelected(subjects[0].subject);
    }
  }

  async function addNote() {
    if (!session || !draft.trim()) return;
    try {
      const next = await createNote(session, {
        title: noteTitle.trim() || undefined,
        body: draft,
        visibility,
        observedAt,
        tickers,
        manualThemes,
        kpis
      });
      setWorkspace(next);
      const firstClaim = extractClaims(previewNote())[0];
      if (firstClaim) setSelected(firstClaim.subject);
      setNoteTitle('');
      setDraft('');
      setTickers([]);
      setManualThemes([]);
      setKpis([]);
      setViewMode('review');
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  async function patchClaim(id: string, input: UpdateClaimInput) {
    if (!session) return;
    try {
      setWorkspace(await updateClaim(session, id, input));
    } catch (error) {
      setAppError(error instanceof Error ? error.message : String(error));
    }
  }

  async function patchRelation(id: string, input: UpdateRelationInput) {
    if (!session) return;
    try {
      setWorkspace(await updateRelation(session, id, input));
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
      tickers,
      manualThemes,
      kpis
    };
  }

  function startNewNote() {
    const date = today();
    setSelectedNoteId('');
    setNoteTitle('');
    setDraft('');
    setVisibility('team');
    setObservedAt(date);
    setTickers([]);
    setManualThemes([]);
    setKpis([]);
    setViewMode('review');
  }

  async function signOut() {
    await authClient?.auth.signOut();
    setWorkspace(null);
  }

  const graph = workspace;
  const user = graph?.viewer;
  const subjects = graph ? [...graph.companies, ...graph.themes] : [];
  const selectedSynth = subjects.find(s => s.subject === selected) ?? graph?.companies[0] ?? graph?.themes[0];
  const visibleRelations = graph?.relations.filter(r => !selectedSynth || r.a.subject === selectedSynth.subject || r.a.themes.includes(selectedSynth.subject)) ?? [];
  const preview = previewNote();
  const previewClaims = extractClaims(preview);
  const previewEntities = mergeEntities(detectEntities(draft), [
    ...tickers.map(name => ({ name, kind: 'ticker' as const })),
    ...manualThemes.map(name => ({ name, kind: 'theme' as const })),
    ...kpis.map(name => ({ name, kind: 'kpi' as const }))
  ]);
  const noteFilterOptions = graph ? deriveNoteFilterOptions(graph.visibleNotes) : emptyFilterOptions();
  const filteredNotes = graph ? filterAndSortNotes(graph.visibleNotes, noteFilters) : [];
  const contradictions = graph?.relations.filter(r => r.type === 'contradiction').length ?? 0;
  const reversals = graph?.relations.filter(r => r.type === 'update_or_trend_reversal').length ?? 0;
  const tensions = graph?.relations.filter(r => r.type === 'historical_tension' || r.type === 'open_tension').length ?? 0;
  const corroborations = graph?.relations.filter(r => r.type === 'corroboration' || r.type === 'agreement').length ?? 0;
  const reviewQueue = graph?.claims.slice(0, 10) ?? [];

  if (loading) return <StatusScreen title="Connecting to Mycelium" body="Loading auth and workspace services." />;
  if (!session || !workspace || !user) {
    return <AuthScreen authClient={authClient} error={authError || appError} onError={setAuthError} />;
  }

  return <main className={`app-main ${notesCollapsed ? 'notes-collapsed' : ''}`}>
    <aside className="left-rail" aria-label="Workspace navigation">
      <div className="mark"><span>M</span></div>
      <nav>
        <button className={viewMode === 'review' ? 'active' : ''} onClick={() => setViewMode('review')} title="Review"><BookOpen size={18}/></button>
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
      onSelectNote={note => {
        setSelectedNoteId(note.id);
        setNoteTitle(note.title);
        setDraft(note.body);
        setVisibility(note.visibility);
        setObservedAt(note.observedAt ?? note.createdAt);
        setTickers(note.tickers ?? []);
        setManualThemes(note.manualThemes ?? []);
        setKpis(note.kpis ?? []);
        setViewMode('review');
      }}
    />

    <section className={`shell page-shell ${viewMode}-page`}>
      {appError && <div className="inline-error">{appError}</div>}

      {viewMode === 'review' && <ReviewPage>
      <section className="note-workbench">
        <article className="capture panel primary-note">
          <div className="note-panel-head">
            <div className="panel-title"><FilePlus2/> Note</div>
            <button type="button" className="new-note-action" onClick={startNewNote}><FilePlus2 size={14}/>New note</button>
          </div>
          <div className="note-meta">
            <span>{user.team}</span>
            <span>{observedAt}</span>
          </div>
          <input className="note-title-input" value={noteTitle} onChange={event => setNoteTitle(event.target.value)} placeholder="Title..." aria-label="Note title" />
          <MarkdownEditor value={draft} onChange={setDraft} onSubmit={addNote} />
          <div className="metadata-grid">
            <label><span>Observed</span><input type="date" value={observedAt} onChange={e => setObservedAt(e.target.value)} /></label>
            <label><span>Visibility</span><select value={visibility} onChange={e => setVisibility(e.target.value as Note['visibility'])}><option value="public">public</option><option value="team">team</option><option value="private">private</option></select></label>
          </div>
          <div className="metadata-linking">
            <MetadataChipInput label="Stocks" values={tickers} options={knownTickers()} onChange={setTickers} transform={value => value.toUpperCase()} placeholder="Add ticker" />
            <MetadataChipInput label="Themes" values={manualThemes} options={themeLexicon} onChange={setManualThemes} placeholder="Add theme" />
            <MetadataChipInput label="KPIs" values={kpis} options={kpiWords} onChange={setKpis} placeholder="Add KPI" />
          </div>
          <div className="capture-actions">
            <button onClick={addNote}>Add note <span><Command size={13}/> Enter</span></button>
          </div>
        </article>

        <aside className="note-side">
          <article className="panel live-preview">
            <div className="panel-title"><Eye/> Live extraction</div>
            {previewEntities.length ? <div className="entity-cloud">
              {previewEntities.slice(0, 12).map(e => <button className={`chip ${e.kind}`} key={`${e.kind}-${e.name}`} onClick={() => setSelected(e.kind === 'ticker' ? tickerToCompany(e.name) : e.name)}>{e.kind}<b>{e.name}</b></button>)}
            </div> : <EmptyState title="No entities yet" body="Mention a company, ticker, KPI, or theme and the graph starts forming here." />}
            <div className="preview-claims">
              {previewClaims.map(c => <ClaimCard key={c.id} claim={c} compact />)}
            </div>
          </article>

          <article className="panel pulse">
            <div className="panel-title"><Radar/> Workspace pulse</div>
            <div className="mini-metrics">
              <Metric icon={<Eye/>} label="Visible notes" value={graph.visibleNotes.length} sub={`as of ${graph.asOf}`} />
              <Metric icon={<Network/>} label="Claims" value={graph.claims.length} sub="server materialized" />
              <Metric icon={<Workflow/>} label="Relations" value={graph.relations.length} sub={`${contradictions} contradiction · ${reversals} reversal · ${tensions} tension · ${corroborations} corroborate`} />
            </div>
          </article>
        </aside>
      </section>

      <section className="workspace review-workspace">
        <aside className="subject-rail panel">
          <div className="panel-title"><Search/> Companies & themes</div>
          {subjects.length ? subjects.map(s => <button className={selected === s.subject ? 'active' : ''} key={s.subject} onClick={() => setSelected(s.subject)}>
            <span>{s.subject}</span>
            <small>{s.total} claims · {s.stance}</small>
            <i style={{ ['--mix' as string]: `${Math.min(100, (s.positives / Math.max(1, s.total)) * 100)}%` }} />
          </button>) : <EmptyState title="No graph yet" body="Add a note to create the first company view." />}
        </aside>

        <section className="center-stage">
          {selectedSynth && <article className="panel synthesis">
            <div className="panel-title"><PanelLeft/> Synthesized view</div>
            <div className="synthesis-head">
              <div><h2>{selectedSynth.subject}</h2><p>{selectedSynth.summary}</p></div>
              <div className={`stance-badge ${selectedSynth.stance}`}>{selectedSynth.stance}</div>
            </div>
            <div className="stance-strip">
              <span><CheckCircle2/> {selectedSynth.positives} supportive</span>
              <span><XCircle/> {selectedSynth.negatives} skeptical</span>
              <span><AlertTriangle/> {selectedSynth.contradictions} contradictions · {selectedSynth.updates} reversals</span>
            </div>
            <div className="backlinks">
              {selectedSynth.topThemes.map(t => <button className="chip hot" key={t} onClick={() => setSelected(t)}>backlink: {t}<ArrowUpRight size={13}/></button>)}
            </div>
            <h3>Review queue</h3>
            <div className="claim-list">
              {reviewQueue.filter(c => c.subject === selectedSynth.subject || c.themes.includes(selectedSynth.subject)).map(c => <ClaimCard key={c.id} claim={c} onUpdate={input => patchClaim(c.id, input)} />)}
            </div>
          </article>}

        </section>

        <aside className="right-stack">
          <article className="panel alerts">
            <div className="panel-title"><AlertTriangle/> Signals</div>
            {graph.alerts.length ? graph.alerts.map(a => <button key={a.id} className={`alert ${a.severity}`} onClick={() => a.company && setSelected(a.company)}>
              <span>{a.severity}</span><h3>{a.title}</h3><p>{a.body}</p>
            </button>) : <EmptyState title="No alerts" body="The workspace is quiet. New contradictions and dense clusters will appear here." />}
          </article>
          <article className="panel privacy-note">
            <div className="panel-title"><ShieldCheck/> Trust boundary</div>
            <p>Every count, synthesis, and alert is assembled by the server from rows the current user can access. Hidden notes stay out of graph computation.</p>
          </article>
        </aside>
      </section>
      </ReviewPage>}

      {viewMode === 'map' && <MapPage>
        <section className="workspace map-workspace">
          <aside className="subject-rail panel">
            <div className="panel-title"><Search/> Companies & themes</div>
            {subjects.length ? subjects.map(s => <button className={selected === s.subject ? 'active' : ''} key={s.subject} onClick={() => setSelected(s.subject)}>
              <span>{s.subject}</span>
              <small>{s.total} claims · {s.stance}</small>
              <i style={{ ['--mix' as string]: `${Math.min(100, (s.positives / Math.max(1, s.total)) * 100)}%` }} />
            </button>) : <EmptyState title="No graph yet" body="Add a note to create the first company view." />}
          </aside>

          <section className="center-stage">
            <RelationshipMap relations={visibleRelations.length ? visibleRelations : graph.relations} selected={selectedSynth?.subject ?? selected} asOf={graph.asOf} onSelect={setSelected} onUpdate={patchRelation} />
          </section>
        </section>
      </MapPage>}

      {viewMode === 'archive' && <ArchivePage notes={filteredNotes} totalNotes={graph.visibleNotes.length} selectedNoteId={selectedNoteId} />}
    </section>
  </main>;
}

function ReviewPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout review-layout">{children}</div>;
}

function MapPage({ children }: { children: React.ReactNode }) {
  return <div className="page-layout map-layout">{children}</div>;
}

function ArchivePage({ notes, totalNotes, selectedNoteId }: { notes: WorkspaceNote[]; totalNotes: number; selectedNoteId: string }) {
  return <div className="page-layout archive-layout">
    <section className="workspace archive-workspace">
      <article className="panel notes">
        <div className="panel-title"><LockKeyhole/> Permission-aware note archive</div>
        <p className="archive-count">{notes.length} of {totalNotes} visible notes</p>
        {notes.length ? notes.map(n => <article key={n.id} className={`note-card ${selectedNoteId === n.id ? 'selected' : ''}`}>
          <div><h3>{n.title}</h3><small>{n.team} · {n.visibility} · {n.createdAt}</small></div>
          <NoteMetadataChips note={n} />
          <MarkdownPreview source={n.body} />
        </article>) : <EmptyState title="No notes match" body="Adjust the sidebar filters to broaden the archive." />}
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
  onSelectNote
}: {
  collapsed: boolean;
  filters: NoteFilters;
  notes: WorkspaceNote[];
  options: NoteFilterOptions;
  filtersCollapsed: boolean;
  selectedNoteId: string;
  totalNotes: number;
  onToggle: () => void;
  onToggleFilters: () => void;
  onFilterChange: (patch: Partial<NoteFilters>) => void;
  onSelectNote: (note: WorkspaceNote) => void;
}) {
  if (collapsed) {
    return <aside className="notes-sidebar collapsed" aria-label="Notes sidebar">
      <button className="notes-toggle collapsed" onClick={onToggle} title="Open notes"><ChevronRight size={17}/><span>{totalNotes}</span></button>
    </aside>;
  }

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
          <FilterSelect label="Theme" value={filters.theme ?? ''} options={options.themes} onChange={value => onFilterChange({ theme: value })} />
          <FilterSelect label="KPI" value={filters.kpi ?? ''} options={options.kpis} onChange={value => onFilterChange({ kpi: value })} />
          <FilterSelect label="Visibility" value={filters.visibility ?? ''} options={options.visibilities} onChange={value => onFilterChange({ visibility: value as NoteFilters['visibility'] })} />
          <label><span>Sort</span><select value={filters.sort ?? 'newest'} onChange={event => onFilterChange({ sort: event.target.value as NoteSort })}><option value="newest">newest</option><option value="oldest">oldest</option><option value="title">title</option></select></label>
        </div>
        <div className="date-filter-grid">
          <label><span>From</span><input type="date" value={filters.dateFrom ?? ''} onChange={event => onFilterChange({ dateFrom: event.target.value })} /></label>
          <label><span>To</span><input type="date" value={filters.dateTo ?? ''} onChange={event => onFilterChange({ dateTo: event.target.value })} /></label>
        </div>
        <button className="clear-note-filters" onClick={() => onFilterChange({ query: '', ticker: '', theme: '', kpi: '', dateFrom: '', dateTo: '', visibility: '', sort: 'newest' })}><ListFilter size={14}/> Clear filters</button>
      </div>}
    </div>

    <div className="notes-list">
      {notes.length ? notes.map(note => <button className={`sidebar-note ${selectedNoteId === note.id ? 'selected' : ''}`} key={note.id} onClick={() => onSelectNote(note)}>
        <span className="sidebar-note-row"><b className="sidebar-note-title">{note.title}</b><span className="sidebar-note-date">{noteRecencyDate(note)}</span></span>
      </button>) : <EmptyState title="No notes match" body="Adjust filters to broaden the visible note set." />}
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
    filters.theme,
    filters.kpi,
    filters.dateFrom,
    filters.dateTo,
    filters.visibility
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

function NoteMetadataChips({ note, compact = false }: { note: Pick<WorkspaceNote, 'tickers' | 'manualThemes' | 'kpis'>; compact?: boolean }) {
  const items = [
    ...(note.tickers ?? []).map(value => ({ value, kind: 'ticker' })),
    ...(note.manualThemes ?? []).map(value => ({ value, kind: 'theme' })),
    ...(note.kpis ?? []).map(value => ({ value, kind: 'kpi' }))
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

function ClaimCard({ claim, compact = false, onUpdate }: { claim: Claim | WorkspaceClaim; compact?: boolean; onUpdate?: (input: UpdateClaimInput) => void }) {
  const workspaceClaim = claim as Partial<WorkspaceClaim>;
  const status = workspaceClaim.reviewStatus ?? 'machine';
  const [text, setText] = useState(claim.text);
  const [subject, setSubject] = useState(claim.subject);
  const [direction, setDirection] = useState<Direction>(claim.direction);
  const [themes, setThemes] = useState(claim.themes.join(', '));
  const [observedAt, setObservedAt] = useState(claim.observedAt);
  const [appliesToStart, setAppliesToStart] = useState(claim.appliesToStart);
  const [appliesToEnd, setAppliesToEnd] = useState(claim.appliesToEnd ?? '');
  const [horizon, setHorizon] = useState<Horizon>(claim.horizon);
  const [reviewNote, setReviewNote] = useState(workspaceClaim.reviewNote ?? '');

  useEffect(() => {
    setText(claim.text);
    setSubject(claim.subject);
    setDirection(claim.direction);
    setThemes(claim.themes.join(', '));
    setObservedAt(claim.observedAt);
    setAppliesToStart(claim.appliesToStart);
    setAppliesToEnd(claim.appliesToEnd ?? '');
    setHorizon(claim.horizon);
    setReviewNote(workspaceClaim.reviewNote ?? '');
  }, [claim.id, claim.text, claim.subject, claim.direction, claim.observedAt, claim.appliesToStart, claim.appliesToEnd, claim.horizon, claim.themes, workspaceClaim.reviewNote]);

  function save(reviewStatus: ClaimReviewStatus) {
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
      <label><span>Review note</span><textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} /></label>
      <div className="review-actions">
        <button onClick={() => save('edited')}><Save size={14}/> Save edit</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_confirmed', reviewNote })}><Check size={14}/> Approve</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_rejected', reviewNote })}><Ban size={14}/> Reject</button>
      </div>
    </div>}
  </article>;
}

function RelationshipMap({ relations, selected, asOf, onSelect, onUpdate }: { relations: WorkspaceRelation[]; selected: string; asOf: string; onSelect: (subject: string) => void; onUpdate: (id: string, input: UpdateRelationInput) => void }) {
  const [selectedRelationId, setSelectedRelationId] = useState(relations[0]?.id ?? '');
  const selectedRelation = relations.find(relation => relation.id === selectedRelationId) ?? relations[0];

  useEffect(() => {
    if (relations.length && !relations.some(relation => relation.id === selectedRelationId)) {
      setSelectedRelationId(relations[0].id);
    }
  }, [relations, selectedRelationId]);

  return <article className="panel graph-panel">
    <div className="panel-title"><GitBranch/> Temporal claim graph · as of {asOf}</div>
    <div className="timeline-affordance"><span>historical</span><i/><b>{asOf}</b><span>current view</span></div>
    <div className="relation-legend"><span className="contradiction">red true contradiction</span><span className="open_tension">amber tension</span><span className="update_or_trend_reversal">blue trend reversal</span><span className="corroboration">green corroboration</span><span className="stale_evidence">grey stale evidence</span></div>
    <div className="graph-canvas" aria-label="Relationship graph">
      <div className="node primary"><CircleDot/> {selected}</div>
      {relations.slice(0, 8).map((r, i) => <React.Fragment key={r.id}>
        <button className={`node satellite n${i} ${r.type}`} onClick={() => {
          setSelectedRelationId(r.id);
          onSelect(r.a.subject);
        }}>{r.a.subject}<small>{relationLabel(r.type)}</small></button>
        <i className={`edge e${i} ${r.type}`} />
      </React.Fragment>)}
    </div>
    <div className="relation-list">
      {relations.slice(0, 5).map(r => <RelationCard key={r.id} relation={r} selected={r.id === selectedRelation?.id} onSelect={() => setSelectedRelationId(r.id)} onUpdate={input => onUpdate(r.id, input)} />)}
    </div>
    {selectedRelation && <RelationDetailDrawer relation={selectedRelation} />}
  </article>;
}

function RelationCard({ relation, selected, onSelect, onUpdate }: { relation: WorkspaceRelation; selected: boolean; onSelect: () => void; onUpdate: (input: UpdateRelationInput) => void }) {
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
    <small>{relation.reason} Snippets are shown so analysts can see why this is or is not a contradiction.</small>
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

function RelationDetailDrawer({ relation }: { relation: WorkspaceRelation }) {
  return <aside className="relation-detail-drawer" aria-label="Relation detail">
    <div className="panel-title"><PanelLeft/> Relation detail</div>
    <div className="relation-detail-grid">
      <span>Current type<b>{relationLabel(relation.type)}</b></span>
      <span>Original type<b>{relationLabel(relation.originalType)}</b></span>
      <span>Overlap days<b>{relation.overlapDays}</b></span>
      <span>Score<b>{Math.round(relation.score * 100)}%</b></span>
      <span>Review state<b>{relation.reviewStatus}</b></span>
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

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <div className="metric">{icon}<b>{value}</b><span>{label}</span><small>{sub}</small></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty"><Sparkles size={18}/><b>{title}</b><p>{body}</p></div>;
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

function mergeEntities(primary: Entity[], manual: Entity[]): Entity[] {
  const seen = new Set<string>();
  return [...primary, ...manual].filter(entity => {
    const key = `${entity.kind}:${entity.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyFilterOptions(): NoteFilterOptions {
  return { tickers: [], themes: [], kpis: [], visibilities: [] };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

createRoot(document.getElementById('root')!).render(<App />);
