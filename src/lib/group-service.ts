/**
 * Group Service
 *
 * Handles business logic for creating groups (entities that have accounts, caisses, and org units).
 */

import { getOrganizationId } from './orgContext';
import { generateId } from './utils';
import type { OrgUnit, Caisse, Group, Account } from '@/types';

const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1', '#F97316', '#06B6D4'];

export interface CreateGroupParams {
  name: string;
  type: string;
  description: string;
  existingGroupCount?: number;
}

export interface CreateGroupResult {
  orgUnit: OrgUnit;
  account: Account;
  caisse: Caisse;
  group: Group;
}

/**
 * Create a new group with its associated account, caisse, and org unit.
 * All four entities share the same ID.
 */
export function createGroup(params: CreateGroupParams): CreateGroupResult {
  const now = new Date().toISOString();
  const orgId = getOrganizationId();
  const id = generateId();
  const color = params.existingGroupCount !== undefined
    ? COLOR_PALETTE[params.existingGroupCount % COLOR_PALETTE.length]
    : COLOR_PALETTE[0];

  const orgUnit: OrgUnit = {
    id,
    name: params.name,
    type: params.type || 'groupe',
    description: params.description || '',
    orgId,
    isActive: true,
  };

  const account: Account = {
    id,
    orgId,
    ownerType: 'GROUP',
    ownerId: id,
    name: params.name,
    currency: 'XOF',
    status: 'ACTIVE',
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    createdAt: now,
    updatedAt: now,
  };

  const caisse: Caisse = {
    id,
    name: params.name,
    description: params.description || '',
    type: 'GROUP',
    color,
    orgId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    status: 'ACTIVE',
  };

  const group: Group = {
    id,
    orgId,
    name: params.name,
    parentGroupId: null,
    responsableMemberId: null,
    status: 'ACTIVE',
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    createdAt: now,
    updatedAt: now,
  };

  return { orgUnit, account, caisse, group };
}
