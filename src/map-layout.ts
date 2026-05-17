import { claimWindowStatus, relationLabel, type Relation } from './engine';

export type MapDensity = 'low' | 'medium' | 'high';
export type WindowLane = 'current' | 'historical';
export type UiWindowStatus = 'current' | 'upcoming' | 'ended';

export const mapDensityLimits: Record<MapDensity, { graph: number; list: number }> = {
  low: { graph: 4, list: 3 },
  medium: { graph: 8, list: 5 },
  high: { graph: 12, list: 8 }
};

export interface MapGraphNode {
  relationId: string;
  lane: WindowLane;
  subject: string;
  label: string;
  type: Relation['type'];
  x: string;
  y: string;
  edgeRotation: string;
  edgeWidth: string;
  selected: boolean;
}

export interface MapLaneModel<T extends Relation = Relation> {
  lane: WindowLane;
  relations: T[];
  graphRelations: T[];
  listRelations: T[];
  hiddenGraphCount: number;
  hiddenListCount: number;
  selectedRelation?: T;
  nodes: MapGraphNode[];
}

export function buildMapLaneModel<T extends Relation>(
  relations: T[],
  options: {
    asOf: string;
    density: MapDensity;
    lane: WindowLane;
    selectedRelationId?: string;
    selectedSubject?: string;
  }
): MapLaneModel<T> {
  const limits = mapDensityLimits[options.density];
  const laneRelations = relations.filter(relation => laneForRelation(relation, options.asOf) === options.lane);
  const selectedRelation = laneRelations.find(relation => relation.id === options.selectedRelationId) ?? laneRelations[0];
  const graphRelations = pinnedDensitySlice(laneRelations, limits.graph, selectedRelation);
  const listRelations = pinnedDensitySlice(laneRelations, limits.list, selectedRelation);
  const nodes = graphRelations.map((relation, index) => {
    const position = nodePosition(index, graphRelations.length);
    return {
      relationId: relation.id,
      lane: options.lane,
      subject: relationEndpointLabel(relation, options.selectedSubject),
      label: relationLabel(relation.type),
      type: relation.type,
      selected: relation.id === selectedRelation?.id,
      ...position
    };
  });

  return {
    lane: options.lane,
    relations: laneRelations,
    graphRelations,
    listRelations,
    hiddenGraphCount: Math.max(0, laneRelations.length - graphRelations.length),
    hiddenListCount: Math.max(0, laneRelations.length - listRelations.length),
    selectedRelation,
    nodes
  };
}

export function relationEndpointLabel(relation: Relation, selectedSubject = ''): string {
  const selected = selectedSubject.trim().toLowerCase();
  if (selected && relation.a.subject.toLowerCase() === selected) return relation.b.subject;
  if (selected && relation.b.subject.toLowerCase() === selected) return relation.a.subject;
  return relation.a.subject;
}

export function relationWindowStatuses(relation: Relation, asOf: string): { a: UiWindowStatus; b: UiWindowStatus } {
  return {
    a: uiWindowStatus(relation.a, asOf),
    b: uiWindowStatus(relation.b, asOf)
  };
}

export function laneForRelation(relation: Relation, asOf: string): WindowLane {
  const statuses = relationWindowStatuses(relation, asOf);
  return isCurrentWindowStatus(statuses.a) || isCurrentWindowStatus(statuses.b) ? 'current' : 'historical';
}

function uiWindowStatus(claim: Relation['a'], asOf: string): UiWindowStatus {
  const status = claimWindowStatus(claim, asOf);
  if (status === 'future') return 'upcoming';
  if (status === 'expired') return 'ended';
  return 'current';
}

function isCurrentWindowStatus(status: UiWindowStatus): boolean {
  return status === 'current' || status === 'upcoming';
}

function pinnedDensitySlice<T extends Relation>(relations: T[], limit: number, pinnedRelation: T | undefined): T[] {
  const visible = relations.slice(0, limit);
  if (!pinnedRelation || visible.some(relation => relation.id === pinnedRelation.id)) return visible;
  if (visible.length < limit) return [...visible, pinnedRelation];
  return [...visible.slice(0, Math.max(0, limit - 1)), pinnedRelation];
}

function nodePosition(index: number, total: number): Pick<MapGraphNode, 'x' | 'y' | 'edgeRotation' | 'edgeWidth'> {
  const count = Math.max(1, total);
  const angle = -90 + (360 * index / count);
  const radians = angle * Math.PI / 180;
  const x = 50 + Math.cos(radians) * 39;
  const y = 50 + Math.sin(radians) * 36;
  return {
    x: `${roundPercent(x)}%`,
    y: `${roundPercent(y)}%`,
    edgeRotation: `${Math.round(angle)}deg`,
    edgeWidth: `${Math.round(30 + Math.min(12, count) * 1.4)}%`
  };
}

function roundPercent(value: number): string {
  return String(Math.round(value * 10) / 10);
}
