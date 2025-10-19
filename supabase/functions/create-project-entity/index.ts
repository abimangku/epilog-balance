import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, code, clientName, startDate, endDate } = await req.json();
    
    console.log('Creating project:', { name, code, clientName, startDate, endDate });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Check if project already exists
    const { data: existing } = await supabase
      .from('project')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Project with this code already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find client if provided
    let clientId = null;
    if (clientName) {
      const { data: client } = await supabase
        .from('client')
        .select('id')
        .ilike('name', `%${clientName}%`)
        .limit(1)
        .maybeSingle();
      
      if (client) clientId = client.id;
    }

    const { data: project, error } = await supabase
      .from('project')
      .insert({
        name,
        code,
        client_id: clientId,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'ACTIVE',
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Project created successfully:', project.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        project,
        message: `Project ${name} (${code}) created successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('create-project error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
