import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { COATable } from "./components/COATable";
import { JournalForm } from "./components/JournalForm";
import NotFound from "./pages/NotFound";
import { BookOpen, FileText, Home } from "lucide-react";

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
                to="/journals/new" 
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
                New Journal Entry
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="ml-64">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<COATable />} />
              <Route path="/journals/new" element={<JournalForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
