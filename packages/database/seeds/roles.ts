import type { Kysely } from 'kysely';
import type DB from '../src/types/Database';

const ROLES = [
  { name: 'Founder' },
  { name: 'Admin' },
  { name: 'Moderator' },
  { name: 'Trusted Contributor' },
  { name: 'User' },
];

const PERMISSIONS = [
  { resource: 'challenge', name: 'create' },
  { resource: 'challenge', name: 'read:public' },
  { resource: 'challenge', name: 'update:own' },
  { resource: 'challenge', name: 'update:any' },
  { resource: 'challenge', name: 'delete:own' },
  { resource: 'challenge', name: 'delete:any' },
  { resource: 'challenge', name: 'vote' },
  { resource: 'challenge', name: 'review' },
  { resource: 'challenge', name: 'approve' },
  { resource: 'challenge', name: 'hide' },

  { resource: 'lobby', name: 'create' },
  { resource: 'lobby', name: 'read:public' },
  { resource: 'lobby', name: 'join:public' },
  { resource: 'lobby', name: 'join:private' },
  { resource: 'lobby', name: 'manage:own' },

  { resource: 'user', name: 'read:profile' },
  { resource: 'user', name: 'update:own_profile' },
  { resource: 'user', name: 'ban:challenge_submission' },
  { resource: 'user', name: 'unban:challenge_submission' },
  { resource: 'user', name: 'ban:global' },
  { resource: 'user', name: 'unban:global' },

  { resource: 'role', name: 'assign:moderator' },
  { resource: 'role', name: 'revoke:moderator' },
  { resource: 'role', name: 'assign:admin' },
  { resource: 'role', name: 'revoke:admin' },

  { resource: 'system', name: 'toggle_challenge_premoderation' },
];

const permKey = (p: { resource: string; name: string }): string => `${p.resource}:${p.name}`;

const ROLE_PERMISSION_MAP: Record<string, Set<string>> = {
  User: new Set([
    'challenge:create',
    'challenge:read:public',
    'challenge:update:own',
    'challenge:delete:own',
    'challenge:vote',
    'lobby:create',
    'lobby:read:public',
    'lobby:join:public',
    'lobby:join:private',
    'lobby:manage:own',
    'user:read:profile',
    'user:update:own_profile',
  ]),
  TrustedContributor: new Set(['challenge:review', 'challenge:approve']),
  Moderator: new Set([
    'challenge:update:any',
    'challenge:delete:any',
    'challenge:hide',
    'user:ban:challenge_submission',
    'user:unban:challenge_submission',
  ]),
  Admin: new Set([
    'user:ban:global',
    'user:unban:global',
    'role:assign:moderator',
    'role:revoke:moderator',
    'system:toggle_challenge_premoderation',
  ]),
  Founder: new Set(['role:assign:admin', 'role:revoke:admin']),
};

export async function seed(db: Kysely<DB>): Promise<void> {
  console.log('Seeding roles and permissions...');

  const insertedRoles = await db
    .insertInto('role')
    .values(ROLES)
    .onConflict((oc) => oc.column('name').doNothing())
    .returningAll()
    .execute();

  const insertedPermissions = await db
    .insertInto('permission')
    .values(PERMISSIONS)
    .onConflict((oc) => oc.columns(['resource', 'name']).doNothing())
    .returningAll()
    .execute();

  const allRoles =
    insertedRoles.length > 0 ? insertedRoles : await db.selectFrom('role').selectAll().execute();
  const allPermissions =
    insertedPermissions.length > 0
      ? insertedPermissions
      : await db.selectFrom('permission').selectAll().execute();

  if (allRoles.length === 0 || allPermissions.length === 0) {
    throw new Error('Failed to seed or retrieve roles and permissions. Aborting.');
  }

  const roleIdMap = new Map(allRoles.map((r) => [r.name, r.id]));
  const permissionIdMap = new Map(
    allPermissions.map(({ resource, name, id }) => [permKey({ resource, name }), id])
  );

  const rolePermissionsToInsert: { role_id: number; permission_id: number }[] = [];

  const userPerms = ROLE_PERMISSION_MAP.User ?? new Set<string>();
  const trustedContributorPerms = ROLE_PERMISSION_MAP.TrustedContributor ?? new Set<string>();
  const moderatorPerms = ROLE_PERMISSION_MAP.Moderator ?? new Set<string>();
  const adminPerms = ROLE_PERMISSION_MAP.Admin ?? new Set<string>();

  ROLE_PERMISSION_MAP.Moderator = new Set([
    ...Array.from(userPerms),
    ...Array.from(trustedContributorPerms),
    ...Array.from(moderatorPerms),
  ]);
  ROLE_PERMISSION_MAP.Admin = new Set([
    ...Array.from(userPerms),
    ...Array.from(trustedContributorPerms),
    ...Array.from(moderatorPerms),
    ...Array.from(adminPerms),
  ]);
  ROLE_PERMISSION_MAP.Founder = new Set(
    allPermissions.map(({ resource, name }) => permKey({ resource, name }))
  );

  for (const roleName in ROLE_PERMISSION_MAP) {
    const roleId = roleIdMap.get(roleName);
    if (!roleId) {
      console.warn(`Role "${roleName}" not found in database. Skipping.`);
      continue;
    }

    const permissionSet = ROLE_PERMISSION_MAP[roleName] ?? new Set<string>();
    for (const pKey of permissionSet) {
      const permissionId = permissionIdMap.get(pKey);
      if (!permissionId) {
        console.warn(`Permission "${pKey}" not found in database. Skipping.`);
        continue;
      }
      rolePermissionsToInsert.push({ role_id: roleId, permission_id: permissionId });
    }
  }

  if (rolePermissionsToInsert.length === 0) {
    console.log('Role-permission links already seem to exist. No new links to insert.');
    return;
  }

  await db
    .insertInto('role_permission')
    .values(rolePermissionsToInsert)
    .onConflict((oc) => oc.columns(['role_id', 'permission_id']).doNothing())
    .execute();

  console.log(
    `Successfully seeded ${allRoles.length} roles, ${allPermissions.length} permissions, and created ${rolePermissionsToInsert.length} role-permission links.`
  );
}
