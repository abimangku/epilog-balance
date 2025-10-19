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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const transactionType = formData.get('transactionType') as string;
    
    if (!file) {
      throw new Error('No file provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Parsing ${file.name} (${file.type}, ${file.size} bytes)`);

    let extractedData: any = {};

    // Handle PDFs and images with OCR
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      const fileBytes = await file.arrayBuffer();
      const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBytes)));
      
      const prompt = `Extract invoice/bill data from this document. Return JSON with:
{
  "vendor_name": string,
  "invoice_number": string,
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "amount": number,
  "tax_details": {
    "vat_amount": number,
    "faktur_pajak_number": string,
    "pph23_amount": number
  },
  "line_items": [
    {
      "description": string,
      "quantity": number,
      "unit_price": number,
      "amount": number
    }
  ]
}
Extract ALL visible text. If field not found, use null.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.type};base64,${base64File}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        }
        if (response.status === 402) {
          throw new Error('AI usage limit reached. Please add credits to your workspace.');
        }
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        throw new Error(`AI extraction failed: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices[0].message.content;
      
      // Extract JSON from markdown code blocks if present
      let jsonText = content;
      if (content.includes('```json')) {
        jsonText = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonText = content.split('```')[1].split('```')[0].trim();
      }
      
      try {
        extractedData = JSON.parse(jsonText);
      } catch {
        // If JSON parsing fails, store raw content
        extractedData = { raw_text: content };
      }
    }
    
    // Handle CSV/Excel files
    else if (file.type === 'text/csv' || file.type.includes('spreadsheet') || file.type.includes('excel')) {
      const text = await file.text();
      const lines = text.split('\n').slice(0, 100); // First 100 lines
      
      extractedData = {
        file_type: 'spreadsheet',
        row_count: lines.length,
        preview: lines.slice(0, 10),
        raw_content: text.substring(0, 5000) // First 5000 chars
      };
    }

    // Store parsed document in knowledge_base for AI context
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey && extractedData && Object.keys(extractedData).length > 0) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error: kbError } = await supabase
        .from('knowledge_base')
        .insert({
          document_type: transactionType || 'invoice',
          title: file.name,
          content: JSON.stringify(extractedData, null, 2),
          metadata: {
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            parsed_at: new Date().toISOString(),
            transaction_type: transactionType,
            source: 'parse-document'
          }
        });

      if (kbError) {
        console.error('Failed to store in knowledge_base:', kbError);
      } else {
        console.log(`Stored ${file.name} in knowledge_base`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('parse-document error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
