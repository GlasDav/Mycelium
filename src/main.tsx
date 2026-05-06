import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Command,
  Eye,
  FilePlus2,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  PanelLeft,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  XCircle
} from 'lucide-react';
import { detectEntities, extractClaims, relationLabel, runPipeline, type Claim, type Note, type Relation } from './engine';
import { seedNotes, users } from './data';
import './styles.css';

const sampleDrafts = [
  'Datacenter buyer sounded constructive: Nvidia Blackwell demand is strong, but Microsoft Azure capex approval cycles are slowing.',
  'Apple services pricing remains robust despite soft iPhone replacement demand in China. App Store revenue growth improved again.',
  'Tesla Model Y inventory increased across west coast dealers, but Supercharger utilization is improving in dense urban routes.'
];

type ViewMode = 'review' | 'map' | 'archive';

function App() {
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [userId, setUserId] = useState(users[2].id);
  const [selected, setSelected] = useState('Nvidia');
  const [draft, setDraft] = useState(sampleDrafts[0]);
  const [visibility, setVisibility] = useState<Note['visibility']>('team');
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [reviewedClaims, setReviewedClaims] = useState<string[]>([]);

  const user = users.find(u => u.id === userId)!;
  const graph = useMemo(() => runPipeline(notes, user), [notes, user]);
  const subjects = [...graph.companies, ...graph.themes];
  const selectedSynth = subjects.find(s => s.subject === selected) ?? graph.companies[0] ?? graph.themes[0];
  const visibleRelations = graph.relations.filter(r => !selectedSynth || r.a.subject === selectedSynth.subject || r.a.themes.includes(selectedSynth.subject));
  const previewNote: Note = {
    id: 'preview',
    title: 'Draft preview',
    body: draft,
    authorId: user.id,
    team: user.team,
    visibility,
    sourceType: 'Typed note',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  const previewClaims = extractClaims(previewNote);
  const previewEntities = detectEntities(draft);
  const contradictions = graph.relations.filter(r => r.type === 'contradiction').length;
  const reversals = graph.relations.filter(r => r.type === 'update_or_trend_reversal').length;
  const tensions = graph.relations.filter(r => r.type === 'historical_tension' || r.type === 'open_tension').length;
  const corroborations = graph.relations.filter(r => r.type === 'corroboration' || r.type === 'agreement').length;
  const reviewQueue = graph.claims.slice(0, 7);
  const privateHidden = notes.length - graph.visibleNotes.length;

  function addNote() {
    if (!draft.trim()) return;
    setNotes([
      {
        ...previewNote,
        id: `n${Date.now()}`,
        title: `Research intake · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      },
      ...notes
    ]);
    setSelected(previewClaims[0]?.subject ?? selected);
    setDraft('');
    setViewMode('review');
  }

  function onDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      addNote();
    }
  }

  function toggleReviewed(id: string) {
    setReviewedClaims(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
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
          <p className="eyebrow"><Sparkles size={14}/> Research notebook</p>
          <h1>Mycelium</h1>
          <p>{user.team} workspace · {graph.visibleNotes.length} visible notes · as of {graph.asOf}</p>
        </div>
        <div className="top-actions">
          <div className="access-note"><ShieldCheck size={15}/> {user.role === 'PM' || user.role === 'Compliance' ? 'Full workspace visibility' : `Public, ${user.team}, and own private notes`}</div>
          <label className="operator-card">
            <span>Viewing as</span>
            <select value={userId} onChange={e => setUserId(e.target.value)}>{users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role} · {u.team}</option>)}</select>
          </label>
        </div>
      </header>

      <section className="note-workbench">
        <article className="capture panel primary-note">
          <div className="panel-title"><FilePlus2/> New note</div>
          <div className="note-meta">
            <span>Typed note</span>
            <span>{user.team}</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>
          <h2>Write the research note.</h2>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onDraftKeyDown} placeholder="Paste meeting notes, channel checks, earnings transcript snippets…" aria-label="Research note draft" />
          <div className="capture-actions">
            <select value={visibility} onChange={e => setVisibility(e.target.value as Note['visibility'])} aria-label="Note visibility"><option value="public">public</option><option value="team">team</option><option value="private">private</option></select>
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
              <Metric icon={<Network/>} label="Claims" value={graph.claims.length} sub={`${privateHidden} notes hidden`} />
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
              {reviewQueue.filter(c => c.subject === selectedSynth.subject || c.themes.includes(selectedSynth.subject)).map(c => <ClaimCard key={c.id} claim={c} reviewed={reviewedClaims.includes(c.id)} onReview={() => toggleReviewed(c.id)} />)}
            </div>
          </article>}

          {viewMode === 'map' && <RelationshipMap relations={visibleRelations.length ? visibleRelations : graph.relations} selected={selectedSynth?.subject ?? selected} asOf={graph.asOf} onSelect={setSelected} />}

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
            <p>Every count, synthesis, and alert respects the current viewer’s access lens. Hidden notes stay out of the graph rather than merely blurred.</p>
          </article>
        </aside>
      </section>
    </section>
  </main>;
}

function ClaimCard({ claim, compact = false, reviewed = false, onReview }: { claim: Claim; compact?: boolean; reviewed?: boolean; onReview?: () => void }) {
  return <article className={`claim ${claim.direction} ${reviewed ? 'reviewed' : ''}`}>
    <p>{claim.text}</p>
    <small>{claim.subject} · {claim.direction} · observed {claim.observedAt} · applies {claim.appliesToStart}→{claim.appliesToEnd ?? 'open'} · {claim.freshness} · {claim.visibility}</small>
    {!compact && <button onClick={onReview}>{reviewed ? 'Reviewed' : 'Mark reviewed'}</button>}
  </article>;
}

function RelationshipMap({ relations, selected, asOf, onSelect }: { relations: Relation[]; selected: string; asOf: string; onSelect: (subject: string) => void }) {
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
      {relations.slice(0, 5).map(r => <article key={r.id} className={r.type}>
        <b>{relationLabel(r.type)} · {Math.round(r.score * 100)}%</b>
        <p><span>{r.a.appliesToStart}→{r.a.appliesToEnd ?? 'open'}</span> {r.a.text}</p>
        <p><span>{r.b.appliesToStart}→{r.b.appliesToEnd ?? 'open'}</span> {r.b.text}</p>
        <small>{r.reason} Snippets are shown so analysts can see why this is or is not a contradiction.</small>
      </article>)}
    </div>
  </article>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return <div className="metric">{icon}<b>{value}</b><span>{label}</span><small>{sub}</small></div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty"><Sparkles size={18}/><b>{title}</b><p>{body}</p></div>;
}

function tickerToCompany(ticker: string) {
  const map: Record<string, string> = { NVDA: 'Nvidia', AAPL: 'Apple', TSLA: 'Tesla', SHOP: 'Shopify', MSFT: 'Microsoft' };
  return map[ticker] ?? ticker;
}

createRoot(document.getElementById('root')!).render(<App />);
