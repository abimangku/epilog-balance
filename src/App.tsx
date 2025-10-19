import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { COATable } from "./components/COATable";
import { JournalForm } from "./components/JournalForm";
import { AIClassifier } from "./components/AIClassifier";
import { AIInbox } from "./components/AIInbox";
import { InvoiceForm } from "./components/InvoiceForm";
import { ReceiptForm } from "./components/ReceiptForm";
import { ARAgingReport } from "./components/ARAgingReport";
import { BillForm } from "./components/BillForm";
import { BillList } from "./components/BillList";
import { PaymentForm } from "./components/PaymentForm";
import { APAgingReport } from "./components/APAgingReport";
import { PeriodClose } from "./components/PeriodClose";
import { SnapshotViewer } from "./components/SnapshotViewer";
import { ProfitLossReport } from "./components/ProfitLossReport";
import { BalanceSheetReport } from "./components/BalanceSheetReport";
import { TrialBalanceReport } from "./components/TrialBalanceReport";
import { ClientManagement } from "./components/ClientManagement";
import { VendorManagement } from "./components/VendorManagement";
import { ProjectManagement } from "./components/ProjectManagement";
import { RevenueByClientReport } from "./components/RevenueByClientReport";
import { ExpensesByVendorReport } from "./components/ExpensesByVendorReport";
import { ProjectProfitabilityReport } from "./components/ProjectProfitabilityReport";
import { JournalList } from "./components/JournalList";
import { JournalDetail } from "./components/JournalDetail";
import { GeneralLedger } from "./components/GeneralLedger";
import { CompanySettings } from "./components/CompanySettings";
import { TaxReports } from "./components/TaxReports";
import NotFound from "./pages/NotFound";
import { BookOpen, FileText, Home, Brain, Inbox, Receipt, DollarSign, BarChart3, FileStack, CreditCard, TrendingUp, Lock, Camera, PieChart, Users, Building2, FolderKanban, List, FileCheck, Settings, FileSpreadsheet } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border p-4">
            <Link to="/" className="block mb-8">
              <h1 className="text-2xl font-bold text-sidebar-foreground">Vibe Accounting</h1>
              <p className="text-xs text-sidebar-foreground/60 mt-1">PSAK-Compliant</p>
            </Link>
            <nav className="space-y-2">
              <Link 
                to="/" 
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link 
                to="/accounts" 
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Chart of Accounts
              </Link>
              <Link 
                to="/journals" 
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <List className="h-4 w-4" />
                Journal List
              </Link>
              <Link 
                to="/journals/new" 
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
                New Journal Entry
              </Link>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">SALES & AR</div>
                <Link 
                  to="/invoices/new" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Receipt className="h-4 w-4" />
                  Create Invoice
                </Link>
                <Link 
                  to="/receipts/new" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  Record Receipt
                </Link>
                <Link 
                  to="/reports/ar-aging" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  AR Aging
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">AI FEATURES</div>
                <Link 
                  to="/ai/classify" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Brain className="h-4 w-4" />
                  AI Classifier
                </Link>
                <Link 
                  to="/ai/inbox" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Inbox className="h-4 w-4" />
                  AI Inbox
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">PURCHASES & AP</div>
                <Link 
                  to="/bills" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FileStack className="h-4 w-4" />
                  Bills
                </Link>
                <Link 
                  to="/bills/new" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  New Bill
                </Link>
                <Link 
                  to="/payments/new" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Vendor
                </Link>
                <Link 
                  to="/reports/ap-aging" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  AP Aging
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">PERIOD CLOSE</div>
                <Link 
                  to="/period-close" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Lock className="h-4 w-4" />
                  Close Period
                </Link>
                <Link 
                  to="/snapshots" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Snapshots
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">MASTER DATA</div>
                <Link 
                  to="/clients" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Clients
                </Link>
                <Link 
                  to="/vendors" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Vendors
                </Link>
                <Link 
                  to="/projects" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">REPORTS</div>
                <Link 
                  to="/reports/profit-loss" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <PieChart className="h-4 w-4" />
                  Profit & Loss
                </Link>
                <Link 
                  to="/reports/balance-sheet" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  Balance Sheet
                </Link>
                <Link 
                  to="/reports/trial-balance" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FileStack className="h-4 w-4" />
                  Trial Balance
                </Link>
                <Link 
                  to="/reports/revenue-by-client" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  Revenue by Client
                </Link>
                <Link 
                  to="/reports/expenses-by-vendor" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Expenses by Vendor
                </Link>
                <Link 
                  to="/reports/project-profitability" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  Project Profitability
                </Link>
                <Link 
                  to="/reports/general-ledger" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FileCheck className="h-4 w-4" />
                  General Ledger
                </Link>
                <Link 
                  to="/reports/tax" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Tax Reports
                </Link>
              </div>
              
              <div className="pt-4 mt-4 border-t border-sidebar-border">
                <div className="text-xs text-sidebar-foreground/60 px-4 mb-2 font-semibold">SETTINGS</div>
                <Link 
                  to="/settings" 
                  className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Company Settings
                </Link>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="ml-64">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<COATable />} />
              <Route path="/journals" element={<JournalList />} />
              <Route path="/journals/:id" element={<JournalDetail />} />
              <Route path="/journals/new" element={<JournalForm />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/receipts/new" element={<ReceiptForm />} />
              <Route path="/reports/ar-aging" element={<ARAgingReport />} />
              <Route path="/ai/classify" element={<AIClassifier />} />
              <Route path="/ai/inbox" element={<AIInbox />} />
              <Route path="/bills" element={<BillList />} />
              <Route path="/bills/new" element={<BillForm />} />
              <Route path="/payments/new" element={<PaymentForm />} />
              <Route path="/reports/ap-aging" element={<APAgingReport />} />
              <Route path="/period-close" element={<PeriodClose />} />
              <Route path="/snapshots" element={<SnapshotViewer />} />
              <Route path="/reports/profit-loss" element={<ProfitLossReport />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheetReport />} />
              <Route path="/reports/trial-balance" element={<TrialBalanceReport />} />
              <Route path="/clients" element={<ClientManagement />} />
              <Route path="/vendors" element={<VendorManagement />} />
              <Route path="/projects" element={<ProjectManagement />} />
              <Route path="/reports/revenue-by-client" element={<RevenueByClientReport />} />
              <Route path="/reports/expenses-by-vendor" element={<ExpensesByVendorReport />} />
              <Route path="/reports/project-profitability" element={<ProjectProfitabilityReport />} />
              <Route path="/reports/general-ledger" element={<GeneralLedger />} />
              <Route path="/reports/tax" element={<TaxReports />} />
              <Route path="/settings" element={<CompanySettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
