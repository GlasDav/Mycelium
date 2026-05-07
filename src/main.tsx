import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  CircleDot,
  Command,
  Edit3,
  Eye,
  FilePlus2,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  LogIn,
  LogOut,
  Network,
  PanelLeft,
  Radar,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
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
  detectEntities,
  extractClaims,
  relationLabel,
  type Claim,
  type Direction,
  type Horizon,
  type Note,
  type RelationType
} from './engine';
import type {
  ClaimReviewStatus,
  UpdateClaimInput,
  UpdateRelationInput,
  WorkspaceClaim,
  WorkspaceRelation,
  WorkspaceSnapshot
} from '../server/workspace-service';
import './styles.css';

const sampleDrafts = [
  'Datacenter buyer sounded constructive: Nvidia Blackwell demand is strong, but Microsoft Azure capex approval cycles are slowing.',
  'Apple services pricing remains robust despite soft iPhone replacement demand in China. App Store revenue growth improved again.',
  'Tesla Model Y inventory increased across west coast dealers, but Supercharger utilization is improving in dense urban routes.'
];

const relationTypes: RelationType[] = ['contradiction', 'update_or_trend_reversal', 'historical_tension', 'open_tension', 'corroboration', 'agreement', 'stale_evidence'];

type ViewMode = 'review' | 'map' | 'archive';

