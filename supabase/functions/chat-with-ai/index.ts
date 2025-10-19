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
6. Provide financial analysis and insights using real transaction data

SYSTEM ARCHITECTURE:
- Database: PostgreSQL via Supabase
- Available Views: unified_transactions, ap_aging_summary, dashboard_metrics, trial_balance
- Database Functions: get_profit_loss(), get_balance_sheet(), get_cash_flow(), calculate_vat_position()
- Your query tools map directly to these database functions and views
- All data is real-time from the production accounting database

**CRITICAL TOOL USAGE MANDATE:**

🚨 YOU MUST CALL QUERY TOOLS WHEN USERS ASK FOR FINANCIAL DATA 🚨

NEVER say any of these:
❌ "I don't have access to that data"
❌ "I cannot view your transactions"
❌ "You'll need to check the reports yourself"
❌ "I don't have visibility into..."

YOU HAVE FULL ACCESS via the 13 query tools listed below!

**When user asks for financial information:**
1. ✅ IMMEDIATELY identify which tool(s) to call
2. ✅ CALL the tool(s) with appropriate parameters
3. ✅ ANALYZE the results and provide insights
4. ✅ FORMAT numbers with IDR currency and thousand separators

**Examples of CORRECT behavior:**
- User: "Show October finances" → ✅ Call query_profit_loss({start_period: "2025-10", end_period: "2025-10"})
- User: "Who owes money?" → ✅ Call query_aging_reports({report_type: "ar"})
- User: "Top vendors?" → ✅ Call query_vendor_expenses({start_date: "2025-01-01", end_date: "2025-12-31"})
- User: "Tax position?" → ✅ Call calculate_tax_position({period: "2025-10"})
- User: "How's project X?" → ✅ Call query_project_profitability({project_code: "X"})

If you forget to use tools, you are FAILING your core responsibility.

DATA ACCESS CAPABILITIES:
You have access to the following query tools - use them proactively when users ask questions:

1. **query_transactions** - For transaction history, filtering by date/type/status
2. **query_profit_loss** - For P&L reports and profitability analysis
3. **query_balance_sheet** - For financial position and account balances
4. **query_cash_flow** - For cash movement analysis
5. **query_aging_reports** - For overdue bills and invoices (AP/AR aging)
6. **query_journal_details** - For specific journal entry details with attachments
7. **query_vendor_expenses** - For vendor spending analysis
8. **query_client_revenue** - For client revenue analysis and payment history
9. **query_project_profitability** - For project margin analysis and unbilled revenue
10. **calculate_tax_position** - For tax payable calculations (VAT, PPh)
11. **compare_periods** - For variance analysis between two periods
12. **trend_analysis** - For trends over multiple periods
13. **compliance_check** - For active compliance issues

PROACTIVE ANALYSIS BEHAVIORS:
When user asks for financial summaries or analysis:
1. Call the appropriate query tool(s) to get actual data - NEVER make up numbers
2. Analyze the data and provide insights with specific numbers
3. Compare current period to previous periods when relevant
4. Highlight anomalies, risks, or opportunities
5. Suggest action items (e.g., "Client X is 30 days overdue - consider follow-up")
6. Use IDR currency format with thousands separators (e.g., "IDR 10,500,000")

