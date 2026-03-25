import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import OverviewPage from "./pages/OverviewPage";
import IssuesPage from "./pages/IssuesPage";
import RunsPage from "./pages/RunsPage";
import RunDetailPage from "./pages/RunDetailPage";
import SessionsPage from "./pages/SessionsPage";
import AnalyzerPage from "./pages/AnalyzerPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

function DarkModeInit() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DarkModeInit />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/issues" element={<IssuesPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:id" element={<RunDetailPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/analyzer" element={<AnalyzerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