function App() {
  const [authClient, setAuthClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [authError, setAuthError] = useState('');
  const [appError, setAppError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('Nvidia');
  const [draft, setDraft] = useState(sampleDrafts[0]);
  const [visibility, setVisibility] = useState<Note['visibility']>('team');
  const [sourceType, setSourceType] = useState('Typed note');
  const [observedAt, setObservedAt] = useState(today());
  const [appliesToStart, setAppliesToStart] = useState(today());
  const [appliesToEnd, setAppliesToEnd] = useState('');
  const [horizon, setHorizon] = useState<Horizon>('near_term');
  const [viewMode, setViewMode] = useState<ViewMode>('review');

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
        body: draft,
        visibility,
        sourceType,
        observedAt,
        appliesToStart,
        appliesToEnd: appliesToEnd || undefined,
        horizon
      });
      setWorkspace(next);
      const firstClaim = extractClaims(previewNote())[0];
      if (firstClaim) setSelected(firstClaim.subject);
      setDraft('');
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
      title: 'Draft preview',
      body: draft,
      authorId: viewer?.id ?? 'preview',
      team: viewer?.team ?? 'Research',
      visibility,
      sourceType,
      createdAt: observedAt || today(),
      observedAt,
      appliesToStart,
      appliesToEnd: appliesToEnd || undefined,
      horizon
    };
  }

  function onDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      addNote();
    }
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
  const previewEntities = detectEntities(draft);
  const contradictions = graph?.relations.filter(r => r.type === 'contradiction').length ?? 0;
  const reversals = graph?.relations.filter(r => r.type === 'update_or_trend_reversal').length ?? 0;
  const tensions = graph?.relations.filter(r => r.type === 'historical_tension' || r.type === 'open_tension').length ?? 0;
  const corroborations = graph?.relations.filter(r => r.type === 'corroboration' || r.type === 'agreement').length ?? 0;
  const reviewQueue = graph?.claims.slice(0, 10) ?? [];

  if (loading) return <StatusScreen title="Connecting to Mycelium" body="Loading auth and workspace services." />;
  if (!session || !workspace || !user) {
    return <AuthScreen authClient={authClient} error={authError || appError} onError={setAuthError} />;
  }

  return <main>
    <aside className="left-rail" aria-label="Workspace navigation">
      <div className="mark"><span>M</span></div>
      <nav>
        <button className={viewMode === 'review' ? 'active' : ''} onClick={() => setViewMode('review')} title="Review"><BookOpen size={18}/></button>
        <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')} title="Relationship map"><GitBranch size={18}/></button>
        <button className={viewMode === 'archive' ? 'active' : ''} onClick={() => setViewMode('archive')} title="Archive"><Layers3 size={18}/></button>
      </nav>
      <div className="rail-footer"><KeyRound size={16}/><span>{user.role}</span></div>
    </aside>

    <section className="shell">
      <header className="topbar">
        <div className="workspace-title">
          <p className="eyebrow"><Sparkles size={14}/> Production-backed notebook</p>
          <h1>Mycelium</h1>
          <p>{user.team} workspace · {graph.visibleNotes.length} visible notes · as of {graph.asOf}</p>
        </div>
        <div className="top-actions">
          <div className="access-note"><ShieldCheck size={15}/> {user.role === 'PM' || user.role === 'Compliance' ? 'Full org visibility through server policy' : `Public, ${user.team}, and own private notes`}</div>
          <button className="ghost-action" onClick={signOut}><LogOut size={15}/> Sign out</button>
        </div>
      </header>

      {appError && <div className="inline-error">{appError}</div>}

      <section className="note-workbench">
        <article className="capture panel primary-note">
          <div className="panel-title"><FilePlus2/> New note</div>
          <div className="note-meta">
            <span>{sourceType}</span>
            <span>{user.team}</span>
            <span>{observedAt}</span>
          </div>
          <h2>Write the research note.</h2>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onDraftKeyDown} placeholder="Paste meeting notes, channel checks, earnings transcript snippets..." aria-label="Research note draft" />
          <div className="metadata-grid">
            <label><span>Source</span><input value={sourceType} onChange={e => setSourceType(e.target.value)} /></label>
            <label><span>Observed</span><input type="date" value={observedAt} onChange={e => setObservedAt(e.target.value)} /></label>
            <label><span>Applies from</span><input type="date" value={appliesToStart} onChange={e => setAppliesToStart(e.target.value)} /></label>
            <label><span>Applies to</span><input type="date" value={appliesToEnd} onChange={e => setAppliesToEnd(e.target.value)} /></label>
            <label><span>Horizon</span><select value={horizon} onChange={e => setHorizon(e.target.value as Horizon)}><option value="point_in_time">point in time</option><option value="near_term">near term</option><option value="quarter">quarter</option><option value="year">year</option><option value="unknown">unknown</option></select></label>
            <label><span>Visibility</span><select value={visibility} onChange={e => setVisibility(e.target.value as Note['visibility'])}><option value="public">public</option><option value="team">team</option><option value="private">private</option></select></label>
          </div>
          <div className="capture-actions">
            <button onClick={addNote}>Add note <span><Command size={13}/> Enter</span></button>
          </div>
          <div className="samples" aria-label="Sample note prompts">
            {sampleDrafts.map((sample, i) => <button key={sample} onClick={() => setDraft(sample)}>Use sample {i + 1}</button>)}
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

      <section className="workspace">
        <aside className="subject-rail panel">
          <div className="panel-title"><Search/> Companies & themes</div>
          {subjects.length ? subjects.map(s => <button className={selected === s.subject ? 'active' : ''} key={s.subject} onClick={() => setSelected(s.subject)}>
            <span>{s.subject}</span>
            <small>{s.total} claims · {s.stance}</small>
            <i style={{ ['--mix' as string]: `${Math.min(100, (s.positives / Math.max(1, s.total)) * 100)}%` }} />
          </button>) : <EmptyState title="No graph yet" body="Add a note to create the first company view." />}
        </aside>

        <section className="center-stage">
          <div className="mode-tabs" role="tablist" aria-label="Workspace mode">
            <button className={viewMode === 'review' ? 'active' : ''} onClick={() => setViewMode('review')}>Claim review</button>
            <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>Relationship map</button>
            <button className={viewMode === 'archive' ? 'active' : ''} onClick={() => setViewMode('archive')}>Note archive</button>
          </div>

          {selectedSynth && viewMode === 'review' && <article className="panel synthesis">
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

          {viewMode === 'map' && <RelationshipMap relations={visibleRelations.length ? visibleRelations : graph.relations} selected={selectedSynth?.subject ?? selected} asOf={graph.asOf} onSelect={setSelected} onUpdate={patchRelation} />}

          {viewMode === 'archive' && <article className="panel notes">
            <div className="panel-title"><LockKeyhole/> Permission-aware note archive</div>
            {graph.visibleNotes.map(n => <article key={n.id}>
              <div><h3>{n.title}</h3><small>{n.sourceType} · {n.team} · {n.visibility} · {n.createdAt}</small></div>
              <p>{n.body}</p>
            </article>)}
          </article>}
        </section>

        <aside className="right-stack">
          <article className="panel recent-notes">
            <div className="panel-title"><BookOpen/> Recent notes</div>
            {graph.visibleNotes.slice(0, 4).map(n => <button key={n.id} onClick={() => setViewMode('archive')}>
              <span>{n.createdAt} · {n.visibility}</span>
              <b>{n.title}</b>
              <small>{n.body.slice(0, 110)}...</small>
            </button>)}
          </article>
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
    </section>
  </main>;
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

  useEffect(() => {
    setText(claim.text);
    setSubject(claim.subject);
    setDirection(claim.direction);
    setThemes(claim.themes.join(', '));
    setObservedAt(claim.observedAt);
    setAppliesToStart(claim.appliesToStart);
    setAppliesToEnd(claim.appliesToEnd ?? '');
    setHorizon(claim.horizon);
  }, [claim.id, claim.text, claim.subject, claim.direction, claim.observedAt, claim.appliesToStart, claim.appliesToEnd, claim.horizon, claim.themes]);

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
      horizon
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
      <div className="review-actions">
        <button onClick={() => save('edited')}><Save size={14}/> Save edit</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_confirmed' })}><Check size={14}/> Approve</button>
        <button onClick={() => onUpdate({ reviewStatus: 'analyst_rejected' })}><Ban size={14}/> Reject</button>
      </div>
    </div>}
  </article>;
}

