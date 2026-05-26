import {
  canAccess,
  accessScopeFromVisibility,
  claimObservedBy,
  createFallbackClaimExtractionProvider,
  detectRelations,
  freshnessAsOf,
  generateAlerts,
  projectClaimAsOf,
  synthesize,
  type Alert,
  type AccessScope,
  type Claim,
  type ClaimExtractionProvider,
  type Direction,
  type ExternalEvent,
  type ExternalEvidenceItem,
  type ExternalSourceKind,
  type Horizon,
  type Note,
  type Relation,
  type RelationType,
  type User,
  type OrgRole,
  type TeamMembership,
  type TeamStatus,
  type UserStatus,
  type TranscriptCitation,
  type Visibility
} from '../src/engine';
import {
  legacyArraysToLinkedEntities,
  linkedEntity,
  mergeLinkedEntities,
  metadataArraysFromLinkedEntities,
  normalizeLinkedEntities,
  sameLinkedEntities,
  type EntityRole,
  type LinkedEntity,
  type MetadataArrays
} from '../src/entity-links';

export type ClaimReviewStatus = 'machine' | 'analyst_confirmed' | 'analyst_rejected' | 'edited';
export type RelationReviewStatus = 'open' | 'confirmed' | 'dismissed' | 'reclassified';

export interface WorkspaceUser extends User {
  orgId: string;
  email?: string;
  teamId?: string;
  primaryTeamId?: string;
  orgRole: OrgRole;
  status: UserStatus;
  teamMemberships: TeamMembership[];
}

export interface WorkspaceNote extends Note {
  orgId: string;
  authorName: string;
  teamId?: string;
  accessScope: AccessScope;
  updatedAt: string;
  linkedEntities: LinkedEntity[];
  tickers: string[];
  manualThemes: string[];
  kpis: string[];
  industries: string[];
  companyTags: string[];
  watchlistTags: string[];
  sourcePeople: string[];
}

export interface WorkspaceClaim extends Claim {
  orgId: string;
  authorName: string;
  teamId?: string;
  accessScope: AccessScope;
  reviewStatus: ClaimReviewStatus;
  reviewNote?: string;
  reviewerId?: string;
  updatedAt: string;
  linkedEntities: LinkedEntity[];
  tickers: string[];
  manualThemes: string[];
  kpis: string[];
  industries: string[];
  companyTags: string[];
  watchlistTags: string[];
  sourcePeople: string[];
}

export interface WorkspaceRelation extends Relation {
  orgId: string;
  originalType: RelationType;
  reviewStatus: RelationReviewStatus;
  reviewNote?: string;
  reviewerId?: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NoteRevision {
  id: string;
  orgId: string;
  noteId: string;
  editorId: string;
  editorName: string;
  previousTitle: string;
  previousBody: string;
  previousVisibility: Visibility;
  previousSourceType: string;
  previousObservedAt?: string;
  previousTickers: string[];
  previousManualThemes: string[];
  previousKpis: string[];
  previousLinkedEntities: LinkedEntity[];
  previousIndustries: string[];
  previousCompanyTags: string[];
  previousWatchlistTags: string[];
  previousSourcePeople: string[];
  changedFields: string[];
  createdAt: string;
}

export interface NoteDraft {
  orgId: string;
  userId: string;
  selectedNoteId?: string;
  title: string;
  body: string;
  visibility: Visibility;
  accessScope: AccessScope;
  teamId?: string;
  observedAt?: string;
  tickers: string[];
  manualThemes: string[];
  kpis: string[];
  linkedEntities: LinkedEntity[];
  industries: string[];
  companyTags: string[];
  watchlistTags: string[];
  sourcePeople: string[];
  audioImportJobId?: string;
  updatedAt: string;
}

export type AudioImportJobStatus = 'processing' | 'ready' | 'failed' | 'applied';

export interface AudioImportJob {
  id: string;
  orgId: string;
  authorId: string;
  authorName: string;
  team?: string;
  teamId?: string;
  visibility: Visibility;
  accessScope: AccessScope;
  provider: string;
  status: AudioImportJobStatus;
  fileName: string;
  contentType: string;
  selectedNoteId?: string;
  language?: string;
  durationSeconds?: number;
  transcriptText?: string;
  error?: string;
  noteId?: string;
  rawStoragePath?: undefined;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptChunkRecord {
  id: string;
  orgId: string;
  importJobId: string;
  noteId?: string;
  chunkIndex: number;
  startMs?: number;
  endMs?: number;
  speaker?: string;
  text: string;
  confidence?: number;
  createdAt: string;
}

export interface WorkspaceExternalEvidenceItem extends ExternalEvidenceItem {
  orgId: string;
  authorName: string;
  linkedEntities: LinkedEntity[];
  tickers: string[];
  industries: string[];
  companyTags: string[];
  kpis: string[];
  watchlistTags: string[];
  sourcePeople: string[];
}

export interface WorkspaceExternalEvent extends ExternalEvent {
  orgId: string;
  linkedEntities: LinkedEntity[];
  tickers: string[];
  industries: string[];
  companyTags: string[];
  kpis: string[];
  watchlistTags: string[];
  sourcePeople: string[];
}

export interface CreateExternalEventInput {
  subject: string;
  text: string;
  direction?: Direction;
  evidence?: string;
  confidence?: number;
  observedAt?: string;
  linkedEntities?: LinkedEntity[];
  tickers?: string[];
  industries?: string[];
  companyTags?: string[];
  kpis?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
}

export interface CreateExternalEvidenceInput {
  sourceKind: ExternalSourceKind;
  title: string;
  summary: string;
  sourceUrl?: string;
  sourceId?: string;
  provider?: string;
  publishedAt: string;
  observedAt?: string;
  visibility?: Visibility;
  accessScope?: AccessScope;
  teamId?: string;
  linkedEntities?: LinkedEntity[];
  tickers?: string[];
  industries?: string[];
  companyTags?: string[];
  kpis?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  licenseMetadata?: Record<string, unknown>;
  events?: CreateExternalEventInput[];
}

export interface ExternalEvidenceListing {
  evidenceItems: WorkspaceExternalEvidenceItem[];
  events: WorkspaceExternalEvent[];
}

export interface CreateAudioImportJobInput {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  selectedNoteId?: string;
  language?: string;
  durationSeconds?: number;
  visibility?: Visibility;
  accessScope?: AccessScope;
  teamId?: string;
}

export interface AudioTranscriptionProviderInput extends CreateAudioImportJobInput {
  orgId: string;
  userId: string;
  userName: string;
  visibility: Visibility;
  accessScope: AccessScope;
  teamId?: string;
  teamName?: string;
}

export interface AudioTranscriptionChunkOutput {
  chunkIndex?: number;
  startMs?: number;
  endMs?: number;
  speaker?: string;
  text: string;
  confidence?: number;
}

export interface AudioTranscriptionOutput {
  text: string;
  chunks?: AudioTranscriptionChunkOutput[];
}

export interface AudioTranscriptionProvider {
  name: string;
  transcribe(input: AudioTranscriptionProviderInput): Promise<AudioTranscriptionOutput>;
}

export interface HttpAudioTranscriptionProviderConfig {
  name?: string;
  endpointUrl: string;
  apiKey?: string;
}

export interface WorkspaceSummary {
  subject: string;
  stance: string;
  positives: number;
  negatives: number;
  historicalPositives: number;
  historicalNegatives: number;
  total: number;
  currentTotal: number;
  historicalTotal: number;
  contradictions: number;
  tensions: number;
  updates: number;
  staleEvidence: number;
  topThemes: string[];
  summary: string;
}

export interface PersonMemorySummary {
  name: string;
  claimCount: number;
  positiveClaims: number;
  negativeClaims: number;
  neutralClaims: number;
  subjects: string[];
  latestObservedAt?: string;
  latestClaim?: string;
  contradictions: number;
  reversals: number;
}

export type DashboardScope = 'workspace' | 'team' | 'org';
export type DashboardRange = '30d' | '90d' | 'all';

export interface DashboardScopeAvailability {
  scope: DashboardScope;
  label: string;
  enabled: boolean;
  reason?: string;
}

export interface DashboardTeamOption {
  id?: string;
  name: string;
}

export interface DashboardTopItem {
  label: string;
  value: number;
  share: number;
}

export interface DashboardSignal {
  id: string;
  severity: Alert['severity'];
  title: string;
  body: string;
  company?: string;
}

export interface DashboardActivity {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  viewer: WorkspaceUser;
  scope: DashboardScope;
  range: DashboardRange;
  selectedTeam?: DashboardTeamOption;
  teams: DashboardTeamOption[];
  scopeAvailability: DashboardScopeAvailability[];
  asOf: string;
  totals: {
    notes: number;
    claims: number;
    relations: number;
    activeClaims: number;
  };
  relationMix: Record<RelationType, number>;
  freshness: Record<'fresh' | 'aging' | 'stale', number>;
  reviewBacklog: {
    claims: number;
    relations: number;
  };
  topCompanies: DashboardTopItem[];
  topThemes: DashboardTopItem[];
  topKpis: DashboardTopItem[];
  topSecurities: DashboardTopItem[];
  topWatchlists: DashboardTopItem[];
  topSourcePeople: DashboardTopItem[];
  signals: DashboardSignal[];
  activity: DashboardActivity[];
}

export interface DashboardOptions {
  scope?: DashboardScope;
  range?: DashboardRange;
  teamId?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  domain?: string;
}

export interface OrganizationTeam {
  id: string;
  orgId: string;
  name: string;
  sectorFocus?: string;
  defaultPermissions?: string;
  status: TeamStatus;
  createdAt: string;
}

export type OrganizationInviteStatus = 'pending' | 'accepted' | 'cancelled';

export interface OrganizationInvite {
  id: string;
  orgId: string;
  email: string;
  role: User['role'];
  orgRole: OrgRole;
  teamIds: string[];
  status: OrganizationInviteStatus;
  invitedBy: string;
  createdAt: string;
  acceptedAt?: string;
  cancelledAt?: string;
}

export interface AdminOrganizationSnapshot {
  organization: OrganizationSummary;
  teams: OrganizationTeam[];
  members: WorkspaceUser[];
  invites: OrganizationInvite[];
}

export interface WorkspaceOptions {
  asOf?: string;
}

export interface WorkspaceSnapshot {
  viewer: WorkspaceUser;
  visibleNotes: WorkspaceNote[];
  claims: WorkspaceClaim[];
  relations: WorkspaceRelation[];
  alerts: Alert[];
  companies: WorkspaceSummary[];
  themes: WorkspaceSummary[];
  people: PersonMemorySummary[];
  auditEvents: AuditEvent[];
  asOf: string;
}

export interface WorkspaceExport {
  kind: 'mycelium.workspace.v1';
  exportedAt: string;
  snapshot: WorkspaceSnapshot;
  reviewedRelations: WorkspaceRelation[];
  audioImportJobs: AudioImportJob[];
  transcriptChunks: TranscriptChunkRecord[];
  externalEvidenceItems?: WorkspaceExternalEvidenceItem[];
  externalEvents?: WorkspaceExternalEvent[];
}

export interface CreateNoteInput {
  title?: string;
  body: string;
  visibility?: Visibility;
  accessScope?: AccessScope;
  teamId?: string;
  sourceType?: string;
  observedAt?: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
  linkedEntities?: LinkedEntity[];
  industries?: string[];
  companyTags?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  audioImportJobId?: string;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  visibility?: Visibility;
  accessScope?: AccessScope;
  teamId?: string;
  observedAt?: string;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
  linkedEntities?: LinkedEntity[];
  industries?: string[];
  companyTags?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  audioImportJobId?: string;
}

export interface UpsertNoteDraftInput {
  selectedNoteId?: string;
  title?: string;
  body?: string;
  visibility?: Visibility;
  accessScope?: AccessScope;
  teamId?: string;
  observedAt?: string;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
  linkedEntities?: LinkedEntity[];
  industries?: string[];
  companyTags?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
  audioImportJobId?: string;
}

export interface UpdateClaimInput {
  reviewStatus?: ClaimReviewStatus;
  text?: string;
  subject?: string;
  direction?: Direction;
  themes?: string[];
  observedAt?: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
  reviewNote?: string;
  linkedEntities?: LinkedEntity[];
  tickers?: string[];
  industries?: string[];
  kpis?: string[];
  companyTags?: string[];
  watchlistTags?: string[];
  sourcePeople?: string[];
}

export interface UpdateRelationInput {
  reviewStatus?: RelationReviewStatus;
  type?: RelationType;
  reviewNote?: string;
}

export interface WorkspaceRepository {
  getOrganization(orgId: string): Promise<OrganizationSummary | undefined>;
  getUser(userId: string): Promise<WorkspaceUser | undefined>;
  updateUser(user: WorkspaceUser): Promise<void>;
  listUsers(orgId: string): Promise<WorkspaceUser[]>;
  listTeams(orgId: string): Promise<OrganizationTeam[]>;
  insertTeam(team: OrganizationTeam): Promise<void>;
  updateTeam(team: OrganizationTeam): Promise<void>;
  replaceTeamMemberships(orgId: string, userId: string, teamIds: string[]): Promise<void>;
  listInvites(orgId: string): Promise<OrganizationInvite[]>;
  insertInvite(invite: OrganizationInvite): Promise<void>;
  updateInvite(invite: OrganizationInvite): Promise<void>;
  listNotes(orgId: string): Promise<WorkspaceNote[]>;
  insertNote(note: WorkspaceNote): Promise<void>;
  updateNote(note: WorkspaceNote): Promise<void>;
  insertNoteRevision(revision: NoteRevision): Promise<void>;
  listNoteRevisions(orgId: string, noteId: string): Promise<NoteRevision[]>;
  getNoteDraft(orgId: string, userId: string): Promise<NoteDraft | undefined>;
  upsertNoteDraft(draft: NoteDraft): Promise<void>;
  deleteNoteDraft(orgId: string, userId: string): Promise<void>;
  listClaims(orgId: string): Promise<WorkspaceClaim[]>;
  replaceClaims(orgId: string, claims: WorkspaceClaim[]): Promise<void>;
  updateClaim(claim: WorkspaceClaim): Promise<void>;
  listRelations(orgId: string): Promise<WorkspaceRelation[]>;
  replaceRelations(orgId: string, relations: WorkspaceRelation[]): Promise<void>;
  updateRelation(relation: WorkspaceRelation): Promise<void>;
  listAudioImportJobs(orgId: string): Promise<AudioImportJob[]>;
  insertAudioImportJob(job: AudioImportJob): Promise<void>;
  updateAudioImportJob(job: AudioImportJob): Promise<void>;
  listTranscriptChunks(orgId: string): Promise<TranscriptChunkRecord[]>;
  replaceTranscriptChunksForJob(orgId: string, importJobId: string, chunks: TranscriptChunkRecord[]): Promise<void>;
  listExternalEvidenceItems(orgId: string): Promise<WorkspaceExternalEvidenceItem[]>;
  insertExternalEvidenceItem(item: WorkspaceExternalEvidenceItem): Promise<void>;
  listExternalEvents(orgId: string): Promise<WorkspaceExternalEvent[]>;
  replaceExternalEventsForItem(orgId: string, evidenceItemId: string, events: WorkspaceExternalEvent[]): Promise<void>;
  addAuditEvent(event: AuditEvent): Promise<void>;
  listAuditEvents(orgId: string): Promise<AuditEvent[]>;
}

export function createWorkspaceService(
  repository: WorkspaceRepository,
  primaryExtractionProvider?: ClaimExtractionProvider,
  audioTranscriptionProvider: AudioTranscriptionProvider = defaultAudioTranscriptionProvider
) {
  const extractionProvider = createFallbackClaimExtractionProvider(primaryExtractionProvider);

  async function requireViewer(viewerId: string): Promise<WorkspaceUser> {
    const viewer = await repository.getUser(viewerId);
    if (!viewer) throw new Error(`Unknown viewer ${viewerId}`);
    if (viewer.status === 'deactivated') throw new Error(`User ${viewerId} is deactivated`);
    return viewer;
  }

  async function requireAdmin(viewerId: string): Promise<WorkspaceUser> {
    const viewer = await requireViewer(viewerId);
    if (viewer.orgRole !== 'admin') throw new Error('Only organization administrators can manage organization structure');
    return viewer;
  }

  async function materializeGraph(orgId: string, actorId = 'system'): Promise<void> {
    const notes = await repository.listNotes(orgId);
    const existingClaims = new Map((await repository.listClaims(orgId)).map(claim => [claim.id, claim]));
    const previousRelations = new Map((await repository.listRelations(orgId)).map(relation => [relation.id, relation]));
    const transcriptChunksByNote = chunksByNoteId(await repository.listTranscriptChunks(orgId));
    const asOf = maxDate(notes.flatMap(note => [note.createdAt, note.observedAt]).filter(Boolean) as string[]);
    const extracted: WorkspaceClaim[] = [];

    for (const note of notes) {
      const claims = await extractionProvider.extractClaims(note, { asOf });
      for (const claim of claims) {
        const existing = existingClaims.get(claim.id);
        extracted.push(mergeClaim(orgId, note, claim, existing, asOf, transcriptChunksByNote.get(note.id) ?? []));
      }
    }

    await repository.replaceClaims(orgId, extracted);

    const activeClaims = extracted.filter(claim => claim.reviewStatus !== 'analyst_rejected');
    const generatedRelations = detectRelations(activeClaims);
    const materializedRelations = generatedRelations.map(relation => mergeRelation(orgId, relation, findStoredRelation(previousRelations, relation)));

    await repository.replaceRelations(orgId, materializedRelations);
    await repository.addAuditEvent(createAuditEvent(orgId, actorId, 'graph.materialized', 'organization', orgId, {
      claimCount: extracted.length,
      activeClaimCount: activeClaims.length,
      relationCount: materializedRelations.length
    }));
  }

  async function getWorkspace(viewerId: string, options: WorkspaceOptions = {}): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const orgNotes = await repository.listNotes(viewer.orgId);
    const orgClaims = await repository.listClaims(viewer.orgId);
    if (orgNotes.length && !orgClaims.length) {
      await materializeGraph(viewer.orgId);
    }

    const storedNotes = await repository.listNotes(viewer.orgId);
    const storedClaims = await repository.listClaims(viewer.orgId);
    const storedRelations = await repository.listRelations(viewer.orgId);
    const snapshotAsOf = options.asOf ?? maxDate(storedClaims
      .filter(claim => canAccess(viewer, claim) && claim.reviewStatus !== 'analyst_rejected')
      .map(claim => claim.observedAt));
    const notes = storedNotes
      .filter(note => canAccess(viewer, note))
      .filter(note => !options.asOf || noteObservedBy(note, snapshotAsOf));
    const visibleClaims = storedClaims
      .filter(claim => canAccess(viewer, claim))
      .filter(claim => !options.asOf || claimObservedBy(claim, snapshotAsOf))
      .map(claim => projectClaimAsOf(claim, snapshotAsOf));
    const activeClaims = visibleClaims.filter(claim => claim.reviewStatus !== 'analyst_rejected');
    const relationReviewState = new Map(storedRelations.map(relation => [relation.id, relation]));
    const relations = detectRelations(activeClaims, snapshotAsOf)
      .map(relation => overlayRelationReview(viewer.orgId, relation, findStoredRelation(relationReviewState, relation)))
      .filter(relation => relation.reviewStatus !== 'dismissed');
    const alerts = generateAlerts(relations, activeClaims);
    const companies = uniqueBy(activeClaims.map(claim => claim.subject), item => item).map(subject => synthesize(activeClaims, relations, subject));
    const themes = uniqueBy(activeClaims.flatMap(claim => claim.themes), item => item).map(theme => synthesize(activeClaims, relations, theme));
    const people = buildPersonMemorySummaries(activeClaims, relations);
    const auditEvents = (await repository.listAuditEvents(viewer.orgId))
      .filter(event => viewer.role === 'PM' || viewer.role === 'Compliance' || event.actorId === viewer.id)
      .slice(0, 25);

    return {
      viewer,
      visibleNotes: notes,
      claims: visibleClaims,
      relations,
      alerts,
      companies,
      themes,
      people,
      auditEvents,
      asOf: snapshotAsOf
    };
  }

