import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://hhgovvrnalibhgpakswi.supabase.co"
// Publishable key is a client-safe credential; keep the override env-driven
// so the function is portable across projects.
const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firstName, lastName, email, password } = await req.json()

    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!EMAIL_RE.test(String(email))) {
      return new Response(
        JSON.stringify({ error: 'Adresse email invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (String(password).length < 8) {
      return new Response(
        JSON.stringify({ error: 'Le mot de passe doit contenir au moins 8 caractères' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, publishableKey)

    // Sign up with Supabase
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'TREASURER',
        },
      },
    })

    if (signUpError) {
      if (signUpError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Cet email est déjà utilisé' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw signUpError
    }

    // Confirm the email by updating the auth.users table directly.
    // The service role key MUST come from the environment — never hardcode
    // it, and never call createClient with an empty key (which can silently
    // degrade to an unauthenticated client or, worse, behave unpredictably).
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) {
      // Without the service role key we cannot confirm the email server-side.
      // Return success for the signup itself but flag that confirmation is
      // pending (the user still receives the email confirmation link).
      return new Response(
        JSON.stringify({
          ok: true,
          confirmation: "pending_email",
          user: {
            id: signUpData.user?.id,
            email: signUpData.user?.email,
            firstName,
            lastName,
            role: "TREASURER",
            org: { id: "org-1", name: "Église MFE-JC Centrale", type: "Eglise", accentColor: "#FF6B00" },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (signUpData.user) {
      const supabaseAdmin = createClient(
        "https://hhgovvrnalibhgpakswi.supabase.co",
        serviceRoleKey
      )

      await supabaseAdmin.auth.admin.updateUserById(
        signUpData.user.id,
        { email_confirm: true }
      )
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        user: {
          id: signUpData.user?.id,
          email: signUpData.user?.email,
          firstName,
          lastName,
          role: 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[signup-edge] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur d\'inscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
