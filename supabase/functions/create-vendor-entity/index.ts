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
    const { name, code, taxId, providesFakturPajak, subjectToPph23, pph23Rate } = await req.json();
    
    console.log('Creating vendor:', { name, code, taxId, providesFakturPajak, subjectToPph23 });
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Generate code if not provided
    const vendorCode = code || name.substring(0, 10).toUpperCase().replace(/\s+/g, '-');

    // Check if vendor already exists
    const { data: existing } = await supabase
      .from('vendor')
      .select('id')
      .eq('code', vendorCode)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Vendor with this code already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: vendor, error } = await supabase
      .from('vendor')
      .insert({
        name,
        code: vendorCode,
        tax_id: taxId || null,
        provides_faktur_pajak: providesFakturPajak || false,
        subject_to_pph23: subjectToPph23 || false,
        pph23_rate: pph23Rate || 0.02,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Vendor created successfully:', vendor.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        vendor,
        message: `Vendor ${name} (${vendorCode}) created successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('create-vendor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