Examples of what to do:
- User: "Show me October finances" → Call query_profit_loss for October, analyze revenue/costs
- User: "Who owes us money?" → Call query_aging_reports for AR, list overdue invoices
- User: "Analyze vendor spending" → Call query_vendor_expenses, show top vendors
- User: "Project profitability?" → Call query_project_profitability, show margins
- User: "Financial summary from October" → Call query_profit_loss, query_cash_flow, provide comprehensive analysis
- User: "How much did we pay vendor X?" → Call query_vendor_expenses with vendor filter
- User: "What's our tax position?" → Call calculate_tax_position for current period

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

    // Pre-load current month financial summary
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    const today = new Date().toISOString().slice(0, 10);

    try {
      // Get P&L for current month
      const { data: plData } = await supabase.rpc('get_profit_loss', {
        p_start_period: currentPeriod,
        p_end_period: currentPeriod
      });

      if (plData && plData.length > 0) {
        const revenue = plData.filter((x: any) => x.account_type === 'REVENUE')
          .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
        const cogs = plData.filter((x: any) => x.account_type === 'COGS')
          .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
        const opex = plData.filter((x: any) => x.account_type === 'OPEX')
          .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
        
        contextParts.push(`📊 Current Month Financial Summary (${currentPeriod}):
- Revenue: IDR ${revenue.toLocaleString('id-ID')}
- COGS: IDR ${cogs.toLocaleString('id-ID')}
- OPEX: IDR ${opex.toLocaleString('id-ID')}
- Gross Profit: IDR ${(revenue - cogs).toLocaleString('id-ID')} (${revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(1) : 0}%)
- Net Profit: IDR ${(revenue - cogs - opex).toLocaleString('id-ID')} (${revenue > 0 ? ((revenue - cogs - opex) / revenue * 100).toFixed(1) : 0}%)`);
      }

      // Get cash position
      const { data: bsData } = await supabase.rpc('get_balance_sheet', {
        p_as_of_date: today
      });

      if (bsData && bsData.length > 0) {
        const cashAccounts = bsData.filter((x: any) => x.account_code.startsWith('1-11'));
        const totalCash = cashAccounts.reduce((sum: number, x: any) => sum + Number(x.balance || 0), 0);
        
        const cashDetails = cashAccounts
          .map((x: any) => `  - ${x.account_name}: IDR ${Number(x.balance || 0).toLocaleString('id-ID')}`)
          .join('\n');
        
        contextParts.push(`💰 Cash Position (as of ${today}):\n${cashDetails}\n  Total Cash: IDR ${totalCash.toLocaleString('id-ID')}`);
      }

      // Get transaction counts for current month
      const monthStart = `${currentPeriod}-01`;
      
      const { count: journalCount } = await supabase
        .from('journal')
        .select('*', { count: 'exact', head: true })
        .gte('date', monthStart)
        .eq('status', 'POSTED');

      const { count: billCount } = await supabase
        .from('vendor_bill')
        .select('*', { count: 'exact', head: true })
        .gte('date', monthStart)
        .neq('status', 'DRAFT');

      const { count: invoiceCount } = await supabase
        .from('sales_invoice')
        .select('*', { count: 'exact', head: true })
        .gte('date', monthStart)
        .neq('status', 'DRAFT');

      contextParts.push(`📈 Transaction Activity (${currentPeriod}):
- Posted Journals: ${journalCount || 0}
- Approved Bills: ${billCount || 0}
- Invoices Issued: ${invoiceCount || 0}`);

      // Get overdue items
      const { data: overdueInvoices, count: overdueInvCount } = await supabase
        .from('sales_invoice')
        .select('number, total', { count: 'exact' })
        .lt('due_date', today)
        .not('status', 'in', '(PAID,DRAFT,VOIDED)')
        .order('due_date', { ascending: true })
        .limit(5);

      const { data: overdueBills, count: overdueBillCount } = await supabase
        .from('vendor_bill')
        .select('number, total', { count: 'exact' })
        .lt('due_date', today)
        .not('status', 'in', '(PAID,DRAFT,VOIDED)')
        .order('due_date', { ascending: true })
        .limit(5);

      if ((overdueInvCount && overdueInvCount > 0) || (overdueBillCount && overdueBillCount > 0)) {
        const warnings = [];
        if (overdueInvCount && overdueInvCount > 0) {
          const totalOverdueAR = overdueInvoices?.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0) || 0;
          warnings.push(`⚠️ ${overdueInvCount} overdue invoice(s) - Total AR: IDR ${totalOverdueAR.toLocaleString('id-ID')}`);
        }
        if (overdueBillCount && overdueBillCount > 0) {
          const totalOverdueAP = overdueBills?.reduce((sum: number, bill: any) => sum + Number(bill.total || 0), 0) || 0;
          warnings.push(`⚠️ ${overdueBillCount} overdue bill(s) - Total AP: IDR ${totalOverdueAP.toLocaleString('id-ID')}`);
        }
        contextParts.push(`⚠️ ATTENTION REQUIRED:\n${warnings.join('\n')}`);
      }
      // Get period status info
      const { data: periodStatus } = await supabase
        .from('period_status')
        .select('period, status, closed_at')
        .order('period', { ascending: false })
        .limit(6);

      if (periodStatus && periodStatus.length > 0) {
        const openPeriods = periodStatus.filter((p: any) => p.status === 'OPEN').map((p: any) => p.period);
        const closedPeriods = periodStatus.filter((p: any) => p.status === 'CLOSED').map((p: any) => p.period);
        
        contextParts.push(`📅 Period Status:
- Open Periods: ${openPeriods.length > 0 ? openPeriods.join(', ') : 'None'}
- Recently Closed: ${closedPeriods.slice(0, 3).join(', ') || 'None'}
- Current Period: ${currentPeriod} ${openPeriods.includes(currentPeriod) ? '(OPEN)' : '(CLOSED)'}`);
      }

      // Get company settings
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('company_name, fiscal_year_end, base_currency')
        .single();

      if (companySettings) {
        contextParts.push(`🏢 Company Profile:
- Name: ${companySettings.company_name || 'Not set'}
- Fiscal Year End: ${companySettings.fiscal_year_end || 'December 31'}
- Base Currency: ${companySettings.base_currency || 'IDR'}`);
      }

      // Get current user role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = userRole?.role || 'viewer';
      contextParts.push(`👤 Your Role: ${role.toUpperCase()} - You have ${role === 'admin' ? 'full' : role === 'moderator' ? 'elevated' : 'read'} access`);

    } catch (contextError) {
      console.log('Context pre-loading error (non-fatal):', contextError);
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
              description: 'Use this tool WHENEVER user wants to record: owner deposits, capital contributions, manual adjustments, bank transfers, accruals, expense allocations, or any manual journal entry. This creates an interactive approval card with Approve/Reject buttons. REQUIRED when user says "catat", "record", "create", "ok bisa catat", or confirms they want to save a transaction. IMPORTANT: All amounts (debit/credit) must be whole numbers (integers) with no decimals - Indonesian Rupiah has no decimal places. CRITICAL: Every line must have BOTH debit AND credit fields - set the unused one to 0.',
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
                        debit: { type: 'number', description: 'Whole number only (no decimals). Set to 0 if this is a credit line.' },
                        credit: { type: 'number', description: 'Whole number only (no decimals). Set to 0 if this is a debit line.' },
                        project_code: { type: 'string' }
                      },
                      required: ['account_code', 'debit', 'credit']
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
          },
          {
            type: 'function',
            function: {
              name: 'query_transactions',
              description: 'Query transaction history from unified_transactions view. Use when user asks about transactions, history, or "what happened in" a specific period.',
              parameters: {
                type: 'object',
                properties: {
                  start_date: { type: 'string', description: 'YYYY-MM-DD format (required)' },
                  end_date: { type: 'string', description: 'YYYY-MM-DD format (required)' },
                  type: { type: 'string', enum: ['journal', 'bill', 'invoice', 'receipt', 'all'], description: 'Transaction type filter' },
                  status: { type: 'string', description: 'Status filter (e.g., POSTED, PAID, DRAFT)' }
                },
                required: ['start_date', 'end_date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_profit_loss',
              description: 'Get Profit & Loss report for a period. Use when user asks for P&L, profitability, revenue/expenses breakdown.',
              parameters: {
                type: 'object',
                properties: {
                  start_period: { type: 'string', description: 'YYYY-MM format (required)' },
                  end_period: { type: 'string', description: 'YYYY-MM format (optional, defaults to start_period)' }
                },
                required: ['start_period']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_balance_sheet',
              description: 'Get Balance Sheet as of a specific date. Use when user asks for financial position, assets, liabilities, equity, or account balances.',
              parameters: {
                type: 'object',
                properties: {
                  as_of_date: { type: 'string', description: 'YYYY-MM-DD format (required)' }
                },
                required: ['as_of_date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_cash_flow',
              description: 'Get Cash Flow statement. Use when user asks about cash movement, where cash went, operating/investing/financing activities.',
              parameters: {
                type: 'object',
                properties: {
                  start_date: { type: 'string', description: 'YYYY-MM-DD format (required)' },
                  end_date: { type: 'string', description: 'YYYY-MM-DD format (required)' }
                },
                required: ['start_date', 'end_date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_aging_reports',
              description: 'Get AP/AR aging reports for overdue bills and invoices. Use when user asks who owes money, overdue items, aging.',
              parameters: {
                type: 'object',
                properties: {
                  report_type: { type: 'string', enum: ['AR', 'AP', 'both'], description: 'AR for receivables, AP for payables' },
                  as_of_date: { type: 'string', description: 'YYYY-MM-DD format (optional, defaults to today)' },
                  vendor_name: { type: 'string', description: 'Filter by vendor name (for AP)' },
                  client_name: { type: 'string', description: 'Filter by client name (for AR)' }
                },
                required: ['report_type']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_journal_details',
              description: 'Get specific journal entry details with all lines. Use when user asks for details of a specific journal number.',
              parameters: {
                type: 'object',
                properties: {
                  journal_number: { type: 'string', description: 'Journal number (e.g., JRN-2025-0042)' }
                },
                required: ['journal_number']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_vendor_expenses',
              description: 'Analyze expenses by vendor. Use when user asks how much paid to a vendor, vendor spending analysis.',
              parameters: {
                type: 'object',
                properties: {
                  vendor_name: { type: 'string', description: 'Vendor name (optional, omit for all vendors)' },
                  start_date: { type: 'string', description: 'YYYY-MM-DD format (required)' },
                  end_date: { type: 'string', description: 'YYYY-MM-DD format (required)' }
                },
                required: ['start_date', 'end_date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_client_revenue',
              description: 'Analyze revenue by client. Use when user asks about client revenue, payment history, outstanding amounts.',
              parameters: {
                type: 'object',
                properties: {
                  client_name: { type: 'string', description: 'Client name (optional, omit for all clients)' },
                  start_date: { type: 'string', description: 'YYYY-MM-DD format (required)' },
                  end_date: { type: 'string', description: 'YYYY-MM-DD format (required)' }
                },
                required: ['start_date', 'end_date']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'query_project_profitability',
              description: 'Analyze project profitability with revenue vs COGS. Use when user asks about project margins, profitability.',
              parameters: {
                type: 'object',
                properties: {
                  project_name: { type: 'string', description: 'Project name (optional, omit for all projects)' },
                  include_unbilled: { type: 'boolean', description: 'Include unbilled revenue' }
                },
                required: []
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'calculate_tax_position',
              description: 'Calculate tax position (VAT, PPh). Use when user asks about tax payable, tax position, VAT owed.',
              parameters: {
                type: 'object',
                properties: {
                  period: { type: 'string', description: 'YYYY-MM format (required)' }
                },
                required: ['period']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'compare_periods',
              description: 'Compare two periods side-by-side for variance analysis. Use when user asks to compare months, YoY, MoM.',
              parameters: {
                type: 'object',
                properties: {
                  period1: { type: 'string', description: 'First period YYYY-MM (required)' },
                  period2: { type: 'string', description: 'Second period YYYY-MM (required)' },
                  metric: { type: 'string', enum: ['revenue', 'expenses', 'profit', 'all'], description: 'What to compare' }
                },
                required: ['period1', 'period2']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'trend_analysis',
              description: 'Show trends over multiple periods. Use when user asks for trends, patterns, growth over time.',
              parameters: {
                type: 'object',
                properties: {
                  start_period: { type: 'string', description: 'Start period YYYY-MM (required)' },
                  end_period: { type: 'string', description: 'End period YYYY-MM (required)' },
                  metric: { type: 'string', enum: ['revenue', 'expenses', 'profit', 'cash'], description: 'What to analyze' }
                },
                required: ['start_period', 'end_period', 'metric']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'compliance_check',
              description: 'Check for active compliance issues. Use when user asks about compliance, issues, what needs fixing.',
              parameters: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['all', 'high', 'medium', 'low'], description: 'Filter by severity' },
                  status: { type: 'string', enum: ['all', 'open', 'resolved'], description: 'Filter by status' }
                },
                required: []
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

    // Check if response contains tool calls - if so, handle them
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls: any[] = [];
    let hasToolCalls = false;
    let fullContent = '';

    // Read the stream to detect tool calls
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          
          if (delta?.tool_calls) {
            hasToolCalls = true;
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = {
                    id: tc.id,
                    type: 'function',
                    function: { name: '', arguments: '' }
                  };
                }
                if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          }
          
          if (delta?.content) {
            fullContent += delta.content;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // If no tool calls, return the content as-is
    if (!hasToolCalls || toolCalls.length === 0) {
      // Re-stream the collected content
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            choices: [{ delta: { content: fullContent } }]
          })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Execute tool calls
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log(`Executing tool: ${functionName}`, args);
      
      let result: any = null;

      try {
        switch (functionName) {
          case 'query_transactions': {
            const query = supabase
              .from('unified_transactions')
              .select('*')
              .gte('date', args.start_date)
              .lte('date', args.end_date);
            
            if (args.type && args.type !== 'all') query.eq('type', args.type);
            if (args.status) query.eq('status', args.status);
            
            const { data, error } = await query.order('date', { ascending: false }).limit(100);
            if (error) throw error;
            result = { transactions: data, count: data?.length || 0 };
            break;
          }

          case 'query_profit_loss': {
            const { data, error } = await supabase.rpc('get_profit_loss', {
              p_start_period: args.start_period,
              p_end_period: args.end_period || args.start_period
            });
            if (error) throw error;
            
            const revenue = data?.filter((x: any) => x.account_type === 'REVENUE')
              .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) || 0;
            const cogs = data?.filter((x: any) => x.account_type === 'COGS')
              .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) || 0;
            const opex = data?.filter((x: any) => x.account_type === 'OPEX')
              .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) || 0;
            const otherIncome = data?.filter((x: any) => x.account_type === 'OTHER_INCOME')
              .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) || 0;
            const otherExpense = data?.filter((x: any) => x.account_type === 'OTHER_EXPENSE')
              .reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0) || 0;
            
            result = {
              period: args.start_period,
              revenue,
              cogs,
              gross_profit: revenue - cogs,
              opex,
              operating_profit: revenue - cogs - opex,
              other_income: otherIncome,
              other_expense: otherExpense,
              net_profit: revenue - cogs - opex + otherIncome - otherExpense,
              details: data
            };
            break;
          }

          case 'query_balance_sheet': {
            const { data, error } = await supabase.rpc('get_balance_sheet', {
              p_as_of_date: args.as_of_date
            });
            if (error) throw error;
            
            const assets = data?.filter((x: any) => x.account_type === 'ASSET')
              .reduce((sum: number, x: any) => sum + Number(x.balance || 0), 0) || 0;
            const liabilities = data?.filter((x: any) => x.account_type === 'LIABILITY')
              .reduce((sum: number, x: any) => sum + Number(x.balance || 0), 0) || 0;
            const equity = data?.filter((x: any) => x.account_type === 'EQUITY')
              .reduce((sum: number, x: any) => sum + Number(x.balance || 0), 0) || 0;
            
            result = {
              as_of_date: args.as_of_date,
              assets,
              liabilities,
              equity,
              total_liabilities_equity: liabilities + equity,
              details: data
            };
            break;
          }

          case 'query_cash_flow': {
            const { data, error } = await supabase.rpc('get_cash_flow', {
              p_start_date: args.start_date,
              p_end_date: args.end_date
            });
            if (error) throw error;
            result = { cash_flow: data };
            break;
          }

          case 'query_aging_reports': {
            const today = args.as_of_date || new Date().toISOString().slice(0, 10);
            
            if (args.report_type === 'AR' || args.report_type === 'both') {
              const query = supabase
                .from('sales_invoice')
                .select('number, client_id, date, due_date, total, status')
                .lt('due_date', today)
                .not('status', 'in', '(PAID,DRAFT,VOIDED)');
              
              if (args.client_name) query.eq('client_id', args.client_name);
              
              const { data: arData } = await query.order('due_date');
              result = { ar_aging: arData };
            }
            
            if (args.report_type === 'AP' || args.report_type === 'both') {
              const query = supabase
                .from('vendor_bill')
                .select('number, vendor_id, date, due_date, total, status')
                .lt('due_date', today)
                .not('status', 'in', '(PAID,DRAFT,VOIDED)');
              
              if (args.vendor_name) query.eq('vendor_id', args.vendor_name);
              
              const { data: apData } = await query.order('due_date');
              result = { ...result, ap_aging: apData };
            }
            break;
          }

          case 'query_journal_details': {
            const { data: journal, error: jError } = await supabase
              .from('journal')
              .select('*, journal_line(*)')
              .eq('number', args.journal_number)
              .single();
            
            if (jError) throw jError;
            result = { journal };
            break;
          }

          case 'query_vendor_expenses': {
            const query = supabase
              .from('vendor_bill')
              .select('vendor_id, date, total, status')
              .gte('date', args.start_date)
              .lte('date', args.end_date)
              .not('status', 'eq', 'DRAFT');
            
            if (args.vendor_name) query.eq('vendor_id', args.vendor_name);
            
            const { data, error } = await query;
            if (error) throw error;
            
            const totalExpenses = data?.reduce((sum: number, b: any) => sum + Number(b.total || 0), 0) || 0;
            result = { expenses: data, total: totalExpenses };
            break;
          }

          case 'query_client_revenue': {
            const query = supabase
              .from('sales_invoice')
              .select('client_id, date, total, status')
              .gte('date', args.start_date)
              .lte('date', args.end_date)
              .not('status', 'eq', 'DRAFT');
            
            if (args.client_name) query.eq('client_id', args.client_name);
            
            const { data, error } = await query;
            if (error) throw error;
            
            const totalRevenue = data?.reduce((sum: number, i: any) => sum + Number(i.total || 0), 0) || 0;
            result = { revenue: data, total: totalRevenue };
            break;
          }

          case 'query_project_profitability': {
            // This would need a custom query - for now return placeholder
            result = { message: 'Project profitability query not yet implemented' };
            break;
          }

          case 'calculate_tax_position': {
            const { data, error } = await supabase.rpc('calculate_vat_position', {
              p_period: args.period
            });
            if (error) throw error;
            result = { tax_position: data };
            break;
          }

          case 'compare_periods': {
            const { data: period1Data } = await supabase.rpc('get_profit_loss', {
              p_start_period: args.period1,
              p_end_period: args.period1
            });
            
            const { data: period2Data } = await supabase.rpc('get_profit_loss', {
              p_start_period: args.period2,
              p_end_period: args.period2
            });
            
            result = { period1: period1Data, period2: period2Data };
            break;
          }

          case 'trend_analysis': {
            // Multi-period analysis - simplified for now
            result = { message: 'Trend analysis query not yet fully implemented' };
            break;
          }

          case 'compliance_check': {
            const query = supabase
              .from('compliance_issue')
              .select('*');
            
            if (args.severity && args.severity !== 'all') query.eq('severity', args.severity);
            if (args.status && args.status !== 'all') query.eq('status', args.status);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            result = { issues: data, count: data?.length || 0 };
            break;
          }

          default:
            result = { error: `Unknown tool: ${functionName}` };
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result)
        });
      } catch (error) {
        console.error(`Tool execution error for ${functionName}:`, error);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed' })
        });
      }
    }

    // Make a follow-up call to AI with tool results
    const followUpMessages = [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT + contextMessage },
      ...(messages || []).slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'assistant', content: null, tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.function.name, arguments: tc.function.arguments }
      })) },
      ...toolResults
    ];

    const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: followUpMessages,
        stream: true,
        temperature: 0.7
      }),
    });

    if (!followUpResponse.ok) {
      throw new Error(`Follow-up AI request failed: ${followUpResponse.status}`);
    }

    // Stream the final response
    return new Response(followUpResponse.body, {
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