  async function getDashboard(viewerId: string, options: DashboardOptions = {}): Promise<DashboardSnapshot> {
    const viewer = await requireViewer(viewerId);
    const orgNotes = await repository.listNotes(viewer.orgId);
    const orgClaims = await repository.listClaims(viewer.orgId);
    if (orgNotes.length && !orgClaims.length) {
      await materializeGraph(viewer.orgId);
    }

    const users = await repository.listUsers(viewer.orgId);
    const notes = await repository.listNotes(viewer.orgId);
    const claims = await repository.listClaims(viewer.orgId);
    const relations = await repository.listRelations(viewer.orgId);
    const auditEvents = await repository.listAuditEvents(viewer.orgId);
    const scope = options.scope ?? 'workspace';
    const range = options.range ?? '90d';
    const teams = dashboardTeams(users);
    const scopeAvailability = dashboardScopeAvailability(viewer);
    const selectedTeam = selectedDashboardTeam(viewer, users, options.teamId);
    const unavailable = scopeAvailability.find(item => item.scope === scope && !item.enabled);
    if (unavailable) {
      throw new Error(`Dashboard scope ${scope} is not available: ${unavailable.reason}`);
    }
    if (scope === 'team' && options.teamId && selectedTeam.id !== options.teamId && viewer.role !== 'PM' && viewer.role !== 'Compliance') {
      throw new Error('Dashboard scope team is not available for the selected team');
    }

    const scopedNotes = notes.filter(note => dashboardNoteInScope(viewer, note, scope, selectedTeam));
    const scopedNoteIds = new Set(scopedNotes.map(note => note.id));
    const scopedClaims = claims.filter(claim => scopedNoteIds.has(claim.noteId) && dashboardClaimInScope(viewer, claim, scope, selectedTeam));
    const activeScopedClaims = scopedClaims.filter(claim => claim.reviewStatus !== 'analyst_rejected');
    const asOf = maxDate([
      ...activeScopedClaims.map(claim => claim.observedAt),
      ...scopedNotes.map(note => note.observedAt ?? note.createdAt)
    ]);
    const cutoff = dashboardCutoff(asOf, range);
    const rangedNotes = scopedNotes.filter(note => dateInRange(note.observedAt ?? note.createdAt, cutoff));
    const rangedNoteIds = new Set(rangedNotes.map(note => note.id));
    const rangedClaims = activeScopedClaims.filter(claim => rangedNoteIds.has(claim.noteId) && dateInRange(claim.observedAt, cutoff));
    const rangedClaimIds = new Set(rangedClaims.map(claim => claim.id));
    const rangedRelations = relations.filter(relation => (
      relation.reviewStatus !== 'dismissed'
      && rangedClaimIds.has(relation.a.id)
      && rangedClaimIds.has(relation.b.id)
    ));

    return buildDashboardSnapshot({
      viewer,
      scope,
      range,
      selectedTeam: scope === 'team' ? selectedTeam : undefined,
      teams,
      scopeAvailability,
      notes: rangedNotes,
      claims: rangedClaims,
      relations: rangedRelations,
      auditEvents: auditEvents.filter(event => dateInRange(event.createdAt.slice(0, 10), cutoff)),
      asOf
    });
  }

  async function exportWorkspace(viewerId: string): Promise<WorkspaceExport> {
    const viewer = await requireViewer(viewerId);
    const snapshot = await getWorkspace(viewerId);
    const visibleNoteIds = new Set(snapshot.visibleNotes.map(note => note.id));
    const audioImportJobs = (await repository.listAudioImportJobs(viewer.orgId))
      .filter(job => job.status === 'applied' && Boolean(job.noteId && visibleNoteIds.has(job.noteId)));
    const exportedJobIds = new Set(audioImportJobs.map(job => job.id));
    const transcriptChunks = (await repository.listTranscriptChunks(viewer.orgId))
      .filter(chunk => Boolean(chunk.noteId && visibleNoteIds.has(chunk.noteId)) && exportedJobIds.has(chunk.importJobId));
    const externalEvidence = await listExternalEvidence(viewerId);
    const exportedEvidenceIds = new Set(externalEvidence.evidenceItems.map(item => item.id));
    return {
      kind: 'mycelium.workspace.v1',
      exportedAt: new Date().toISOString(),
      snapshot,
      reviewedRelations: await listAccessibleRelations(viewer),
      audioImportJobs,
      transcriptChunks,
      externalEvidenceItems: externalEvidence.evidenceItems,
      externalEvents: externalEvidence.events.filter(event => exportedEvidenceIds.has(event.evidenceItemId))
    };
  }

