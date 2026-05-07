import {
  canAccess,
  detectRelations,
  extractClaims,
  generateAlerts,
  synthesize,
  type Alert,
  type Claim,
  type Direction,
  type Horizon,
  type Note,
  type Relation,
  type RelationType,
  type User,
  type Visibility
} from '../src/engine';

export type ClaimReviewStatus = 'machine' | 'analyst_confirmed' | 'analyst_rejected' | 'edited';
export type RelationReviewStatus = 'open' | 'confirmed' | 'dismissed' | 'reclassified';

export interface WorkspaceUser extends User {
  orgId: string;
  email?: string;
  teamId?: string;
}

export interface WorkspaceNote extends Note {
  orgId: string;
  authorName: string;
  teamId?: string;
  updatedAt: string;
}

export interface WorkspaceClaim extends Claim {
  orgId: string;
  authorName: string;
  teamId?: string;
  reviewStatus: ClaimReviewStatus;
  reviewNote?: string;
  reviewerId?: string;
  updatedAt: string;
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

export interface WorkspaceSnapshot {
  viewer: WorkspaceUser;
  visibleNotes: WorkspaceNote[];
  claims: WorkspaceClaim[];
  relations: WorkspaceRelation[];
  alerts: Alert[];
  companies: WorkspaceSummary[];
  themes: WorkspaceSummary[];
  auditEvents: AuditEvent[];
  asOf: string;
}

export interface CreateNoteInput {
  title?: string;
  body: string;
  visibility: Visibility;
  sourceType: string;
  observedAt: string;
  appliesToStart?: string;
  appliesToEnd?: string;
  horizon?: Horizon;
  tickers?: string[];
  manualThemes?: string[];
  kpis?: string[];
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
}

export interface UpdateRelationInput {
  reviewStatus?: RelationReviewStatus;
  type?: RelationType;
  reviewNote?: string;
}

export interface ExtractionProvider {
  extractClaims(note: Note, context: { asOf: string }): Promise<Claim[]>;
}

export interface WorkspaceRepository {
  getUser(userId: string): Promise<WorkspaceUser | undefined>;
  listUsers(orgId: string): Promise<WorkspaceUser[]>;
  listNotes(orgId: string): Promise<WorkspaceNote[]>;
  insertNote(note: WorkspaceNote): Promise<void>;
  listClaims(orgId: string): Promise<WorkspaceClaim[]>;
  replaceClaims(orgId: string, claims: WorkspaceClaim[]): Promise<void>;
  updateClaim(claim: WorkspaceClaim): Promise<void>;
  listRelations(orgId: string): Promise<WorkspaceRelation[]>;
  replaceRelations(orgId: string, relations: WorkspaceRelation[]): Promise<void>;
  updateRelation(relation: WorkspaceRelation): Promise<void>;
  addAuditEvent(event: AuditEvent): Promise<void>;
  listAuditEvents(orgId: string): Promise<AuditEvent[]>;
}

export const deterministicExtractionProvider: ExtractionProvider = {
  async extractClaims(note, context) {
    return extractClaims(note, context.asOf);
  }
};

export function createWorkspaceService(
  repository: WorkspaceRepository,
  extractionProvider: ExtractionProvider = deterministicExtractionProvider
) {
  async function requireViewer(viewerId: string): Promise<WorkspaceUser> {
    const viewer = await repository.getUser(viewerId);
    if (!viewer) throw new Error(`Unknown viewer ${viewerId}`);
    return viewer;
  }

  async function materializeGraph(orgId: string, actorId = 'system'): Promise<void> {
    const notes = await repository.listNotes(orgId);
    const existingClaims = new Map((await repository.listClaims(orgId)).map(claim => [claim.id, claim]));
    const previousRelations = new Map((await repository.listRelations(orgId)).map(relation => [relation.id, relation]));
    const asOf = maxDate(notes.flatMap(note => [note.createdAt, note.observedAt]).filter(Boolean) as string[]);
    const extracted: WorkspaceClaim[] = [];

    for (const note of notes) {
      const claims = await extractionProvider.extractClaims(note, { asOf });
      for (const claim of claims) {
        const existing = existingClaims.get(claim.id);
        extracted.push(mergeClaim(orgId, note, claim, existing));
      }
    }

    await repository.replaceClaims(orgId, extracted);

    const activeClaims = extracted.filter(claim => claim.reviewStatus !== 'analyst_rejected');
    const generatedRelations = detectRelations(activeClaims);
    const materializedRelations = generatedRelations.map(relation => mergeRelation(orgId, relation, previousRelations.get(relation.id)));

    await repository.replaceRelations(orgId, materializedRelations);
    await repository.addAuditEvent(createAuditEvent(orgId, actorId, 'graph.materialized', 'organization', orgId, {
      claimCount: extracted.length,
      activeClaimCount: activeClaims.length,
      relationCount: materializedRelations.length
    }));
  }

  async function getWorkspace(viewerId: string): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const orgNotes = await repository.listNotes(viewer.orgId);
    const orgClaims = await repository.listClaims(viewer.orgId);
    if (orgNotes.length && !orgClaims.length) {
      await materializeGraph(viewer.orgId);
    }

    const notes = (await repository.listNotes(viewer.orgId)).filter(note => canAccess(viewer, note));
    const visibleClaims = (await repository.listClaims(viewer.orgId)).filter(claim => canAccess(viewer, claim));
    const claimsById = new Map(visibleClaims.map(claim => [claim.id, claim]));
    const activeClaims = visibleClaims.filter(claim => claim.reviewStatus !== 'analyst_rejected');
    const activeClaimIds = new Set(activeClaims.map(claim => claim.id));
    const relations = (await repository.listRelations(viewer.orgId)).filter(relation => {
      return relation.reviewStatus !== 'dismissed'
        && activeClaimIds.has(relation.a.id)
        && activeClaimIds.has(relation.b.id)
        && claimsById.has(relation.a.id)
        && claimsById.has(relation.b.id);
    });
    const alerts = generateAlerts(relations, activeClaims);
    const companies = uniqueBy(activeClaims.map(claim => claim.subject), item => item).map(subject => synthesize(activeClaims, relations, subject));
    const themes = uniqueBy(activeClaims.flatMap(claim => claim.themes), item => item).map(theme => synthesize(activeClaims, relations, theme));
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
      auditEvents,
      asOf: maxDate(activeClaims.map(claim => claim.observedAt))
    };
  }

  async function createNote(viewerId: string, input: CreateNoteInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const note: WorkspaceNote = {
      id: `n-${Date.now()}-${slug(input.body.slice(0, 32))}`,
      orgId: viewer.orgId,
      title: input.title?.trim() || `Research intake - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      body: input.body,
      authorId: viewer.id,
      authorName: viewer.name,
      team: viewer.team,
      teamId: viewer.teamId,
      visibility: input.visibility,
      sourceType: input.sourceType,
      createdAt: date,
      updatedAt: now,
      observedAt: input.observedAt || date,
      appliesToStart: input.appliesToStart || input.observedAt || date,
      appliesToEnd: input.appliesToEnd,
      horizon: input.horizon || 'near_term',
      tickers: input.tickers ?? [],
      manualThemes: input.manualThemes ?? [],
      kpis: input.kpis ?? []
    };

    await repository.insertNote(note);
    await repository.addAuditEvent(createAuditEvent(viewer.orgId, viewer.id, 'note.created', 'note', note.id, {
      visibility: note.visibility,
      sourceType: note.sourceType,
      tickers: note.tickers,
      manualThemes: note.manualThemes,
      kpis: note.kpis
    }));
    await materializeGraph(viewer.orgId, viewer.id);
    return getWorkspace(viewerId);
  }

  async function updateClaim(viewerId: string, claimId: string, input: UpdateClaimInput): Promise<WorkspaceSnapshot> {
    const viewer = await requireViewer(viewerId);
    const claim = (await repository.listClaims(viewer.orgId)).find(item => item.id === claimId);
    if (!claim || !canAccess(viewer, claim)) throw new Error(`Claim ${claimId} is not accessible`);

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
    const relation = (await repository.listRelations(viewer.orgId)).find(item => item.id === relationId);
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

  return { materializeGraph, getWorkspace, createNote, updateClaim, updateRelation };
}

export function createMemoryWorkspaceRepository() {
  class MemoryWorkspaceRepository implements WorkspaceRepository {
    users: WorkspaceUser[] = [];
    notes: WorkspaceNote[] = [];
    claims: WorkspaceClaim[] = [];
    relations: WorkspaceRelation[] = [];
    auditEvents: AuditEvent[] = [];

    seed(input: { organizationId: string; users: User[]; notes: Note[] }) {
      this.users = input.users.map(user => ({ ...user, orgId: input.organizationId, email: `${slug(user.name)}@example.test` }));
      this.notes = input.notes.map(note => {
        const author = this.users.find(user => user.id === note.authorId);
        return {
          ...note,
          orgId: input.organizationId,
          authorName: author?.name ?? note.authorId,
          updatedAt: new Date(`${note.createdAt}T00:00:00.000Z`).toISOString(),
          tickers: note.tickers ?? [],
          manualThemes: note.manualThemes ?? [],
          kpis: note.kpis ?? []
        };
      });
      this.claims = [];
      this.relations = [];
      this.auditEvents = [];
    }

    async getUser(userId: string) { return this.users.find(user => user.id === userId); }
    async listUsers(orgId: string) { return this.users.filter(user => user.orgId === orgId); }
    async listNotes(orgId: string) { return this.notes.filter(note => note.orgId === orgId); }
    async insertNote(note: WorkspaceNote) { this.notes.unshift(note); }
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
    async addAuditEvent(event: AuditEvent) {
      this.auditEvents.unshift(event);
    }
    async listAuditEvents(orgId: string) {
      return this.auditEvents.filter(event => event.orgId === orgId);
    }
  }

  return new MemoryWorkspaceRepository();
}

function mergeClaim(orgId: string, note: WorkspaceNote, claim: Claim, existing?: WorkspaceClaim): WorkspaceClaim {
  const preserved = existing && existing.reviewStatus !== 'machine';
  return {
    ...claim,
    orgId,
    authorName: note.authorName,
    teamId: note.teamId,
    text: preserved ? existing.text : claim.text,
    subject: preserved ? existing.subject : claim.subject,
    direction: preserved ? existing.direction : claim.direction,
    themes: preserved ? existing.themes : claim.themes,
    observedAt: preserved ? existing.observedAt : claim.observedAt,
    appliesToStart: preserved ? existing.appliesToStart : claim.appliesToStart,
    appliesToEnd: preserved ? existing.appliesToEnd : claim.appliesToEnd,
    horizon: preserved ? existing.horizon : claim.horizon,
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

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note';
}
