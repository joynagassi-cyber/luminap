import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      'https://hhgovvrnalibhgpakswi.supabase.co',
      'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh'
    )

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Identifiants invalides' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Erreur de chargement du profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          role: profile?.role || 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[login-edge] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur de connexion' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