  async function importWorkspace(viewerId: string, input: WorkspaceExport): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const snapshot = readWorkspaceExport(input).snapshot;
    const users = await repository.listUsers(viewer.orgId);
    const usersById = new Map(users.map(user => [user.id, user]));
    const existingNoteIds = new Set((await repository.listNotes(viewer.orgId)).map(note => note.id));
    const importedNoteIds = new Set<string>();

    for (const exportedNote of snapshot.visibleNotes) {
      if (existingNoteIds.has(exportedNote.id)) continue;
      importedNoteIds.add(exportedNote.id);
      const author = usersById.get(exportedNote.authorId) ?? viewer;
      const accessScope = exportedNote.accessScope ?? accessScopeFromVisibility(exportedNote.visibility);
      await repository.insertNote({
        ...withDerivedMetadata(exportedNote),
        orgId: viewer.orgId,
        authorId: author.id,
        authorName: author.name,
        accessScope,
        visibility: accessScope === 'organization' ? 'public' : accessScope === 'personal' ? 'private' : 'team',
        team: accessScope === 'team' ? author.team : undefined,
        teamId: accessScope === 'team' ? author.teamId : undefined,
        updatedAt: exportedNote.updatedAt ?? new Date().toISOString()
      });
    }

    await materializeGraph(viewer.orgId, viewer.id);
    await restoreImportedTranscriptJobs(viewer, input, usersById, importedNoteIds);
    await restoreImportedExternalEvidence(viewer, input, usersById);
    await restoreImportedClaimState(viewer, snapshot, importedNoteIds);
    await restoreImportedRelationState(viewer, input.reviewedRelations ?? snapshot.relations, importedNoteIds);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'workspace.imported', 'organization', viewer.orgId, {
      noteCount: importedNoteIds.size,
      claimCount: snapshot.claims.length,
      relationCount: snapshot.relations.length
    }));
    return getWorkspace(viewerId);
  }

  async function listAccessibleRelations(viewer: WorkspaceUser): Promise<WorkspaceRelation[]> {
    return (await repository.listRelations(viewer.orgId)).filter(relation => (
      canAccess(viewer, relation.a) && canAccess(viewer, relation.b)
    ));
  }

  async function createNote(viewerId: string, input: CreateNoteInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const metadata = metadataFromInput(input);
    const access = await resolveNoteAccess(viewer, input.accessScope, input.visibility, input.teamId);
    const audioJob = input.audioImportJobId
      ? await requireReadyAudioImportJob(viewer, input.audioImportJobId, access)
      : undefined;
    const note: WorkspaceNote = {
      id: `n-${Date.now()}-${slug(input.body.slice(0, 32))}`,
      orgId: viewer.orgId,
      title: input.title?.trim() || `Research intake - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      body: input.body,
      authorId: viewer.id,
      authorName: viewer.name,
      team: access.teamName,
      teamId: access.teamId,
      visibility: access.visibility,
      accessScope: access.accessScope,
      sourceType: input.sourceType?.trim() || 'Typed note',
      createdAt: date,
      updatedAt: now,
      observedAt: input.observedAt || date,
      appliesToStart: input.appliesToStart,
      appliesToEnd: input.appliesToEnd,
      horizon: input.horizon,
      ...metadata
    };

    await repository.insertNote(note);
    if (audioJob) {
      await applyAudioImportJobToNote(viewer, audioJob, note);
    }
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'note.created', 'note', note.id, {
      visibility: note.visibility,
      accessScope: note.accessScope,
      teamId: note.teamId,
      tickers: note.tickers,
      manualThemes: note.manualThemes,
      kpis: note.kpis,
      industries: note.industries,
      companyTags: note.companyTags,
      watchlistTags: note.watchlistTags,
      sourcePeople: note.sourcePeople
    }));
    await materializeGraph(viewer.orgId, viewer.id);
    return getWorkspace(viewerId);
  }

  async function updateNote(viewerId: string, noteId: string, input: UpdateNoteInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const note = (await repository.listNotes(viewer.orgId)).find(item => item.id === noteId);
    if (!note || !canAccess(viewer, note)) throw new Error(`Note ${noteId} is not accessible`);
    if (note.authorId !== viewer.id) throw new Error('Only the note author can edit this note');

    const changedFields = noteChangedFields(note, input);
    if (!changedFields.length && !input.audioImportJobId) return getWorkspace(viewerId);

    const now = new Date().toISOString();
    if (changedFields.length) {
      await repository.insertNoteRevision({
        id: `revision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        orgId: viewer.orgId,
        noteId: note.id,
        editorId: viewer.id,
        editorName: viewer.name,
        previousTitle: note.title,
        previousBody: note.body,
        previousVisibility: note.visibility,
        previousSourceType: note.sourceType,
        previousObservedAt: note.observedAt,
        previousTickers: note.tickers ?? [],
        previousManualThemes: note.manualThemes ?? [],
        previousKpis: note.kpis ?? [],
        previousLinkedEntities: note.linkedEntities ?? [],
        previousIndustries: note.industries ?? [],
        previousCompanyTags: note.companyTags ?? [],
        previousWatchlistTags: note.watchlistTags ?? [],
        previousSourcePeople: note.sourcePeople ?? [],
        changedFields,
        createdAt: now
      });
    }

    const metadata = metadataFromInput(input, note.linkedEntities);
    const access = await resolveNoteAccess(viewer, input.accessScope, input.visibility, input.teamId, note);
    const audioJob = input.audioImportJobId
      ? await requireReadyAudioImportJob(viewer, input.audioImportJobId, access)
      : undefined;
    const updated: WorkspaceNote = {
      ...note,
      title: input.title?.trim() || note.title,
      body: Object.prototype.hasOwnProperty.call(input, 'body') ? input.body ?? '' : note.body,
      visibility: access.visibility,
      accessScope: access.accessScope,
      team: access.teamName,
      teamId: access.teamId,
      observedAt: Object.prototype.hasOwnProperty.call(input, 'observedAt') ? input.observedAt : note.observedAt,
      ...metadata,
      updatedAt: now
    };

    if (changedFields.length) {
      await repository.updateNote(updated);
    }
    if (audioJob) {
      await applyAudioImportJobToNote(viewer, audioJob, updated);
    }
    if (changedFields.length) {
      await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'note.revision.created', 'note', note.id, {
        changedFields
      }));
      await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'note.updated', 'note', note.id, {
        changedFields
      }));
    }

    if (requiresDerivedReviewReset(changedFields) || audioJob) {
      await resetDerivedReviewsForNote(viewer.orgId, note.id, now);
      await materializeGraph(viewer.orgId, viewer.id);
    }

    return getWorkspace(viewerId);
  }

  async function createAudioImportJob(viewerId: string, input: CreateAudioImportJobInput): Promise<AudioImportJob> {
    const viewer = await requireViewer(viewerId);
    const now = new Date().toISOString();
    const access = await resolveNoteAccess(viewer, input.accessScope, input.visibility, input.teamId);
    if (input.selectedNoteId) {
      const selectedNote = (await repository.listNotes(viewer.orgId)).find(note => note.id === input.selectedNoteId);
      if (!selectedNote || !canAccess(viewer, selectedNote)) throw new Error(`Note ${input.selectedNoteId} is not accessible`);
    }
    const baseJob: AudioImportJob = {
      id: `audio-job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      orgId: viewer.orgId,
      authorId: viewer.id,
      authorName: viewer.name,
      team: access.teamName,
      teamId: access.teamId,
      visibility: access.visibility,
      accessScope: access.accessScope,
      provider: audioTranscriptionProvider.name,
      status: 'processing',
      fileName: input.fileName,
      contentType: input.contentType,
      selectedNoteId: input.selectedNoteId,
      language: input.language,
      durationSeconds: input.durationSeconds,
      createdAt: now,
      updatedAt: now
    };
    await repository.insertAudioImportJob(baseJob);

    let completedJob: AudioImportJob;
    let chunks: TranscriptChunkRecord[] = [];
    try {
      const output = await audioTranscriptionProvider.transcribe({
        ...input,
        orgId: viewer.orgId,
        userId: viewer.id,
        userName: viewer.name,
        visibility: access.visibility,
        accessScope: access.accessScope,
        teamId: access.teamId,
        teamName: access.teamName
      });
      const transcriptText = typeof output?.text === 'string' ? output.text.trim() : '';
      const providerChunks = Array.isArray(output?.chunks) ? output.chunks : undefined;
      chunks = normalizeTranscriptChunks(viewer.orgId, baseJob.id, providerChunks ?? chunksFromTranscript(transcriptText));
      const materializedTranscript = transcriptText || chunks.map(chunk => chunk.text).join('\n').trim();
      if (!materializedTranscript) throw new Error('Audio transcription produced no transcript text');
      completedJob = {
        ...baseJob,
        status: 'ready',
        transcriptText: materializedTranscript,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      completedJob = {
        ...baseJob,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Audio transcription failed',
        updatedAt: new Date().toISOString()
      };
    }

    await repository.updateAudioImportJob(completedJob);
    await repository.replaceTranscriptChunksForJob(viewer.orgId, completedJob.id, chunks);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'audio_import_job.created', 'audio_import_job', completedJob.id, {
      status: completedJob.status,
      provider: completedJob.provider,
      fileName: completedJob.fileName,
      contentType: completedJob.contentType,
      chunkCount: chunks.length,
      error: completedJob.error
    }));
    return completedJob;
  }

  async function getAudioImportJob(viewerId: string, jobId: string): Promise<AudioImportJob | undefined> {
    const viewer = await requireViewer(viewerId);
    const job = (await repository.listAudioImportJobs(viewer.orgId)).find(item => item.id === jobId);
    if (!job) return undefined;
    if (job.authorId === viewer.id) return job;
    if (!job.noteId) return undefined;
    const note = (await repository.listNotes(viewer.orgId)).find(item => item.id === job.noteId);
    return note && canAccess(viewer, note) ? job : undefined;
  }

  async function listAudioImportJobTranscriptChunks(viewerId: string, jobId: string): Promise<TranscriptChunkRecord[]> {
    const viewer = await requireViewer(viewerId);
    const job = await getAudioImportJob(viewerId, jobId);
    if (!job) throw new Error(`Audio import job ${jobId} is not accessible`);
    return (await repository.listTranscriptChunks(viewer.orgId))
      .filter(chunk => chunk.importJobId === jobId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async function listNoteTranscriptChunks(viewerId: string, noteId: string): Promise<TranscriptChunkRecord[]> {
    const viewer = await requireViewer(viewerId);
    const note = (await repository.listNotes(viewer.orgId)).find(item => item.id === noteId);
    if (!note || !canAccess(viewer, note)) throw new Error(`Note ${noteId} is not accessible`);
    return (await repository.listTranscriptChunks(viewer.orgId))
      .filter(chunk => chunk.noteId === noteId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async function createExternalEvidenceItem(viewerId: string, input: CreateExternalEvidenceInput): Promise<WorkspaceExternalEvidenceItem> {
    const viewer = await requireViewer(viewerId);
    const sourceKind = readExternalSourceKind(input.sourceKind);
    const title = input.title?.trim();
    if (!title) throw new Error('External evidence title is required');
    const summary = input.summary?.trim();
    if (!summary) throw new Error('External evidence summary is required');
    const publishedAt = readDateOnly(input.publishedAt, 'External evidence publishedAt');
    const observedAt = readDateOnly(input.observedAt ?? input.publishedAt, 'External evidence observedAt');
    const now = new Date().toISOString();
    const access = await resolveNoteAccess(viewer, input.accessScope, input.visibility, input.teamId);
    const metadata = metadataFromInput(input);
    const item: WorkspaceExternalEvidenceItem = {
      id: `external-evidence-${Date.now()}-${slug(title)}`,
      orgId: viewer.orgId,
      title,
      summary,
      sourceKind,
      sourceUrl: input.sourceUrl?.trim() || undefined,
      sourceId: input.sourceId?.trim() || undefined,
      provider: input.provider?.trim() || undefined,
      publishedAt,
      observedAt,
      authorId: viewer.id,
      authorName: viewer.name,
      visibility: access.visibility,
      accessScope: access.accessScope,
      team: access.teamName,
      teamId: access.teamId,
      licenseMetadata: input.licenseMetadata ?? {},
      createdAt: now,
      updatedAt: now,
      ...metadata
    };
    const events = normalizeExternalEvents(viewer.orgId, item, input.events ?? []);

    await repository.insertExternalEvidenceItem(item);
    await repository.replaceExternalEventsForItem(viewer.orgId, item.id, events);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'external_evidence.created', 'external_evidence_item', item.id, {
      sourceKind: item.sourceKind,
      provider: item.provider,
      eventCount: events.length,
      accessScope: item.accessScope,
      teamId: item.teamId
    }));
    return item;
  }

  async function listExternalEvidence(viewerId: string): Promise<ExternalEvidenceListing> {
    const viewer = await requireViewer(viewerId);
    const evidenceItems = (await repository.listExternalEvidenceItems(viewer.orgId))
      .filter(item => canAccess(viewer, item))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.title.localeCompare(b.title));
    const itemIds = new Set(evidenceItems.map(item => item.id));
    const events = (await repository.listExternalEvents(viewer.orgId))
      .filter(event => itemIds.has(event.evidenceItemId))
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || a.subject.localeCompare(b.subject));
    return { evidenceItems, events };
  }

  async function requireReadyAudioImportJob(
    viewer: WorkspaceUser,
    jobId: string,
    access: { accessScope: AccessScope; visibility: Visibility; teamId?: string; teamName?: string }
  ): Promise<AudioImportJob> {
    const job = (await repository.listAudioImportJobs(viewer.orgId)).find(item => item.id === jobId);
    if (!job || job.authorId !== viewer.id) throw new Error(`Audio import job ${jobId} is not accessible`);
    if (job.status !== 'ready') throw new Error(`Audio import job ${jobId} is not ready`);
    if (job.accessScope !== access.accessScope || job.visibility !== access.visibility || (job.accessScope === 'team' && job.teamId !== access.teamId)) {
      throw new Error(`Audio import job ${jobId} access does not match the note`);
    }
    return job;
  }

  async function applyAudioImportJobToNote(viewer: WorkspaceUser, job: AudioImportJob, note: WorkspaceNote): Promise<void> {
    const now = new Date().toISOString();
    const chunks = (await repository.listTranscriptChunks(viewer.orgId))
      .filter(chunk => chunk.importJobId === job.id)
      .map(chunk => ({ ...chunk, noteId: note.id }));
    await repository.replaceTranscriptChunksForJob(viewer.orgId, job.id, chunks);
    await repository.updateAudioImportJob({
      ...job,
      status: 'applied',
      noteId: note.id,
      updatedAt: now
    });
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'audio_import_job.applied', 'audio_import_job', job.id, {
      noteId: note.id,
      chunkCount: chunks.length
    }));
  }

  async function getNoteDraft(viewerId: string): Promise<NoteDraft | undefined> {
    const viewer = await requireViewer(viewerId);
    return repository.getNoteDraft(viewer.orgId, viewer.id);
  }

  async function upsertNoteDraft(viewerId: string, input: UpsertNoteDraftInput): Promise<NoteDraft> {
    const viewer = await requireViewer(viewerId);
    const now = new Date().toISOString();
    const metadata = metadataFromInput(input);
    const access = await resolveNoteAccess(viewer, input.accessScope, input.visibility, input.teamId);
    const draft: NoteDraft = {
      orgId: viewer.orgId,
      userId: viewer.id,
      selectedNoteId: input.selectedNoteId || undefined,
      title: input.title ?? '',
      body: input.body ?? '',
      visibility: access.visibility,
      accessScope: access.accessScope,
      teamId: access.teamId,
      observedAt: input.observedAt,
      ...metadata,
      updatedAt: now
    };
    await repository.upsertNoteDraft(draft);
    return draft;
  }

  async function deleteNoteDraft(viewerId: string): Promise<void> {
    const viewer = await requireViewer(viewerId);
    await repository.deleteNoteDraft(viewer.orgId, viewer.id);
  }

  async function listNoteHistory(viewerId: string, noteId: string): Promise<NoteRevision[]> {
    const viewer = await requireViewer(viewerId);
    const note = (await repository.listNotes(viewer.orgId)).find(item => item.id === noteId);
    if (!note || !canAccess(viewer, note)) throw new Error(`Note ${noteId} is not accessible`);
    return (await repository.listNoteRevisions(viewer.orgId, noteId)).filter(revision => {
      return canAccess(viewer, {
        visibility: revision.previousVisibility,
        accessScope: accessScopeFromVisibility(revision.previousVisibility),
        team: note.team,
        teamId: note.teamId,
        authorId: note.authorId
      });
    });
  }

  async function resetDerivedReviewsForNote(orgId: string, noteId: string, updatedAt: string): Promise<void> {
    const claims = await repository.listClaims(orgId);
    const affectedClaimIds = new Set(claims.filter(claim => claim.noteId === noteId).map(claim => claim.id));
    if (!affectedClaimIds.size) return;

    await repository.replaceClaims(orgId, claims.map(claim => {
      if (!affectedClaimIds.has(claim.id)) return claim;
      return {
        ...claim,
        reviewStatus: 'machine',
        reviewNote: undefined,
        reviewerId: undefined,
        updatedAt
      };
    }));

    const relations = await repository.listRelations(orgId);
    await repository.replaceRelations(orgId, relations.map(relation => {
      if (!affectedClaimIds.has(relation.a.id) && !affectedClaimIds.has(relation.b.id)) return relation;
      return {
        ...relation,
        type: relation.originalType,
        reviewStatus: 'open',
        reviewNote: undefined,
        reviewerId: undefined,
        updatedAt
      };
    }));
  }

  async function updateClaim(viewerId: string, claimId: string, input: UpdateClaimInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const claim = (await repository.listClaims(viewer.orgId)).find(item => item.id === claimId);
    if (!claim || !canAccess(viewer, claim)) throw new Error(`Claim ${claimId} is not accessible`);

    const metadata = metadataForClaimUpdate(input, claim);
    const updated: WorkspaceClaim = {
      ...claim,
      text: input.text ?? claim.text,
      subject: input.subject ?? claim.subject,
      direction: input.direction ?? claim.direction,
      themes: input.themes ?? claim.themes,
      observedAt: input.observedAt ?? claim.observedAt,
      appliesToStart: input.appliesToStart ?? claim.appliesToStart,
      appliesToEnd: Object.prototype.hasOwnProperty.call(input, 'appliesToEnd') ? input.appliesToEnd : claim.appliesToEnd,
      horizon: input.horizon ?? claim.horizon,
      reviewStatus: input.reviewStatus ?? claim.reviewStatus,
      reviewNote: input.reviewNote ?? claim.reviewNote,
      reviewerId: viewer.id,
      ...metadata,
      updatedAt: new Date().toISOString()
    };

    await repository.updateClaim(updated);
    await repository.addAuditEvent(createAuditEvent(
      viewer.orgId,
      viewer.id,
      updated.reviewStatus === 'analyst_rejected' ? 'claim.rejected' : 'claim.updated',
      'claim',
      updated.id,
      { reviewStatus: updated.reviewStatus }
    ));
    await materializeGraph(viewer.orgId, viewer.id);
    return getWorkspace(viewerId);
  }

  async function updateRelation(viewerId: string, relationId: string, input: UpdateRelationInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    let relation = (await repository.listRelations(viewer.orgId)).find(item => item.id === relationId);
    if (!relation) {
      await materializeGraph(viewer.orgId, viewer.id);
      relation = (await repository.listRelations(viewer.orgId)).find(item => item.id === relationId);
    }
    if (!relation || !canAccess(viewer, relation.a) || !canAccess(viewer, relation.b)) {
      throw new Error(`Relation ${relationId} is not accessible`);
    }

    const reviewStatus = input.reviewStatus ?? relation.reviewStatus;
    const updated: WorkspaceRelation = {
      ...relation,
      type: reviewStatus === 'reclassified' && input.type ? input.type : relation.type,
      reviewStatus,
      reviewNote: input.reviewNote ?? relation.reviewNote,
      reviewerId: viewer.id,
      updatedAt: new Date().toISOString()
    };

    await repository.updateRelation(updated);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, `relation.${reviewStatus}`, 'relation', updated.id, {
      type: updated.type,
      originalType: updated.originalType
    }));
    return getWorkspace(viewerId);
  }

  async function getAdminOrganization(viewerId: string): Promise<AdminOrganizationSnapshot> {
    const viewer = await requireAdmin(viewerId);
    return adminSnapshot(viewer.orgId);
  }

  async function createOrganizationTeam(viewerId: string, input: { name: string; sectorFocus?: string }): Promise<OrganizationTeam> {
    const viewer = await requireAdmin(viewerId);
    const name = input.name.trim();
    if (!name) throw new Error('Team name is required');
    const now = new Date().toISOString();
    const team: OrganizationTeam = {
      id: `team-${slug(name)}-${Date.now()}`,
      orgId: viewer.orgId,
      name,
      sectorFocus: input.sectorFocus?.trim() || name,
      defaultPermissions: 'team',
      status: 'active',
      createdAt: now
    };
    await repository.insertTeam(team);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'team.created', 'team', team.id, { name: team.name }));
    return team;
  }

  async function updateOrganizationTeam(viewerId: string, teamId: string, input: { name?: string; sectorFocus?: string; status?: TeamStatus }): Promise<OrganizationTeam> {
    const viewer = await requireAdmin(viewerId);
    const team = await requireTeam(viewer.orgId, teamId);
    const updated: OrganizationTeam = {
      ...team,
      name: input.name?.trim() || team.name,
      sectorFocus: Object.prototype.hasOwnProperty.call(input, 'sectorFocus') ? input.sectorFocus?.trim() : team.sectorFocus,
      status: input.status ?? team.status
    };
    await repository.updateTeam(updated);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'team.updated', 'team', updated.id, { status: updated.status }));
    return updated;
  }

  async function archiveOrganizationTeam(viewerId: string, teamId: string): Promise<OrganizationTeam> {
    return updateOrganizationTeam(viewerId, teamId, { status: 'archived' });
  }

  async function createOrganizationInvite(
    viewerId: string,
    input: { email: string; role: User['role']; orgRole: OrgRole; teamIds?: string[] }
  ): Promise<OrganizationInvite> {
    const viewer = await requireAdmin(viewerId);
    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error('Invite email is required');
    await assertActiveTeams(viewer.orgId, input.teamIds ?? []);
    const existing = (await repository.listInvites(viewer.orgId)).find(invite => invite.email === email && invite.status !== 'cancelled');
    if (existing) throw new Error(`Invite for ${email} is already ${existing.status}`);
    const now = new Date().toISOString();
    const invite: OrganizationInvite = {
      id: `invite-${Date.now()}-${slug(email)}`,
      orgId: viewer.orgId,
      email,
      role: input.role,
      orgRole: input.orgRole,
      teamIds: input.teamIds ?? [],
      status: 'pending',
      invitedBy: viewer.id,
      createdAt: now
    };
    await repository.insertInvite(invite);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'invite.created', 'organization_invite', invite.id, { email }));
    return invite;
  }

  async function cancelOrganizationInvite(viewerId: string, inviteId: string): Promise<OrganizationInvite> {
    const viewer = await requireAdmin(viewerId);
    const invite = (await repository.listInvites(viewer.orgId)).find(item => item.id === inviteId);
    if (!invite) throw new Error(`Invite ${inviteId} not found`);
    if (invite.status !== 'pending') throw new Error(`Invite ${inviteId} is already ${invite.status}`);
    const updated: OrganizationInvite = { ...invite, status: 'cancelled', cancelledAt: new Date().toISOString() };
    await repository.updateInvite(updated);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'invite.cancelled', 'organization_invite', invite.id, { email: invite.email }));
    return updated;
  }

  async function updateOrganizationMember(
    viewerId: string,
    memberId: string,
    input: { role?: User['role']; orgRole?: OrgRole; status?: UserStatus; primaryTeamId?: string | null }
  ): Promise<WorkspaceUser> {
    const viewer = await requireAdmin(viewerId);
    const member = await repository.getUser(memberId);
    if (!member || member.orgId !== viewer.orgId) throw new Error(`Member ${memberId} not found`);
    if (input.primaryTeamId) await assertActiveTeams(viewer.orgId, [input.primaryTeamId]);
    const hasPrimaryTeamInput = Object.prototype.hasOwnProperty.call(input, 'primaryTeamId');
    const updated: WorkspaceUser = {
      ...member,
      role: input.role ?? member.role,
      orgRole: input.orgRole ?? member.orgRole,
      status: input.status ?? member.status,
      primaryTeamId: hasPrimaryTeamInput ? input.primaryTeamId ?? undefined : member.primaryTeamId
    };
    await assertRetainsActiveAdmin(viewer.orgId, member.id, updated);
    await repository.updateUser(updated);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'member.updated', 'profile', member.id, {
      role: updated.role,
      orgRole: updated.orgRole,
      status: updated.status
    }));
    return (await repository.getUser(member.id)) ?? updated;
  }

  async function replaceOrganizationMemberTeams(viewerId: string, memberId: string, teamIds: string[]): Promise<WorkspaceUser> {
    const viewer = await requireAdmin(viewerId);
    const member = await repository.getUser(memberId);
    if (!member || member.orgId !== viewer.orgId) throw new Error(`Member ${memberId} not found`);
    await assertActiveTeams(viewer.orgId, teamIds);
    await repository.replaceTeamMemberships(viewer.orgId, memberId, teamIds);
    const refreshed = await repository.getUser(memberId);
    if (!refreshed) throw new Error(`Member ${memberId} not found`);
    const primaryTeamId = teamIds.includes(refreshed.primaryTeamId ?? '') ? refreshed.primaryTeamId : teamIds[0];
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'member.teams.updated', 'profile', member.id, { teamIds }));
    if (primaryTeamId !== refreshed.primaryTeamId) {
      const updated = { ...refreshed, primaryTeamId, teamId: primaryTeamId, team: refreshed.teamMemberships.find(team => team.teamId === primaryTeamId)?.teamName ?? refreshed.team };
      await repository.updateUser(updated);
      return (await repository.getUser(memberId)) ?? updated;
    }
    return refreshed;
  }

  async function restoreImportedClaimState(
    viewer: WorkspaceUser,
    snapshot: WorkspaceSnapshot,
    importedNoteIds: Set<string>
  ): Promise<void> {
    const exportedClaims = new Map(snapshot.claims
      .filter(claim => importedNoteIds.has(claim.noteId))
      .map(claim => [claim.id, claim]));
    if (!exportedClaims.size) return;

    const currentClaims = await repository.listClaims(viewer.orgId);
    const restoredClaims = currentClaims.map(claim => {
      const exportedClaim = exportedClaims.get(claim.id);
      if (!exportedClaim) return claim;
      return {
        ...claim,
        text: exportedClaim.text,
        subject: exportedClaim.subject,
        direction: exportedClaim.direction,
        themes: exportedClaim.themes ?? [],
        observedAt: exportedClaim.observedAt,
        appliesToStart: exportedClaim.appliesToStart,
        appliesToEnd: exportedClaim.appliesToEnd,
        horizon: exportedClaim.horizon,
        transcriptCitations: exportedClaim.transcriptCitations ?? claim.transcriptCitations,
        reviewStatus: exportedClaim.reviewStatus,
        reviewNote: exportedClaim.reviewNote,
        reviewerId: exportedClaim.reviewerId,
        ...metadataForImportedClaim(exportedClaim, claim),
        updatedAt: exportedClaim.updatedAt ?? new Date().toISOString()
      };
    });

    await repository.replaceClaims(viewer.orgId, restoredClaims);
    await materializeGraph(viewer.orgId, viewer.id);
  }

  async function restoreImportedTranscriptJobs(
    viewer: WorkspaceUser,
    input: WorkspaceExport,
    usersById: Map<string, WorkspaceUser>,
    importedNoteIds: Set<string>
  ): Promise<void> {
    const jobs = (input.audioImportJobs ?? [])
      .filter(job => job.status === 'applied' && Boolean(job.noteId && importedNoteIds.has(job.noteId)));
    if (!jobs.length) return;

    const jobIds = new Set(jobs.map(job => job.id));
    const chunksByJob = new Map<string, TranscriptChunkRecord[]>();
    for (const chunk of input.transcriptChunks ?? []) {
      if (!jobIds.has(chunk.importJobId) || !chunk.noteId || !importedNoteIds.has(chunk.noteId)) continue;
      chunksByJob.set(chunk.importJobId, [...chunksByJob.get(chunk.importJobId) ?? [], chunk]);
    }

    for (const job of jobs) {
      const author = usersById.get(job.authorId) ?? viewer;
      const restoredJob: AudioImportJob = {
        ...job,
        orgId: viewer.orgId,
        authorId: author.id,
        authorName: author.name,
        rawStoragePath: undefined
      };
      await repository.insertAudioImportJob(restoredJob);
      await repository.replaceTranscriptChunksForJob(viewer.orgId, restoredJob.id, (chunksByJob.get(job.id) ?? []).map(chunk => ({
        ...chunk,
        orgId: viewer.orgId
      })));
    }
  }

  async function restoreImportedExternalEvidence(
    viewer: WorkspaceUser,
    input: WorkspaceExport,
    usersById: Map<string, WorkspaceUser>
  ): Promise<void> {
    const existingIds = new Set((await repository.listExternalEvidenceItems(viewer.orgId)).map(item => item.id));
    const items = (input.externalEvidenceItems ?? []).filter(item => item.id && !existingIds.has(item.id));
    if (!items.length) return;

    const importedIds = new Set(items.map(item => item.id));
    const eventsByItem = new Map<string, WorkspaceExternalEvent[]>();
    for (const event of input.externalEvents ?? []) {
      if (!importedIds.has(event.evidenceItemId)) continue;
      eventsByItem.set(event.evidenceItemId, [...eventsByItem.get(event.evidenceItemId) ?? [], event]);
    }

    for (const item of items) {
      const author = usersById.get(item.authorId) ?? viewer;
      const accessScope = item.accessScope ?? accessScopeFromVisibility(item.visibility);
      const restoredItem: WorkspaceExternalEvidenceItem = withDerivedMetadata({
        ...item,
        orgId: viewer.orgId,
        authorId: author.id,
        authorName: author.name,
        visibility: accessScope === 'organization' ? 'public' : accessScope === 'personal' ? 'private' : 'team',
        accessScope,
        team: accessScope === 'team' ? author.team : undefined,
        teamId: accessScope === 'team' ? author.teamId : undefined,
        licenseMetadata: item.licenseMetadata ?? {},
        updatedAt: item.updatedAt ?? new Date().toISOString()
      });
      await repository.insertExternalEvidenceItem(restoredItem);
      await repository.replaceExternalEventsForItem(viewer.orgId, restoredItem.id, (eventsByItem.get(item.id) ?? []).map(event => withDerivedMetadata({
        ...event,
        orgId: viewer.orgId,
        linkedEntities: event.linkedEntities ?? []
      })));
    }
  }

  async function restoreImportedRelationState(viewer: WorkspaceUser, relationsToRestore: WorkspaceRelation[], importedNoteIds: Set<string>): Promise<void> {
    const exportedRelations = new Map(relationsToRestore
      .filter(relation => importedNoteIds.has(relation.a.noteId) && importedNoteIds.has(relation.b.noteId))
      .map(relation => [relationPairKey(relation.a.id, relation.b.id), relation]));
    if (!exportedRelations.size) return;

    const currentRelations = await repository.listRelations(viewer.orgId);
    const restoredRelations = currentRelations.map(relation => {
      if (!importedNoteIds.has(relation.a.noteId) || !importedNoteIds.has(relation.b.noteId)) return relation;
      if (!canAccess(viewer, relation.a) || !canAccess(viewer, relation.b)) return relation;
      const exportedRelation = exportedRelations.get(relationPairKey(relation.a.id, relation.b.id));
      if (!exportedRelation) return relation;
      return {
        ...relation,
        id: exportedRelation.id,
        type: exportedRelation.type,
        originalType: exportedRelation.originalType,
        reviewStatus: exportedRelation.reviewStatus,
        reviewNote: exportedRelation.reviewNote,
        reviewerId: exportedRelation.reviewerId,
        updatedAt: exportedRelation.updatedAt ?? new Date().toISOString()
      };
    });

    await repository.replaceRelations(viewer.orgId, restoredRelations);
  }

  async function adminSnapshot(orgId: string): Promise<AdminOrganizationSnapshot> {
    const organization = await repository.getOrganization(orgId) ?? { id: orgId, name: 'Organization' };
    const [teams, members, invites] = await Promise.all([
      repository.listTeams(orgId),
      repository.listUsers(orgId),
      repository.listInvites(orgId)
    ]);
    return { organization, teams, members, invites };
  }

  async function requireTeam(orgId: string, teamId: string): Promise<OrganizationTeam> {
    const team = (await repository.listTeams(orgId)).find(item => item.id === teamId);
    if (!team) throw new Error(`Team ${teamId} not found`);
    return team;
  }

  async function assertActiveTeams(orgId: string, teamIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(teamIds.filter(Boolean))];
    const teams = await repository.listTeams(orgId);
    const active = new Set(teams.filter(team => team.status === 'active').map(team => team.id));
    const missing = uniqueIds.find(teamId => !active.has(teamId));
    if (missing) throw new Error(`Team ${missing} is not active`);
  }

  async function assertRetainsActiveAdmin(orgId: string, targetUserId: string, updatedTarget: WorkspaceUser): Promise<void> {
    const users = await repository.listUsers(orgId);
    const activeAdminCount = users.filter(user => {
      const candidate = user.id === targetUserId ? updatedTarget : user;
      return candidate.status === 'active' && candidate.orgRole === 'admin';
    }).length;
    if (activeAdminCount === 0) throw new Error('Cannot remove the last active organization admin');
  }

  async function resolveNoteAccess(
    viewer: WorkspaceUser,
    requestedAccessScope?: AccessScope,
    requestedVisibility?: Visibility,
    requestedTeamId?: string,
    existing?: WorkspaceNote
  ): Promise<{ accessScope: AccessScope; visibility: Visibility; teamId?: string; teamName?: string }> {
    const accessScope = requestedAccessScope ?? (requestedVisibility ? accessScopeFromVisibility(requestedVisibility) : existing?.accessScope ?? 'personal');
    const visibility = accessScope === 'organization' ? 'public' : accessScope === 'personal' ? 'private' : 'team';
    if (accessScope !== 'team') return { accessScope, visibility };

    const teamId = requestedTeamId ?? existing?.teamId ?? viewer.primaryTeamId ?? viewer.teamId ?? viewer.teamMemberships[0]?.teamId;
    if (!teamId) throw new Error('A team is required for team notes');
    const team = viewer.teamMemberships.find(item => item.teamId === teamId && item.status !== 'archived');
    const canUseTeam = Boolean(team) || viewer.role === 'PM' || viewer.role === 'Compliance';
    if (!canUseTeam) throw new Error(`Team ${teamId} is not available to this user`);
    const orgTeam = team ?? (await requireTeam(viewer.orgId, teamId));
    if (orgTeam.status === 'archived') throw new Error(`Team ${teamId} is archived`);
    return {
      accessScope,
      visibility,
      teamId,
      teamName: 'teamName' in orgTeam ? orgTeam.teamName : orgTeam.name
    };
  }

  return {
    materializeGraph,
    getDashboard,
    getWorkspace,
    exportWorkspace,
    importWorkspace,
    createNote,
    updateNote,
    createAudioImportJob,
    getAudioImportJob,
    listAudioImportJobTranscriptChunks,
    listNoteTranscriptChunks,
    createExternalEvidenceItem,
    listExternalEvidence,
    getNoteDraft,
    upsertNoteDraft,
    deleteNoteDraft,
    listNoteHistory,
    updateClaim,
    updateRelation,
    getAdminOrganization,
    createOrganizationTeam,
    updateOrganizationTeam,
    archiveOrganizationTeam,
    createOrganizationInvite,
    cancelOrganizationInvite,
    updateOrganizationMember,
    replaceOrganizationMemberTeams
  };
}

function readWorkspaceExport(input: WorkspaceExport): WorkspaceExport {
  if (!input || input.kind !== 'mycelium.workspace.v1' || !input.snapshot || !Array.isArray(input.snapshot.visibleNotes)) {
    throw new Error('Invalid workspace export');
  }
  return input;
}

const externalSourceKinds: ExternalSourceKind[] = ['news', 'filing', 'press_release', 'transcript', 'other'];

const defaultAudioTranscriptionProvider: AudioTranscriptionProvider = {
  name: 'not-configured',
  async transcribe() {
    throw new Error('Audio transcription provider is not configured');
  }
};

export function createHttpAudioTranscriptionProvider(
  config: HttpAudioTranscriptionProviderConfig,
  fetcher: typeof fetch = fetch
): AudioTranscriptionProvider {
  return {
    name: config.name?.trim() || 'http-transcription-provider',
    async transcribe(input) {
      const response = await fetcher(config.endpointUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          fileName: input.fileName,
          contentType: input.contentType,
          bytesBase64: bytesToBase64(input.bytes),
          language: input.language,
          durationSeconds: input.durationSeconds
        })
      });
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(`Audio transcription provider request failed (${response.status})${message ? `: ${message}` : ''}`);
      }
      const body = await response.json() as Partial<AudioTranscriptionOutput>;
      return {
        text: typeof body.text === 'string' ? body.text : '',
        chunks: Array.isArray(body.chunks) ? body.chunks : undefined
      };
    }
  };
}

export function createConfiguredAudioTranscriptionProvider(
  env: Record<string, string | undefined> = runtimeEnv(),
  fetcher: typeof fetch = fetch
): AudioTranscriptionProvider {
  const provider = env.MYCELIUM_AUDIO_TRANSCRIPTION_PROVIDER?.trim().toLowerCase();
  if (!provider) return defaultAudioTranscriptionProvider;
  if (provider !== 'http') throw new Error(`Unsupported audio transcription provider ${provider}`);
  const endpointUrl = env.MYCELIUM_AUDIO_TRANSCRIPTION_ENDPOINT?.trim();
  if (!endpointUrl) throw new Error('MYCELIUM_AUDIO_TRANSCRIPTION_ENDPOINT is required for the HTTP audio transcription provider');
  return createHttpAudioTranscriptionProvider({
    name: env.MYCELIUM_AUDIO_TRANSCRIPTION_PROVIDER_NAME,
    endpointUrl,
    apiKey: env.MYCELIUM_AUDIO_TRANSCRIPTION_API_KEY
  }, fetcher);
}

function runtimeEnv(): Record<string, string | undefined> {
  return ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env) ?? {};
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function chunksByNoteId(chunks: TranscriptChunkRecord[]): Map<string, TranscriptChunkRecord[]> {
  const result = new Map<string, TranscriptChunkRecord[]>();
  for (const chunk of chunks) {
    if (!chunk.noteId) continue;
    result.set(chunk.noteId, [...result.get(chunk.noteId) ?? [], chunk]);
  }
  return result;
}

function transcriptCitationsForClaim(claim: Claim, chunks: TranscriptChunkRecord[]): TranscriptCitation[] | undefined {
  if (!chunks.length) return undefined;
  const evidence = normalizeEvidenceText(`${claim.evidence} ${claim.text}`);
  const citations = chunks
    .filter(chunk => {
      const chunkText = normalizeEvidenceText(chunk.text);
      return chunkText.length > 0 && (evidence.includes(chunkText) || chunkText.includes(evidence));
    })
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(chunk => ({
      chunkId: chunk.id,
      importJobId: chunk.importJobId,
      chunkIndex: chunk.chunkIndex,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
      speaker: chunk.speaker,
      text: chunk.text,
      confidence: chunk.confidence
    }));
  return citations.length ? citations : undefined;
}

function normalizeEvidenceText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function readExternalSourceKind(value: string): ExternalSourceKind {
  if ((externalSourceKinds as string[]).includes(value)) return value as ExternalSourceKind;
  throw new Error('Invalid external evidence source kind');
}

function readDateOnly(value: string | undefined, fieldName: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`${fieldName} must be a YYYY-MM-DD date`);
  }
  return value;
}

function normalizeExternalEvents(
  orgId: string,
  item: WorkspaceExternalEvidenceItem,
  events: CreateExternalEventInput[]
): WorkspaceExternalEvent[] {
  return events.map((event, index) => {
    const subject = event.subject?.trim();
    const text = event.text?.replace(/\s+/g, ' ').trim();
    if (!subject || !text) throw new Error('External evidence events require subject and text');
    const direction = event.direction ?? 'neutral';
    if (direction !== 'positive' && direction !== 'negative' && direction !== 'neutral') throw new Error('Invalid external event direction');
    const confidence = normalizeRequiredConfidence(event.confidence ?? 0.5);
    const eventMetadataInput: MetadataInput = {
      linkedEntities: mergeLinkedEntities(
        item.linkedEntities,
        event.linkedEntities,
        [linkedEntity('company', 'subject', subject)]
      )
    };
    if (event.tickers) eventMetadataInput.tickers = event.tickers;
    if (event.industries) eventMetadataInput.industries = event.industries;
    if (event.companyTags) eventMetadataInput.companyTags = event.companyTags;
    if (event.kpis) eventMetadataInput.kpis = event.kpis;
    if (event.watchlistTags) eventMetadataInput.watchlistTags = event.watchlistTags;
    if (event.sourcePeople) eventMetadataInput.sourcePeople = event.sourcePeople;
    const eventMetadata = withDerivedMetadata(eventMetadataInput);
    return {
      id: `external-event-${item.id}-${index}`,
      orgId,
      evidenceItemId: item.id,
      subject,
      text,
      direction,
      evidence: event.evidence?.replace(/\s+/g, ' ').trim() || text,
      confidence,
      observedAt: readDateOnly(event.observedAt ?? item.observedAt, 'External event observedAt'),
      ...eventMetadata
    };
  });
}

function normalizeRequiredConfidence(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('External event confidence must be between 0 and 1');
  }
  return value;
}

function normalizeTranscriptChunks(
  orgId: string,
  importJobId: string,
  chunks: AudioTranscriptionChunkOutput[]
): TranscriptChunkRecord[] {
  const createdAt = new Date().toISOString();
  return chunks
    .map((chunk, index) => ({
      id: `transcript-chunk-${importJobId}-${chunk.chunkIndex ?? index}`,
      orgId,
      importJobId,
      chunkIndex: chunk.chunkIndex ?? index,
      startMs: chunk.startMs,
      endMs: chunk.endMs,
      speaker: chunk.speaker?.trim() || undefined,
      text: chunk.text.trim(),
      confidence: normalizeConfidence(chunk.confidence),
      createdAt
    }))
    .filter(chunk => chunk.text);
}

function chunksFromTranscript(text: string): AudioTranscriptionChunkOutput[] {
  const normalized = text.trim();
  return normalized ? [{ chunkIndex: 0, text: normalized }] : [];
}

function normalizeConfidence(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}

interface DashboardBuildInput {
  viewer: WorkspaceUser;
  scope: DashboardScope;
  range: DashboardRange;
  selectedTeam?: DashboardTeamOption;
  teams: DashboardTeamOption[];
  scopeAvailability: DashboardScopeAvailability[];
  notes: WorkspaceNote[];
  claims: WorkspaceClaim[];
  relations: WorkspaceRelation[];
  auditEvents: AuditEvent[];
  asOf: string;
}

const dashboardRelationTypes: RelationType[] = [
  'contradiction',
  'update_or_trend_reversal',
  'historical_tension',
  'open_tension',
  'corroboration',
  'agreement',
  'stale_evidence'
];

function buildDashboardSnapshot(input: DashboardBuildInput): DashboardSnapshot {
  const relationMix = Object.fromEntries(dashboardRelationTypes.map(type => [type, 0])) as Record<RelationType, number>;
  for (const relation of input.relations) {
    relationMix[relation.type] += 1;
  }

  const freshness = { fresh: 0, aging: 0, stale: 0 };
  for (const claim of input.claims) {
    freshness[claim.freshness] += 1;
  }

  return {
    viewer: input.viewer,
    scope: input.scope,
    range: input.range,
    selectedTeam: input.selectedTeam,
    teams: input.teams,
    scopeAvailability: input.scopeAvailability,
    asOf: input.asOf,
    totals: {
      notes: input.notes.length,
      claims: input.claims.length,
      relations: input.relations.length,
      activeClaims: input.claims.length
    },
    relationMix,
    freshness,
    reviewBacklog: {
      claims: input.claims.filter(claim => claim.reviewStatus === 'machine').length,
      relations: input.relations.filter(relation => relation.reviewStatus === 'open').length
    },
    topCompanies: topDashboardItems(input.claims.map(claim => claim.subject), input.claims.length),
    topThemes: topDashboardItems(input.claims.flatMap(claim => [...claim.themes, ...claim.manualThemes]), input.claims.length),
    topKpis: topDashboardItems(input.claims.flatMap(claim => claim.kpis), input.claims.length),
    topSecurities: topDashboardItems(input.claims.flatMap(claim => claim.tickers), input.claims.length),
    topWatchlists: topDashboardItems(input.claims.flatMap(claim => claim.watchlistTags), input.claims.length),
    topSourcePeople: topDashboardItems(input.claims.flatMap(claim => claim.sourcePeople), input.claims.length),
    signals: generateAlerts(input.relations, input.claims).slice(0, 8).map(alert => ({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      company: alert.company
    })),
    activity: input.auditEvents.slice(0, 8).map(event => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      createdAt: event.createdAt
    }))
  };
}

function dashboardScopeAvailability(viewer: WorkspaceUser): DashboardScopeAvailability[] {
  const canViewOrg = viewer.role === 'PM' || viewer.role === 'Compliance';
  return [
    { scope: 'workspace', label: 'Workspace', enabled: true },
    { scope: 'team', label: 'Team', enabled: true },
    {
      scope: 'org',
      label: 'Org',
      enabled: canViewOrg,
      reason: canViewOrg ? undefined : 'Only PM or Compliance users can view organization-wide dashboard aggregates.'
    }
  ];
}

function dashboardTeams(users: WorkspaceUser[]): DashboardTeamOption[] {
  return uniqueBy(
    users.flatMap(user => user.teamMemberships.map(team => ({ id: team.teamId, name: team.teamName, status: team.status })))
      .filter(team => team.status !== 'archived'),
    team => team.id ?? team.name.toLowerCase()
  ).sort((a, b) => a.name.localeCompare(b.name));
}

function selectedDashboardTeam(viewer: WorkspaceUser, users: WorkspaceUser[], teamId?: string): DashboardTeamOption {
  const teams = dashboardTeams(users);
  if (teamId) {
    const found = teams.find(team => team.id === teamId);
    if (!found) throw new Error(`Unknown dashboard team ${teamId}`);
    return found;
  }
  return { id: viewer.primaryTeamId ?? viewer.teamId, name: viewer.team };
}

function dashboardNoteInScope(viewer: WorkspaceUser, note: WorkspaceNote, scope: DashboardScope, selectedTeam: DashboardTeamOption): boolean {
  if (scope === 'workspace') return canAccess(viewer, note);
  if (scope === 'org') return (viewer.role === 'PM' || viewer.role === 'Compliance') && note.accessScope !== 'personal';
  return note.accessScope === 'team' && sameDashboardTeam(note, selectedTeam) && canAccess(viewer, note);
}

function dashboardClaimInScope(viewer: WorkspaceUser, claim: WorkspaceClaim, scope: DashboardScope, selectedTeam: DashboardTeamOption): boolean {
  if (scope === 'workspace') return canAccess(viewer, claim);
  if (scope === 'org') return (viewer.role === 'PM' || viewer.role === 'Compliance') && claim.accessScope !== 'personal';
  return claim.accessScope === 'team' && sameDashboardTeam(claim, selectedTeam) && canAccess(viewer, claim);
}

function sameDashboardTeam(item: { team?: string; teamId?: string }, selectedTeam: DashboardTeamOption): boolean {
  return selectedTeam.id ? item.teamId === selectedTeam.id : item.team === selectedTeam.name;
}

function dashboardCutoff(asOf: string, range: DashboardRange): string | undefined {
  if (range === 'all') return undefined;
  const days = range === '30d' ? 30 : 90;
  const date = new Date(`${asOf}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function dateInRange(value: string | undefined, cutoff: string | undefined): boolean {
  return !cutoff || Boolean(value && Date.parse(value) >= Date.parse(cutoff));
}

function topDashboardItems(values: string[], denominator: number): DashboardTopItem[] {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const base = Math.max(1, denominator);
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value, share: Math.round((value / base) * 100) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 6);
}

function noteChangedFields(note: WorkspaceNote, input: UpdateNoteInput): string[] {
  const changed: string[] = [];
  if (Object.prototype.hasOwnProperty.call(input, 'title') && (input.title?.trim() || note.title) !== note.title) changed.push('title');
  if (Object.prototype.hasOwnProperty.call(input, 'body') && (input.body ?? '') !== note.body) changed.push('body');
  if (Object.prototype.hasOwnProperty.call(input, 'visibility') && input.visibility !== note.visibility) changed.push('visibility');
  if (Object.prototype.hasOwnProperty.call(input, 'accessScope') && input.accessScope !== note.accessScope) changed.push('accessScope');
  if (Object.prototype.hasOwnProperty.call(input, 'teamId') && input.teamId !== note.teamId) changed.push('teamId');
  if (Object.prototype.hasOwnProperty.call(input, 'observedAt') && input.observedAt !== note.observedAt) changed.push('observedAt');
  if (Object.prototype.hasOwnProperty.call(input, 'tickers') && !sameStringArray(input.tickers ?? [], note.tickers ?? [])) changed.push('tickers');
  if (Object.prototype.hasOwnProperty.call(input, 'manualThemes') && !sameStringArray(input.manualThemes ?? [], note.manualThemes ?? [])) changed.push('manualThemes');
  if (Object.prototype.hasOwnProperty.call(input, 'kpis') && !sameStringArray(input.kpis ?? [], note.kpis ?? [])) changed.push('kpis');
  if (Object.prototype.hasOwnProperty.call(input, 'industries') && !sameStringArray(input.industries ?? [], note.industries ?? [])) changed.push('industries');
  if (Object.prototype.hasOwnProperty.call(input, 'companyTags') && !sameStringArray(input.companyTags ?? [], note.companyTags ?? [])) changed.push('companyTags');
  if (Object.prototype.hasOwnProperty.call(input, 'watchlistTags') && !sameStringArray(input.watchlistTags ?? [], note.watchlistTags ?? [])) changed.push('watchlistTags');
  if (Object.prototype.hasOwnProperty.call(input, 'sourcePeople') && !sameStringArray(input.sourcePeople ?? [], note.sourcePeople ?? [])) changed.push('sourcePeople');
  if (Object.prototype.hasOwnProperty.call(input, 'linkedEntities') && !sameLinkedEntities(input.linkedEntities ?? [], note.linkedEntities ?? [])) changed.push('linkedEntities');
  return changed;
}

function requiresDerivedReviewReset(changedFields: string[]): boolean {
  return changedFields.some(field => field !== 'title');
}

function sameStringArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

type MetadataInput = Partial<MetadataArrays> & { linkedEntities?: LinkedEntity[] };

interface NormalizedMetadata extends MetadataArrays {
  linkedEntities: LinkedEntity[];
}

const metadataRoles: Record<keyof MetadataArrays, EntityRole[]> = {
  tickers: ['security'],
  manualThemes: ['theme'],
  kpis: ['kpi'],
  industries: ['industry'],
  companyTags: ['company'],
  watchlistTags: ['watchlist'],
  sourcePeople: ['source_person']
};

function metadataFromInput(input: MetadataInput, existing: LinkedEntity[] = []): NormalizedMetadata {
  let linkedEntities = Object.prototype.hasOwnProperty.call(input, 'linkedEntities')
    ? normalizeLinkedEntities(input.linkedEntities ?? [])
    : normalizeLinkedEntities(existing);

  for (const key of Object.keys(metadataRoles) as Array<keyof MetadataArrays>) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const replacement = legacyArraysToLinkedEntities({ [key]: input[key] ?? [] });
    linkedEntities = replaceEntityRoles(linkedEntities, metadataRoles[key], replacement);
  }

  return withDerivedMetadata({ ...input, linkedEntities });
}

