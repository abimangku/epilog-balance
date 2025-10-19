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
    const { name, code, taxId, witholdsPph23 } = await req.json();
    
    console.log('Creating client:', { name, code, taxId, witholdsPph23 });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Generate code if not provided
    const clientCode = code || name.substring(0, 10).toUpperCase().replace(/\s+/g, '-');

    // Check if client already exists
    const { data: existing } = await supabase
      .from('client')
      .select('id')
      .eq('code', clientCode)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Client with this code already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: client, error } = await supabase
      .from('client')
      .insert({
        name,
        code: clientCode,
        tax_id: taxId || null,
        withholds_pph23: witholdsPph23 || false,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Client created successfully:', client.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        client,
        message: `Client ${name} (${clientCode}) created successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('create-client error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
