export type AccountType = 
  | 'ASSET' 
  | 'LIABILITY' 
  | 'EQUITY' 
  | 'REVENUE' 
  | 'COGS' 
  | 'OPEX' 
  | 'OTHER_INCOME' 
  | 'OTHER_EXPENSE' 
  | 'TAX_EXPENSE'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parent_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JournalLine {
  account_code: string
  debit: number
  credit: number
  description?: string
  project_code?: string
}

export interface CreateJournalInput {
  date: string
  description: string
  lines: JournalLine[]
}

export interface Journal {
  id: string
  number: string
  date: string
  description: string
  status: string
  period: string
  created_at: string
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  COGS: 'Cost of Goods Sold',
  OPEX: 'Operating Expenses',
  OTHER_INCOME: 'Other Income',
  OTHER_EXPENSE: 'Other Expenses',
  TAX_EXPENSE: 'Tax Expense',
}