function withDerivedMetadata<T extends MetadataInput>(value: T): T & NormalizedMetadata {
  const linkedEntities = mergeLinkedEntities(value.linkedEntities, legacyArraysToLinkedEntities(value));
  const arrays = metadataArraysFromLinkedEntities(linkedEntities);
  return {
    ...value,
    linkedEntities,
    ...arrays,
    tickers: Object.prototype.hasOwnProperty.call(value, 'tickers') ? normalizeStringArray(value.tickers ?? []) : arrays.tickers,
    manualThemes: Object.prototype.hasOwnProperty.call(value, 'manualThemes') ? normalizeStringArray(value.manualThemes ?? []) : arrays.manualThemes,
    kpis: Object.prototype.hasOwnProperty.call(value, 'kpis') ? normalizeStringArray(value.kpis ?? []) : arrays.kpis,
    industries: Object.prototype.hasOwnProperty.call(value, 'industries') ? normalizeStringArray(value.industries ?? []) : arrays.industries,
    companyTags: Object.prototype.hasOwnProperty.call(value, 'companyTags') ? normalizeStringArray(value.companyTags ?? []) : arrays.companyTags,
    watchlistTags: Object.prototype.hasOwnProperty.call(value, 'watchlistTags') ? normalizeStringArray(value.watchlistTags ?? []) : arrays.watchlistTags,
    sourcePeople: Object.prototype.hasOwnProperty.call(value, 'sourcePeople') ? normalizeStringArray(value.sourcePeople ?? []) : arrays.sourcePeople
  };
}

