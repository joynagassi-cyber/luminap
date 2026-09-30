import{jn as e,rr as t}from"./index-BAHNZKvo.js";import{t as n}from"./rbac-Dv0vqpzW.js";var r=new class{async createOrg(n,r,i={},a){return await t().execute(`INSERT INTO organizations (id, name, type, status, parent_org_id)
       VALUES (?, ?, ?, 'PENDING', ?)`,[n,r,i.type??`CHURCH`,i.parentOrgId??null]),a&&await e({orgId:n,transactionId:null,userId:a,actorRoleAtTime:`CENTRAL_ADMIN`,action:`CREATE`,entityType:`Organization`,entityId:n,beforeState:null,afterState:{id:n,name:r,type:i.type??`CHURCH`,status:`PENDING`},comment:`Organisation ${r} créée${i.parentOrgId?` (enfant de ${i.parentOrgId})`:``}`}),n}async getOrg(e){let n=(await t().execute(`SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE id = ?`,[e]))?.array?.[0];return n?{id:String(n.id),name:String(n.name),type:String(n.type),status:String(n.status),parentOrgId:n.parent_org_id?String(n.parent_org_id):null,createdAt:String(n.created_at),updatedAt:String(n.updated_at)}:null}async getOrgChildren(e){return((await t().execute(`SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE parent_org_id = ?`,[e]))?.array??[]).map(e=>({id:String(e.id),name:String(e.name),type:String(e.type),status:String(e.status),parentOrgId:String(e.parent_org_id),createdAt:String(e.created_at),updatedAt:String(e.updated_at)}))}async getOrgParent(e){let t=await this.getOrg(e);return!t||!t.parentOrgId?null:this.getOrg(t.parentOrgId)}async listOrgs(e,n){let r=t(),i=`SELECT DISTINCT o.id, o.name, o.type, o.status, o.parent_org_id, o.created_at, o.updated_at
       FROM organizations o
       WHERE EXISTS (
         SELECT 1 FROM org_admins WHERE org_admins.org_id = o.id
           AND org_admins.status = 'ACTIVE' AND org_admins.admin_profile_id = ?
       )
       OR EXISTS (
         SELECT 1 FROM profiles WHERE profiles.org_id = o.id AND profiles.id = ?
       )
       OR EXISTS (
         SELECT 1 FROM org_memberships WHERE org_memberships.org_id = o.id
           AND org_memberships.user_id = ?
           AND org_memberships.status IN ('ACTIVE','PENDING')
       )`,a=[e,e,e];return n?.type&&(i+=` AND o.type = ?`,a.push(n.type)),i+=` ORDER BY o.created_at DESC`,((await r.execute(i,a))?.array??[]).map(e=>({id:String(e.id),name:String(e.name),type:String(e.type),status:String(e.status),parentOrgId:e.parent_org_id?String(e.parent_org_id):null,createdAt:String(e.created_at),updatedAt:String(e.updated_at)}))}async setParentOrg(n,r,i){await t().execute(`UPDATE organizations SET parent_org_id = ? WHERE id = ?`,[r,n]),await e({orgId:n,transactionId:null,userId:i,actorRoleAtTime:`CENTRAL_ADMIN`,action:`UPDATE`,entityType:`Organization`,entityId:n,beforeState:null,afterState:{parentOrgId:r},comment:r?`Organisation ${n} rattachée à ${r}`:`Organisation ${n} détachée de son parent`})}async getOrgUnits(e){return((await t().execute(`SELECT id, name, type, org_id FROM org_units WHERE org_id = ?`,[e]))?.array??[]).map(e=>({id:String(e.id),name:String(e.name),type:String(e.type),orgId:String(e.org_id)}))}async canAccess(e,r,i,a,o){let s=t();new Date().toISOString();let c=((await s.execute(`SELECT role FROM org_memberships
       WHERE user_id = ? AND org_id = ? AND status IN ('ACTIVE','PENDING')`,[e,r]))?.array??[]).map(e=>String(e.role)),l=((await s.execute(`SELECT role FROM profiles WHERE id = ? AND org_id = ?`,[e,r]))?.array??[])[0]?.role,u=[...new Set([...c,...l?[String(l)]:[]])].filter(e=>e&&e!==``);for(let e of u)if(n[e]?.includes(`${i}:${a}`))return!0;let d=`SELECT * FROM grants
       WHERE revoked_at IS NULL
         AND resource = ? AND action = ?
         AND (${o===void 0?`scope_resource IS NULL`:`(scope_resource IS NULL
             OR (scope_resource = ? AND scope_id = ?))`})
         AND (
            (subject_type = 'user' AND subject_id = ?)
            OR (subject_type = 'org_member' AND subject_id IN
                 (SELECT id FROM org_memberships
                  WHERE user_id = ? AND org_id = ?
                    AND status IN ('ACTIVE','PENDING')))
            OR (subject_type = 'group_member' AND subject_id IN
                 (SELECT gm.id FROM group_memberships gm
                  JOIN members m ON m.id = gm.member_id
                  WHERE m.org_id = ?))
            OR (subject_type = 'tag' AND subject_id IN
                 (SELECT tag_id::text FROM tag_assignments
                  WHERE user_id = ? AND org_id = ?))
         )`,f=o===void 0?[i,a,e,e,r,r,e,r]:[i,a,o.resource,o.id,e,e,r,r,e,r];return((await s.execute(d,f))?.array??[]).length>0}async listEffectiveGrants(e,n){return((await t().execute(`SELECT * FROM grants
       WHERE revoked_at IS NULL
         AND (
            (subject_type = 'user' AND subject_id = ?)
            OR (subject_type = 'org_member' AND subject_id IN
                 (SELECT id FROM org_memberships
                  WHERE user_id = ? AND org_id = ?
                    AND status IN ('ACTIVE','PENDING')))
            OR (subject_type = 'group_member' AND subject_id IN
                 (SELECT gm.id FROM group_memberships gm
                  JOIN members m ON m.id = gm.member_id
                  WHERE m.org_id = ?))
            OR (subject_type = 'tag' AND subject_id IN
                 (SELECT tag_id::text FROM tag_assignments
                  WHERE user_id = ? AND org_id = ?))
         )`,[e,e,n,n,e,n]))?.array??[]).map(e=>({id:String(e.id),subjectType:String(e.subject_type),subjectId:String(e.subject_id),resource:String(e.resource),action:String(e.action),scope:e.scope_resource==null?void 0:{resource:String(e.scope_resource),id:String(e.scope_id)},grantedBy:e.granted_by?String(e.granted_by):``,grantedAt:String(e.granted_at),revokedAt:e.revoked_at?String(e.revoked_at):null}))}};export{r as t};