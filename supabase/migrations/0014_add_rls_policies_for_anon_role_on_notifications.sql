CREATE POLICY "notifications_insert_anon" ON "public"."notifications" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "notifications_select_anon" ON "public"."notifications" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "notifications_update_anon" ON "public"."notifications" AS PERMISSIVE FOR UPDATE TO "anon" USING (true);