function metadataForMaterializedClaim(note: WorkspaceNote, claim: Claim): NormalizedMetadata {
  const noteEntities = normalizeLinkedEntities(note.linkedEntities).filter(entity => (
    entity.role === 'security'
    || entity.role === 'industry'
    || entity.role === 'kpi'
    || entity.role === 'watchlist'
    || entity.role === 'source_person'
  ));
  const claimEntities = [
    linkedEntity('company', 'subject', claim.subject),
    ...claim.themes.map(theme => linkedEntity('theme', 'theme', theme))
  ];
  return withDerivedMetadata({ linkedEntities: mergeLinkedEntities(claimEntities, noteEntities) });
}

function metadataForExistingClaim(claim: WorkspaceClaim): NormalizedMetadata {
  return withDerivedMetadata({
    linkedEntities: mergeLinkedEntities(
      claim.linkedEntities,
      [linkedEntity('company', 'subject', claim.subject)],
      claim.themes.map(theme => linkedEntity('theme', 'theme', theme))
    ),
    tickers: claim.tickers ?? [],
    manualThemes: claim.manualThemes ?? claim.themes ?? [],
    kpis: claim.kpis ?? [],
    industries: claim.industries ?? [],
    companyTags: claim.companyTags ?? [],
    watchlistTags: claim.watchlistTags ?? [],
    sourcePeople: claim.sourcePeople ?? []
  });
}

