import type { AccessScope, Claim, Note, TeamMembership, TeamStatus, User, Visibility } from './types';

export function accessScopeFromVisibility(visibility: Visibility): AccessScope {
  if (visibility === 'public') return 'organization';
  if (visibility === 'private') return 'personal';
  return 'team';
}

export function visibilityFromAccessScope(accessScope: AccessScope): Visibility {
  if (accessScope === 'organization') return 'public';
  if (accessScope === 'personal') return 'private';
  return 'team';
}

export function userTeamMemberships(user: User): TeamMembership[] {
  const memberships = user.teamMemberships?.length
    ? user.teamMemberships
    : [{
      teamId: user.teamId ?? user.team,
      teamName: user.team,
      role: 'member',
      status: 'active' as TeamStatus
    }];
  return memberships.filter(team => team.status !== 'archived');
}

export function canAccess(user: User, noteOrClaim: Pick<Note | Claim, 'visibility' | 'accessScope' | 'team' | 'teamId' | 'authorId'>): boolean {
  if (user.status === 'deactivated') return false;
  const accessScope = noteOrClaim.accessScope ?? accessScopeFromVisibility(noteOrClaim.visibility);
  if (accessScope === 'personal') return noteOrClaim.authorId === user.id;
  if (accessScope === 'organization') return true;
  if (user.role === 'PM' || user.role === 'Compliance') return true;
  return userTeamMemberships(user).some(team => (
    noteOrClaim.teamId ? team.teamId === noteOrClaim.teamId : team.teamName === noteOrClaim.team
  ));
}
