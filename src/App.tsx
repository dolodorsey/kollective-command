import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Outreach from "./pages/Outreach";
import Leads from "./pages/Leads";
import InboxPage from "./pages/InboxPage";
import Social from "./pages/Social";
import Tasks from "./pages/Tasks";
import Outputs from "./pages/Outputs";
import SystemHealth from "./pages/SystemHealth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/social" element={<Social />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/outputs" element={<Outputs />} />
            <Route path="/system" element={<SystemHealth />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