function metadataForClaimUpdate(input: UpdateClaimInput, claim: WorkspaceClaim): NormalizedMetadata {
  const metadataInput = input as MetadataInput;
  let linkedEntities = Object.prototype.hasOwnProperty.call(input, 'linkedEntities')
    ? normalizeLinkedEntities(input.linkedEntities ?? [])
    : metadataForExistingClaim(claim).linkedEntities;

  if (Object.prototype.hasOwnProperty.call(input, 'subject')) {
    linkedEntities = replaceEntityRoles(linkedEntities, ['subject'], input.subject ? [linkedEntity('company', 'subject', input.subject)] : []);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'themes')) {
    linkedEntities = replaceEntityRoles(linkedEntities, ['theme'], (input.themes ?? []).map(theme => linkedEntity('theme', 'theme', theme)));
  }

  for (const key of Object.keys(metadataRoles) as Array<keyof MetadataArrays>) {
    if (!Object.prototype.hasOwnProperty.call(metadataInput, key)) continue;
    const replacement = legacyArraysToLinkedEntities({ [key]: metadataInput[key] ?? [] });
    linkedEntities = replaceEntityRoles(linkedEntities, metadataRoles[key], replacement);
  }

  return withDerivedMetadata({ linkedEntities });
}

function metadataForImportedClaim(exportedClaim: WorkspaceClaim, currentClaim: WorkspaceClaim): NormalizedMetadata {
  return withDerivedMetadata({
    linkedEntities: exportedClaim.linkedEntities?.length ? exportedClaim.linkedEntities : currentClaim.linkedEntities,
    tickers: exportedClaim.tickers ?? currentClaim.tickers ?? [],
    manualThemes: exportedClaim.manualThemes ?? exportedClaim.themes ?? currentClaim.manualThemes ?? [],
    kpis: exportedClaim.kpis ?? currentClaim.kpis ?? [],
    industries: exportedClaim.industries ?? currentClaim.industries ?? [],
    companyTags: exportedClaim.companyTags ?? currentClaim.companyTags ?? [],
    watchlistTags: exportedClaim.watchlistTags ?? currentClaim.watchlistTags ?? [],
    sourcePeople: exportedClaim.sourcePeople ?? currentClaim.sourcePeople ?? []
  });
}

