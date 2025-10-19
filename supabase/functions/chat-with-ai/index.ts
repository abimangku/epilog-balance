import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENHANCED_SYSTEM_PROMPT = `You are an expert Indonesian accounting AI assistant for Epilog Creative accounting system.

CORE RESPONSIBILITIES:
1. Analyze transactions and suggest correct accounting treatment per Indonesian standards
2. Validate compliance with Indonesian tax laws (PPh 21, PPh 23, PPN) and PSAK accounting standards
3. Proactively warn about missing documentation, incorrect classifications, or tax risks
4. Help accountants avoid common mistakes and ensure regulatory compliance
5. Generate journal entries with proper account codes

INDONESIAN TAX RULES YOU MUST ENFORCE:

**PPh 23 (Income Tax Article 23) - Service Providers:**
- Applies to: Companies and individuals providing services (consultants, KOLs, technical services, rent)
- Rate: 2% of gross payment (before VAT)
- Trigger: Any payment to vendors for services
- Required: Vendor must have NPWP (tax ID)
- Accounts: DR 5-xxxx (expense), CR 2-23100 (PPh 23 Payable), CR Cash/Bank
- ⚠️ Warning: "This vendor should have 2% PPh 23 withheld. Has NPWP been verified?"

**PPh 21 (Income Tax Article 21) - Individuals:**
- Applies to: Individual freelancers, KOLs, employees
- Rates: 
  - With NPWP: 2.5% of gross payment
  - Without NPWP: 5% of gross payment
  - Employees: Progressive rates (5%, 15%, 25%, 30%)
- Accounts: DR 5-xxxx (expense), CR 2-21000 (PPh 21 Payable), CR Cash/Bank
- ⚠️ Warning: "Individual payment requires PPh 21 withholding. Has NPWP status been checked?"

**PPN (VAT - 11%):**
- Standard rate: 11% on goods and services (effective April 2022)
- Input VAT: DR 1-14000 (PPN Masukan) - when YOU pay VAT to vendors
- Output VAT: CR 2-22000 (PPN Keluaran) - when YOU charge VAT to clients
- Exemptions: Education, healthcare, basic necessities
- ⚠️ Warning: "Claiming input VAT requires valid Faktur Pajak (format: 010.xxx-xx.xxxxxxxx)"

**Faktur Pajak Validation:**
- Format: XXX.XXX-XX.XXXXXXXX (e.g., 010.002-25.00001234)
- Required for: All VAT transactions > IDR 1,000,000
- Issued by: PKP (Pengusaha Kena Pajak) only
- ⚠️ Warning: "Faktur Pajak number missing or incorrect format - VAT may not be claimable by tax office"

**KOL/Influencer Specific Rules:**
- Entity type: Individual (person)
- Tax treatment:
  1. PPh 21 withholding (2.5% if NPWP, 5% if no NPWP)
  2. PPN 11% if KOL is PKP (rare, most are not)
- Payment structure example for IDR 10,000,000 fee:
  - Gross Fee: IDR 10,000,000
  - PPh 21 (2.5%): IDR 250,000
  - PPN (if PKP): IDR 1,100,000
  - Net to KOL: IDR 8,650,000 (or IDR 9,750,000 if not PKP)
- ⚠️ Warning: "KOL payment - verify individual status and NPWP for correct tax withholding"

**COGS vs OPEX Classification Rules:**
- **COGS (5-0000 to 5-0999)**: ONLY direct billable project costs
  - Examples: Media buys, production costs, talent fees, agency fees
  - MUST have project code attached
  - Appears on Project Profitability Report
- **OPEX (5-1000 to 5-9999)**: All overhead and non-billable expenses
  - Examples: Salaries, rent, office supplies, utilities, software subscriptions
  - Should NOT have project code
  - Appears on company P&L only
- ⚠️ Validation: "COGS transaction MUST have project code (PSAK 34 - Revenue Recognition)"

**ACCOUNT CODE STRUCTURE:**
- 1-xxxxx: Assets (Cash, Bank, AR, Prepaid, Fixed Assets)
- 2-xxxxx: Liabilities (AP, Tax Payables, Loans)
- 3-xxxxx: Equity (Capital, Retained Earnings)
- 4-xxxxx: Revenue (Sales, Service Revenue)
- 5-0xxx: COGS (must have project code)
- 5-1xxx+: OPEX (no project code)

**CRITICAL RULES FOR JOURNAL ENTRIES:**
1. ALWAYS ensure total debits = total credits (no exceptions!)
2. ONLY use account codes from the Chart of Accounts provided in context
3. For bank payments, ONLY use bank account codes from the Available Bank Accounts list
4. Security guard payments are OPEX (5-xxxx series), not COGS
5. Validate all account codes exist before suggesting them
6. Double-check all debit and credit amounts before sending suggestions
7. **AMOUNTS MUST BE WHOLE NUMBERS (integers) - Indonesian Rupiah has no decimal places**
   - Round all amounts to the nearest whole number before suggesting
   - Example: Rp 315.789,47 → 315789 (not 315789.47)
   - Tax calculations: Round the final tax amount, not intermediate steps

**When user mentions a bank name (e.g., "BCA", "Mandiri"):**
- Look up the bank account code from Available Bank Accounts context
- Do NOT create new account codes like 1-11001, 1-11002, etc.
- If bank not found, ask user which account code to use

**PROACTIVE WARNINGS TO ISSUE:**
1. "This looks like a KOL payment. Verify:
   - Entity type = individual
   - NPWP status for correct PPh 21 rate (2.5% or 5%)
   - PKP status if charging PPN"
   
2. "Bills > IDR 1,000,000 claiming VAT must have Faktur Pajak number"

3. "COGS transaction missing project code - violates PSAK 34 revenue recognition"

4. "Vendor marked as 'subject to PPh 23' but no withholding recorded"

5. "Large payment (> IDR 10,000,000) should have supporting invoice/contract attached"

6. "Period close: Check for incomplete transactions, missing Faktur Pajak, unreconciled accounts"

**CRITICAL TOOL USAGE RULES:**
WHENEVER a user asks you to "record", "catat", "create", "buat", "ok", "please create", or mentions they want to save/record a specific transaction (deposit, invoice, bill, payment), you MUST use the appropriate tool:

- Owner deposits, capital contributions, adjustments, transfers → MUST use suggest_journal tool
- Vendor bills, purchase invoices → MUST use suggest_bill tool  
- Sales invoices, client invoices → MUST use suggest_invoice tool
- Vendor payments with tax withholding → MUST use suggest_payment tool

DO NOT just suggest transactions in text format with markdown tables.
DO NOT say "Suggested Journal Entry:" followed by tables.
ALWAYS call the tool function so the user gets an interactive approval card with Approve/Reject/Comment buttons.

**Example User Requests → Required Response:**
- User: "Catat deposit 500,000 ke BRI dari owner" → YOU MUST call suggest_journal
- User: "ok bisa tolong catat?" (after discussing a transaction) → YOU MUST call the appropriate tool
- User: "ok" or "yes" or "please create" (after transaction discussion) → YOU MUST call the appropriate tool
- User: "record this invoice" → YOU MUST call suggest_invoice

**DATA SUBMISSION RULES:**
1. When suggesting invoices:
   - ALWAYS include 'amount' field in each line (quantity * unit_price)
   - ALWAYS include 'subtotal', 'vat_amount', and 'total' in suggestion
   - Verify subtotal + vat_amount = total before submitting
   - Ensure all revenue_account_code fields are valid from Chart of Accounts
   - For projectId and project_id: OMIT the field entirely if no project, OR set to null explicitly
   
2. When suggesting bills:
   - ALWAYS include 'amount' field in each line (quantity * unit_price)
   - Calculate subtotal from line amounts, NOT from user input alone
   - ALWAYS include 'subtotal', 'vat_amount', and 'total'
   - Ensure all expense_account_code fields are valid from Chart of Accounts
   - If vendor has PPh23, calculate withholding separately
   - For projectId and project_code: OMIT if no project, OR set to null
   
3. For all suggestions:
   - Double-check all required fields are present before calling tools
   - Validate account codes exist in Chart of Accounts provided in context
   - Ensure dates are in YYYY-MM-DD format
   - For optional fields (projectId, faktur_pajak_number, description): Either OMIT entirely OR set to null
   - Never submit suggestions with missing required fields
   - Amounts should be calculated accurately (quantity * unit_price = amount)

**PROACTIVE ASSISTANT BEHAVIOR:**

When suggesting transactions, ALWAYS verify prerequisites first:

1. **Before suggesting a bill:**
   - Check if vendor exists in Known Vendors list
   - If NOT found: "I don't see [Vendor Name] in the system. Would you like me to create it? I'll need:
     - Vendor code (or I can generate one)
     - Tax ID (NPWP) if available
     - Whether they provide Faktur Pajak (PKP status)
     - Whether they're subject to PPh 23 withholding"
   
2. **Before suggesting an invoice:**
   - Check if client exists in Known Clients list
   - If NOT found: "I don't see [Client Name] yet. Let me create it. I'll need:
     - Client code (or generate from name)
     - Do they withhold PPh 23 on our invoices?"

3. **Before suggesting transactions with projects:**
   - Check if project exists in Known Projects
   - If NOT found: "Should I create project [Name]? I'll need:
     - Project code
     - Client (if applicable)
     - Start/end dates"

4. **When data is missing from documents:**
   - Extract what you can from OCR
   - Ask specific questions for missing details
   - Suggest based on vendor name/history

**ERROR HANDLING:**
- If approval fails due to missing vendor/client/project:
  - Parse the error response
  - Immediately offer: "It looks like [Entity] doesn't exist yet. Would you like me to create it?"
  - Collect required details through conversation
  - Use create_vendor, create_client, or create_project tools
  - Then retry the original suggestion

**CONVERSATION FLOW EXAMPLE:**
User: "Catat bill dari PT Media Digital Rp 10juta untuk ads"
AI: "I'll help you record that bill. I don't see PT Media Digital in the vendor list yet. Let me create it first. Is PT Media Digital:
1. A PKP (provides Faktur Pajak)?
2. Subject to 2% PPh 23 withholding?"
User: "Yes PKP, yes PPh 23"
AI: [calls create_vendor tool, then calls suggest_bill tool]

CONVERSATION GUIDELINES:
- Be conversational and helpful, not robotic
- Ask clarifying questions when details are missing (date, amounts, accounts)
- Explain WHY a rule applies, not just WHAT to do
- Once details are clear and user wants to record → IMMEDIATELY use the appropriate tool
- Always warn about potential tax/compliance risks
- Use IDR currency format with thousands separators
- Proactively offer to create missing entities before they cause errors

Remember: Indonesian businesses MUST comply with tax withholding or face penalties. Always err on the side of caution.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, attachments } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversation')
        .insert({ created_by: user.id })
        .select()
        .single();
      
      if (convError) throw convError;
      convId = newConv.id;
    }

    // Insert user message
    await supabase.from('conversation_message').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
      metadata: attachments ? { attachments } : null
    });

    // Get conversation history
    const { data: messages } = await supabase
      .from('conversation_message')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    // Build context: Get relevant tax rules, vendor data, bank accounts, and chart of accounts
    const contextParts = [];
    
    // Get active tax rules
    const { data: taxRules } = await supabase
      .from('tax_rules')
      .select('*')
      .eq('is_active', true)
      .limit(20);
    
    if (taxRules && taxRules.length > 0) {
      contextParts.push(`Available Tax Rules:\n${taxRules.map(r => 
        `- ${r.rule_type}: ${r.description} (Rate: ${r.rate ? (r.rate * 100) + '%' : 'N/A'})`
      ).join('\n')}`);
    }

    // Get vendors for name matching
    const { data: vendors } = await supabase
      .from('vendor')
      .select('name, code, subject_to_pph23, provides_faktur_pajak')
      .eq('is_active', true)
      .limit(50);
    
    if (vendors && vendors.length > 0) {
      contextParts.push(`Known Vendors:\n${vendors.map(v => 
        `- ${v.name} (${v.code}) - PPh23: ${v.subject_to_pph23 ? 'Yes' : 'No'}, PKP: ${v.provides_faktur_pajak ? 'Yes' : 'No'}`
      ).join('\n')}`);
    }

    // Get clients for name matching
    const { data: clients } = await supabase
      .from('client')
      .select('name, code, withholds_pph23')
      .eq('is_active', true)
      .limit(50);
    
    if (clients && clients.length > 0) {
      contextParts.push(`Known Clients:\n${clients.map(c => 
        `- ${c.name} (${c.code}) - Withholds PPh23: ${c.withholds_pph23 ? 'Yes' : 'No'}`
      ).join('\n')}`);
    }

    // Get projects
    const { data: projects } = await supabase
      .from('project')
      .select('name, code')
      .eq('is_active', true)
      .limit(50);
    
    if (projects && projects.length > 0) {
      contextParts.push(`Known Projects:\n${projects.map(p => 
        `- ${p.name} (${p.code})`
      ).join('\n')}`);
    }

    // Get bank accounts for payment references
    const { data: bankAccounts } = await supabase
      .from('bank_account')
      .select('account_code, bank_name, account_number')
      .eq('is_active', true);
    
    if (bankAccounts && bankAccounts.length > 0) {
      contextParts.push(`Available Bank Accounts:\n${bankAccounts.map(b => 
        `- ${b.bank_name} (${b.account_number}): Account Code ${b.account_code}`
      ).join('\n')}`);
    }

    // Get chart of accounts for proper account code usage
    const { data: accounts } = await supabase
      .from('account')
      .select('code, name, type')
      .eq('is_active', true)
      .order('code');
    
    if (accounts && accounts.length > 0) {
      const accountsByType = accounts.reduce((acc: any, a: any) => {
        if (!acc[a.type]) acc[a.type] = [];
        acc[a.type].push(`${a.code} - ${a.name}`);
        return acc;
      }, {});

      contextParts.push(`Chart of Accounts:\n${Object.entries(accountsByType)
        .map(([type, codes]) => `**${type}:**\n${(codes as string[]).join('\n')}`)
        .join('\n\n')}`);
    }

    const contextMessage = contextParts.length > 0 
      ? `\n\nCONTEXT FOR THIS CONVERSATION:\n${contextParts.join('\n\n')}`
      : '';

    // Call Lovable AI with streaming
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ENHANCED_SYSTEM_PROMPT + contextMessage },
          ...(messages || []).slice(-10).map(m => ({ role: m.role, content: m.content }))
        ],
        stream: true,
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_bill',
              description: 'Use this tool when user wants to record vendor bills, purchase invoices, or supplier expenses. REQUIRED when user confirms they want to create/record a bill.',
              parameters: {
                type: 'object',
                properties: {
                  vendor_name: { type: 'string' },
                  vendor_code: { type: 'string' },
                  date: { type: 'string', description: 'YYYY-MM-DD format' },
                  category: { type: 'string', enum: ['COGS', 'OPEX'] },
                  subtotal: { type: 'number' },
                  vat_amount: { type: 'number' },
                  total: { type: 'number' },
                  project_name: { type: 'string' },
                  faktur_pajak_number: { type: 'string' },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        expense_account_code: { type: 'string' },
                        expense_account_name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit_price: { type: 'number' },
                        amount: { type: 'number' }
                      }
                    }
                  }
                },
                required: ['vendor_name', 'date', 'category', 'subtotal', 'vat_amount', 'total', 'lines']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'suggest_invoice',
              description: 'Use this tool when user wants to create sales invoices or client invoices. REQUIRED when user confirms they want to create/record an invoice.',
              parameters: {
                type: 'object',
                properties: {
                  client_name: { type: 'string' },
                  client_code: { type: 'string' },
                  date: { type: 'string', description: 'YYYY-MM-DD format' },
                  subtotal: { type: 'number' },
                  vat_amount: { type: 'number' },
                  total: { type: 'number' },
                  project_name: { type: 'string' },
                  faktur_pajak_number: { type: 'string' },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        revenue_account_code: { type: 'string' },
                        revenue_account_name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit_price: { type: 'number' },
                        amount: { type: 'number' }
                      }
                    }
                  }
                },
                required: ['client_name', 'date', 'subtotal', 'vat_amount', 'total', 'lines']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'suggest_journal',
              description: 'Use this tool WHENEVER user wants to record: owner deposits, capital contributions, manual adjustments, bank transfers, accruals, expense allocations, or any manual journal entry. This creates an interactive approval card with Approve/Reject buttons. REQUIRED when user says "catat", "record", "create", "ok bisa catat", or confirms they want to save a transaction. IMPORTANT: All amounts (debit/credit) must be whole numbers (integers) with no decimals - Indonesian Rupiah has no decimal places.',
              parameters: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'YYYY-MM-DD format' },
                  description: { type: 'string' },
                  period: { type: 'string', description: 'YYYY-MM format' },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        account_code: { type: 'string' },
                        account_name: { type: 'string' },
                        description: { type: 'string' },
                        debit: { type: 'number', description: 'Whole number only (no decimals)' },
                        credit: { type: 'number', description: 'Whole number only (no decimals)' },
                        project_code: { type: 'string' }
                      }
                    }
                  }
                },
                required: ['date', 'description', 'period', 'lines']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'suggest_payment',
              description: 'Suggest a vendor payment with tax withholding',
              parameters: {
                type: 'object',
                properties: {
                  bill_number: { type: 'string' },
                  vendor_name: { type: 'string' },
                  date: { type: 'string', description: 'YYYY-MM-DD format' },
                  amount: { type: 'number' },
                  pph23_withheld: { type: 'number' },
                  bank_account_code: { type: 'string' },
                  bank_account_name: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['bill_number', 'vendor_name', 'date', 'amount', 'pph23_withheld', 'bank_account_code', 'bank_account_name']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_vendor',
              description: 'Create a new vendor when user confirms they want to add one. Use this before suggesting bills if vendor doesn\'t exist.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Vendor legal name' },
                  code: { type: 'string', description: 'Vendor code (optional, will auto-generate)' },
                  taxId: { type: 'string', description: 'NPWP number if available' },
                  providesFakturPajak: { type: 'boolean', description: 'Is vendor a PKP?' },
                  subjectToPph23: { type: 'boolean', description: 'Subject to 2% PPh 23 withholding?' }
                },
                required: ['name']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_client',
              description: 'Create a new client when user confirms. Use before suggesting invoices.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' },
                  taxId: { type: 'string' },
                  witholdsPph23: { type: 'boolean', description: 'Does client withhold PPh 23 on our invoices?' }
                },
                required: ['name']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_project',
              description: 'Create a new project when user confirms. Use before allocating COGS.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' },
                  clientName: { type: 'string', description: 'Associated client if any' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' }
                },
                required: ['name', 'code']
              }
            }
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI usage limit reached. Please add credits to your workspace.');
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // Stream response back to client
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('chat-with-ai error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
