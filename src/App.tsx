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
import { BillDetail } from "./components/BillDetail";
import { BankAccountManagement } from "./components/BankAccountManagement";
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
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import InvoiceList from "./components/InvoiceList";
import InvoiceDetail from "./components/InvoiceDetail";
import ReceiptList from "./components/ReceiptList";
import AccountManagement from "./components/AccountManagement";
import { BookOpen, FileText, Home, Brain, Inbox, Receipt, DollarSign, BarChart3, FileStack, CreditCard, TrendingUp, Lock, Camera, PieChart, Users, Building2, FolderKanban, List, FileCheck, Settings, FileSpreadsheet, Landmark, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <Link to="/" className="block p-4 border-b border-sidebar-border flex-shrink-0">
              <h1 className="text-2xl font-bold text-sidebar-foreground">Vibe Accounting</h1>
              <p className="text-xs text-sidebar-foreground/60 mt-1">PSAK-Compliant</p>
            </Link>
            <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-sidebar-accent">
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
              <Link to="/invoices" className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                <List className="h-4 w-4" />
                Invoice List
              </Link>
              <Link to="/invoices/new" className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                <Receipt className="h-4 w-4" />
                Create Invoice
              </Link>
              <Link to="/receipts" className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                <FileText className="h-4 w-4" />
                Receipt List
              </Link>
              <Link to="/receipts/new" className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between gap-3 px-4 py-2 w-full rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4" />
                      Settings
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-3 px-4 py-2 pl-12 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Company Settings
                    </Link>
                    <Link 
                      to="/settings/banks" 
                      className="flex items-center gap-3 px-4 py-2 pl-12 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <Landmark className="h-4 w-4" />
                      Bank Accounts
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="ml-64">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><AccountManagement /></ProtectedRoute>} />
              <Route path="/journals" element={<ProtectedRoute><JournalList /></ProtectedRoute>} />
              <Route path="/journals/:id" element={<ProtectedRoute><JournalDetail /></ProtectedRoute>} />
              <Route path="/journals/new" element={<ProtectedRoute><JournalForm /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><InvoiceList /></ProtectedRoute>} />
              <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
              <Route path="/invoices/new" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
              <Route path="/receipts" element={<ProtectedRoute><ReceiptList /></ProtectedRoute>} />
              <Route path="/receipts/new" element={<ProtectedRoute><ReceiptForm /></ProtectedRoute>} />
              <Route path="/reports/ar-aging" element={<ProtectedRoute><ARAgingReport /></ProtectedRoute>} />
              <Route path="/ai/classify" element={<ProtectedRoute><AIClassifier /></ProtectedRoute>} />
              <Route path="/ai/inbox" element={<ProtectedRoute><AIInbox /></ProtectedRoute>} />
              <Route path="/bills" element={<ProtectedRoute><BillList /></ProtectedRoute>} />
              <Route path="/bills/:id" element={<ProtectedRoute><BillDetail /></ProtectedRoute>} />
              <Route path="/bills/new" element={<ProtectedRoute><BillForm /></ProtectedRoute>} />
              <Route path="/payments/new" element={<ProtectedRoute><PaymentForm /></ProtectedRoute>} />
              <Route path="/reports/ap-aging" element={<ProtectedRoute><APAgingReport /></ProtectedRoute>} />
              <Route path="/period-close" element={<ProtectedRoute><PeriodClose /></ProtectedRoute>} />
              <Route path="/snapshots" element={<ProtectedRoute><SnapshotViewer /></ProtectedRoute>} />
              <Route path="/reports/profit-loss" element={<ProtectedRoute><ProfitLossReport /></ProtectedRoute>} />
              <Route path="/reports/balance-sheet" element={<ProtectedRoute><BalanceSheetReport /></ProtectedRoute>} />
              <Route path="/reports/trial-balance" element={<ProtectedRoute><TrialBalanceReport /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><VendorManagement /></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><ProjectManagement /></ProtectedRoute>} />
              <Route path="/reports/revenue-by-client" element={<ProtectedRoute><RevenueByClientReport /></ProtectedRoute>} />
              <Route path="/reports/expenses-by-vendor" element={<ProtectedRoute><ExpensesByVendorReport /></ProtectedRoute>} />
              <Route path="/reports/project-profitability" element={<ProtectedRoute><ProjectProfitabilityReport /></ProtectedRoute>} />
              <Route path="/reports/general-ledger" element={<ProtectedRoute><GeneralLedger /></ProtectedRoute>} />
              <Route path="/reports/tax" element={<ProtectedRoute><TaxReports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
              <Route path="/settings/banks" element={<ProtectedRoute><BankAccountManagement /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