function replaceEntityRoles(current: LinkedEntity[], roles: EntityRole[], replacement: LinkedEntity[]): LinkedEntity[] {
  const blocked = new Set(roles);
  return mergeLinkedEntities(
    normalizeLinkedEntities(current).filter(entity => !blocked.has(entity.role)),
    replacement
  );
}

function normalizeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function buildPersonMemorySummaries(claims: WorkspaceClaim[], relations: WorkspaceRelation[]): PersonMemorySummary[] {
  const claimsByPerson = new Map<string, WorkspaceClaim[]>();
  for (const claim of claims) {
    for (const person of claim.sourcePeople ?? []) {
      claimsByPerson.set(person, [...claimsByPerson.get(person) ?? [], claim]);
    }
  }

  return [...claimsByPerson.entries()]
    .map(([name, personClaims]) => {
      const claimIds = new Set(personClaims.map(claim => claim.id));
      const personRelations = relations.filter(relation => claimIds.has(relation.a.id) && claimIds.has(relation.b.id));
      const latest = [...personClaims].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
      return {
        name,
        claimCount: personClaims.length,
        positiveClaims: personClaims.filter(claim => claim.direction === 'positive').length,
        negativeClaims: personClaims.filter(claim => claim.direction === 'negative').length,
        neutralClaims: personClaims.filter(claim => claim.direction === 'neutral').length,
        subjects: uniqueBy(personClaims.map(claim => claim.subject), item => item).sort((a, b) => a.localeCompare(b)),
        latestObservedAt: latest?.observedAt,
        latestClaim: latest?.text,
        contradictions: personRelations.filter(relation => relation.type === 'contradiction').length,
        reversals: personRelations.filter(relation => relation.type === 'update_or_trend_reversal').length
      };
    })
    .sort((a, b) => b.claimCount - a.claimCount || a.name.localeCompare(b.name));
}

