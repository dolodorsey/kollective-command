import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Commands from "./pages/Commands";
import Events from "./pages/Events";
import Outreach from "./pages/Outreach";
import Leads from "./pages/Leads";
import InboxPage from "./pages/InboxPage";
import EmailInbox from "./pages/EmailInbox";
import IGInbox from "./pages/IGInbox";
import PhoneInbox from "./pages/PhoneInbox";
import Social from "./pages/Social";
import Tasks from "./pages/Tasks";
import Outputs from "./pages/Outputs";
import SystemHealth from "./pages/SystemHealth";
import Settings from "./pages/Settings";
import BrandDetail from "./pages/BrandDetail";
import DivisionDetail from "./pages/DivisionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/events" element={<Events />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/email" element={<EmailInbox />} />
            <Route path="/ig" element={<IGInbox />} />
            <Route path="/phone" element={<PhoneInbox />} />
            <Route path="/social" element={<Social />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/outputs" element={<Outputs />} />
            <Route path="/system" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/brand/:brandKey" element={<BrandDetail />} />
            <Route path="/division/:slug" element={<DivisionDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