function RelationshipMap({ relations, selected, asOf, onSelect, onUpdate }: { relations: WorkspaceRelation[]; selected: string; asOf: string; onSelect: (subject: string) => void; onUpdate: (id: string, input: UpdateRelationInput) => void }) {
  return <article className="panel graph-panel">
    <div className="panel-title"><GitBranch/> Temporal claim graph · as of {asOf}</div>
    <div className="timeline-affordance"><span>historical</span><i/><b>{asOf}</b><span>current view</span></div>
    <div className="relation-legend"><span className="contradiction">red true contradiction</span><span className="open_tension">amber tension</span><span className="update_or_trend_reversal">blue trend reversal</span><span className="corroboration">green corroboration</span><span className="stale_evidence">grey stale evidence</span></div>
    <div className="graph-canvas" aria-label="Relationship graph">
      <div className="node primary"><CircleDot/> {selected}</div>
      {relations.slice(0, 8).map((r, i) => <React.Fragment key={r.id}>
        <button className={`node satellite n${i} ${r.type}`} onClick={() => onSelect(r.a.subject)}>{r.a.subject}<small>{relationLabel(r.type)}</small></button>
        <i className={`edge e${i} ${r.type}`} />
      </React.Fragment>)}
    </div>
    <div className="relation-list">
      {relations.slice(0, 5).map(r => <RelationCard key={r.id} relation={r} onUpdate={input => onUpdate(r.id, input)} />)}
    </div>
  </article>;
}

function RelationCard({ relation, onUpdate }: { relation: WorkspaceRelation; onUpdate: (input: UpdateRelationInput) => void }) {
  const [type, setType] = useState<RelationType>(relation.type);
  useEffect(() => setType(relation.type), [relation.id, relation.type]);

  return <article className={relation.type}>
    <b>{relationLabel(relation.type)} · {Math.round(relation.score * 100)}% · {relation.reviewStatus}</b>
    <p><span>{relation.a.appliesToStart} to {relation.a.appliesToEnd ?? 'open'}</span> {relation.a.text}</p>
    <p><span>{relation.b.appliesToStart} to {relation.b.appliesToEnd ?? 'open'}</span> {relation.b.text}</p>
    <small>{relation.reason} Snippets are shown so analysts can see why this is or is not a contradiction.</small>
    <div className="relation-actions">
      <button onClick={() => onUpdate({ reviewStatus: 'confirmed' })}><Check size={14}/> Confirm</button>
      <button onClick={() => onUpdate({ reviewStatus: 'dismissed' })}><Ban size={14}/> Dismiss</button>
      <select value={type} onChange={event => setType(event.target.value as RelationType)}>{relationTypes.map(item => <option key={item} value={item}>{relationLabel(item)}</option>)}</select>
      <button onClick={() => onUpdate({ reviewStatus: 'reclassified', type })}><Edit3 size={14}/> Reclassify</button>
    </div>
  </article>;
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

createRoot(document.getElementById('root')!).render(<App />);