export function createMemoryWorkspaceRepository() {
  class MemoryWorkspaceRepository implements WorkspaceRepository {
    organization: OrganizationSummary = { id: 'org1', name: 'Mycelium Capital', domain: 'example.test' };
    users: WorkspaceUser[] = [];
    teams: OrganizationTeam[] = [];
    invites: OrganizationInvite[] = [];
    notes: WorkspaceNote[] = [];
    claims: WorkspaceClaim[] = [];
    relations: WorkspaceRelation[] = [];
    auditEvents: AuditEvent[] = [];
    noteRevisions: NoteRevision[] = [];
    noteDrafts: NoteDraft[] = [];
    audioImportJobs: AudioImportJob[] = [];
    transcriptChunks: TranscriptChunkRecord[] = [];
    externalEvidenceItems: WorkspaceExternalEvidenceItem[] = [];
    externalEvents: WorkspaceExternalEvent[] = [];

    seed(input: { organizationId: string; users: User[]; notes: Note[] }) {
      this.organization = { id: input.organizationId, name: 'Mycelium Capital', domain: 'example.test' };
      const teamById = new Map<string, OrganizationTeam>();
      const addTeam = (teamId: string | undefined, teamName: string | undefined) => {
        if (!teamId && !teamName) return;
        const id = teamId ?? `team-${slug(teamName ?? 'Research')}`;
        if (teamById.has(id)) return;
        teamById.set(id, {
          id,
          orgId: input.organizationId,
          name: teamName ?? id,
          sectorFocus: teamName ?? id,
          defaultPermissions: 'team',
          status: 'active',
          createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
        });
      };
      for (const user of input.users) {
        for (const team of user.teamMemberships ?? []) addTeam(team.teamId, team.teamName);
        addTeam(user.teamId, user.team);
      }
      for (const note of input.notes) addTeam(note.teamId, note.team);
      this.teams = [...teamById.values()];
      this.users = input.users.map((user, index) => {
        const teamMemberships = user.teamMemberships?.length
          ? user.teamMemberships
          : [{ teamId: user.teamId ?? `team-${slug(user.team)}`, teamName: user.team, role: 'member', status: 'active' as const }];
        const primaryTeamId = user.primaryTeamId ?? user.teamId ?? teamMemberships[0]?.teamId;
        const primaryTeam = teamMemberships.find(team => team.teamId === primaryTeamId) ?? teamMemberships[0];
        return {
          ...user,
          orgId: input.organizationId,
          email: `${slug(user.name)}@example.test`,
          orgRole: user.orgRole ?? (index === 0 ? 'admin' : 'member'),
          status: user.status ?? 'active',
          primaryTeamId,
          teamId: primaryTeamId,
          team: primaryTeam?.teamName ?? user.team,
          teamMemberships
        };
      });
      this.notes = input.notes.map(note => {
        const author = this.users.find(user => user.id === note.authorId);
        const accessScope = note.accessScope ?? accessScopeFromVisibility(note.visibility);
        const noteTeam = accessScope === 'team'
          ? this.teams.find(team => team.id === note.teamId && team.name === note.team)
            ?? this.teams.find(team => team.name === note.team)
          : undefined;
        return withDerivedMetadata({
          ...note,
          orgId: input.organizationId,
          authorName: author?.name ?? note.authorId,
          accessScope,
          team: noteTeam?.name,
          teamId: noteTeam?.id,
          updatedAt: new Date(`${note.createdAt}T00:00:00.000Z`).toISOString(),
          tickers: note.tickers ?? [],
          manualThemes: note.manualThemes ?? [],
          kpis: note.kpis ?? []
        });
      });
      this.claims = [];
      this.relations = [];
      this.auditEvents = [];
      this.noteRevisions = [];
      this.noteDrafts = [];
      this.audioImportJobs = [];
      this.transcriptChunks = [];
      this.externalEvidenceItems = [];
      this.externalEvents = [];
      this.invites = [];
    }

    async getOrganization(orgId: string) { return this.organization.id === orgId ? this.organization : undefined; }
    async getUser(userId: string) { return this.users.find(user => user.id === userId); }
    async updateUser(user: WorkspaceUser) {
      this.users = this.users.map(item => item.id === user.id ? user : item);
    }
    async listUsers(orgId: string) { return this.users.filter(user => user.orgId === orgId); }
    async listTeams(orgId: string) { return this.teams.filter(team => team.orgId === orgId); }
    async insertTeam(team: OrganizationTeam) { this.teams.push(team); }
    async updateTeam(team: OrganizationTeam) {
      this.teams = this.teams.map(item => item.id === team.id ? team : item);
      this.users = this.users.map(user => ({
        ...user,
        team: user.teamId === team.id ? team.name : user.team,
        teamMemberships: user.teamMemberships.map(membership => membership.teamId === team.id ? { ...membership, teamName: team.name, status: team.status } : membership)
      }));
      this.notes = this.notes.map(note => note.teamId === team.id ? { ...note, team: team.name } : note);
      this.claims = this.claims.map(claim => claim.teamId === team.id ? { ...claim, team: team.name } : claim);
    }
    async replaceTeamMemberships(orgId: string, userId: string, teamIds: string[]) {
      const teams = this.teams.filter(team => team.orgId === orgId && teamIds.includes(team.id));
      this.users = this.users.map(user => {
        if (user.id !== userId || user.orgId !== orgId) return user;
        const primaryTeamId = teamIds.includes(user.primaryTeamId ?? '') ? user.primaryTeamId : teamIds[0];
        const primaryTeam = teams.find(team => team.id === primaryTeamId) ?? teams[0];
        return {
          ...user,
          primaryTeamId,
          teamId: primaryTeamId,
          team: primaryTeam?.name ?? user.team,
          teamMemberships: teams.map(team => ({ teamId: team.id, teamName: team.name, role: 'member', status: team.status }))
        };
      });
    }
    async listInvites(orgId: string) { return this.invites.filter(invite => invite.orgId === orgId); }
    async insertInvite(invite: OrganizationInvite) { this.invites.unshift(invite); }
    async updateInvite(invite: OrganizationInvite) {
      this.invites = this.invites.map(item => item.id === invite.id ? invite : item);
    }
    async listNotes(orgId: string) { return this.notes.filter(note => note.orgId === orgId); }
    async insertNote(note: WorkspaceNote) { this.notes.unshift(note); }
    async updateNote(note: WorkspaceNote) {
      this.notes = this.notes.map(item => item.id === note.id ? note : item);
    }
    async insertNoteRevision(revision: NoteRevision) {
      this.noteRevisions.unshift(revision);
    }
    async listNoteRevisions(orgId: string, noteId: string) {
      return this.noteRevisions.filter(revision => revision.orgId === orgId && revision.noteId === noteId);
    }
    async getNoteDraft(orgId: string, userId: string) {
      return this.noteDrafts.find(draft => draft.orgId === orgId && draft.userId === userId);
    }
    async upsertNoteDraft(draft: NoteDraft) {
      this.noteDrafts = [
        draft,
        ...this.noteDrafts.filter(item => item.orgId !== draft.orgId || item.userId !== draft.userId)
      ];
    }
    async deleteNoteDraft(orgId: string, userId: string) {
      this.noteDrafts = this.noteDrafts.filter(draft => draft.orgId !== orgId || draft.userId !== userId);
    }
    async listClaims(orgId: string) { return this.claims.filter(claim => claim.orgId === orgId); }
    async replaceClaims(orgId: string, claims: WorkspaceClaim[]) {
      this.claims = [...this.claims.filter(claim => claim.orgId !== orgId), ...claims];
    }
    async updateClaim(claim: WorkspaceClaim) {
      this.claims = this.claims.map(item => item.id === claim.id ? claim : item);
    }
    async listRelations(orgId: string) { return this.relations.filter(relation => relation.orgId === orgId); }
    async replaceRelations(orgId: string, relations: WorkspaceRelation[]) {
      const existing = this.relations.filter(relation => relation.orgId !== orgId);
      this.relations = [...existing, ...relations];
    }
    async updateRelation(relation: WorkspaceRelation) {
      this.relations = this.relations.map(item => item.id === relation.id ? relation : item);
    }
    async listAudioImportJobs(orgId: string) {
      return this.audioImportJobs.filter(job => job.orgId === orgId);
    }
    async insertAudioImportJob(job: AudioImportJob) {
      this.audioImportJobs.unshift(job);
    }
    async updateAudioImportJob(job: AudioImportJob) {
      this.audioImportJobs = this.audioImportJobs.map(item => item.id === job.id ? job : item);
    }
    async listTranscriptChunks(orgId: string) {
      return this.transcriptChunks.filter(chunk => chunk.orgId === orgId);
    }
    async replaceTranscriptChunksForJob(orgId: string, importJobId: string, chunks: TranscriptChunkRecord[]) {
      this.transcriptChunks = [
        ...this.transcriptChunks.filter(chunk => chunk.orgId !== orgId || chunk.importJobId !== importJobId),
        ...chunks
      ];
    }
    async listExternalEvidenceItems(orgId: string) {
      return this.externalEvidenceItems.filter(item => item.orgId === orgId);
    }
    async insertExternalEvidenceItem(item: WorkspaceExternalEvidenceItem) {
      this.externalEvidenceItems.unshift(item);
    }
    async listExternalEvents(orgId: string) {
      return this.externalEvents.filter(event => event.orgId === orgId);
    }
    async replaceExternalEventsForItem(orgId: string, evidenceItemId: string, events: WorkspaceExternalEvent[]) {
      this.externalEvents = [
        ...this.externalEvents.filter(event => event.orgId !== orgId || event.evidenceItemId !== evidenceItemId),
        ...events
      ];
    }
    async addAuditEvent(event: AuditEvent) {
      this.auditEvents.unshift(event);
    }
    async listAuditEvents(orgId: string) {
      return this.auditEvents.filter(event => event.orgId === orgId);
    }
  }

  return new MemoryWorkspaceRepository();
}

function mergeClaim(
  orgId: string,
  note: WorkspaceNote,
  claim: Claim,
  existing: WorkspaceClaim | undefined,
  asOf: string,
  transcriptChunks: TranscriptChunkRecord[] = []
): WorkspaceClaim {
  const preserved = Boolean(existing && existing.reviewStatus !== 'machine');
  const base = preserved && existing ? existing : claim;
  const metadata = preserved && existing
    ? metadataForExistingClaim(existing)
    : metadataForMaterializedClaim(note, claim);
  const transcriptCitations = preserved && existing
    ? existing.transcriptCitations
    : transcriptCitationsForClaim(claim, transcriptChunks);
  return {
    ...claim,
    orgId,
    authorName: note.authorName,
    teamId: note.teamId,
    accessScope: note.accessScope,
    transcriptCitations,
    text: base.text,
    subject: base.subject,
    direction: base.direction,
    confidence: base.confidence,
    themes: base.themes,
    observedAt: base.observedAt,
    appliesToStart: base.appliesToStart,
    appliesToEnd: base.appliesToEnd,
    horizon: base.horizon,
    freshness: freshnessAsOf(base, asOf),
    ...metadata,
    reviewStatus: existing?.reviewStatus ?? 'machine',
    reviewNote: existing?.reviewNote,
    reviewerId: existing?.reviewerId,
    updatedAt: existing?.updatedAt ?? new Date().toISOString()
  };
}

function mergeRelation(orgId: string, relation: Relation, existing?: WorkspaceRelation): WorkspaceRelation {
  const reviewStatus = existing?.reviewStatus ?? 'open';
  const type = reviewStatus === 'reclassified' ? existing?.type ?? relation.type : relation.type;
  return {
    ...relation,
    orgId,
    type,
    originalType: existing?.originalType ?? relation.type,
    reviewStatus,
    reviewNote: existing?.reviewNote,
    reviewerId: existing?.reviewerId,
    updatedAt: existing?.updatedAt ?? new Date().toISOString()
  };
}

function findStoredRelation(relations: Map<string, WorkspaceRelation>, relation: Relation): WorkspaceRelation | undefined {
  for (const id of relationIdCandidates(relation)) {
    const existing = relations.get(id);
    if (existing) return existing;
  }
  return undefined;
}

function relationIdCandidates(relation: Relation): string[] {
  return uniqueBy([
    relation.id,
    `rel-${relation.a.id}-${relation.b.id}`,
    `rel-${relation.b.id}-${relation.a.id}`
  ], item => item);
}

function overlayRelationReview(orgId: string, relation: Relation, existing?: WorkspaceRelation): WorkspaceRelation {
  const reviewStatus = existing?.reviewStatus ?? 'open';
  return {
    ...relation,
    orgId,
    type: reviewStatus === 'reclassified' ? existing?.type ?? relation.type : relation.type,
    originalType: relation.type,
    reviewStatus,
    reviewNote: existing?.reviewNote,
    reviewerId: existing?.reviewerId,
    updatedAt: existing?.updatedAt ?? new Date().toISOString()
  };
}

function createAuditEvent(
  orgId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
): AuditEvent {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    orgId,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString()
  };
}

function maxDate(dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean) as string[];
  if (!valid.length) return new Date().toISOString().slice(0, 10);
  return valid.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function noteObservedBy(note: Pick<WorkspaceNote, 'createdAt' | 'observedAt'>, asOf: string): boolean {
  return Date.parse(note.observedAt ?? note.createdAt) <= Date.parse(asOf);
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function relationPairKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note';
}
