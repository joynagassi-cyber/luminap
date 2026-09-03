CREATE POLICY "role_assignments_insert_anon" ON "public"."role_assignments" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "role_assignments_select_anon" ON "public"."role_assignments" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "role_assignments_update_anon" ON "public"."role_assignments" AS PERMISSIVE FOR UPDATE TO "anon" USING (true);