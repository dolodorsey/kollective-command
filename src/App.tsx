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
import OpsOSHome from "./pages/OpsOSHome";
import OpsSocial from "./pages/OpsSocial";
import OpsMarketing from "./pages/OpsMarketing";
import OpsApprovals from "./pages/OpsApprovals";
import OpsContentStudio from "./pages/OpsContentStudio";
import OpsEventsCommand from "./pages/OpsEventsCommand";
import OpsRevenue from "./pages/OpsRevenue";
import OpsTasksCommand from "./pages/OpsTasksCommand";
import NotFound from "./pages/NotFound";
import { AuthGate } from "@/components/AuthGate";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGate>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/events" element={<Events />} />
            <Route path="/outreach" element={<Outreach />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/email" element={<EmailInbox />} />
            <Route path="/ig" element={<IGInbox />} />
            <Route path="/phone" element={<PhoneInbox />} />
            <Route path="/social" element={<Social />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/outputs" element={<Outputs />} />
            <Route path="/system" element={<SystemHealth />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ops-os" element={<OpsOSHome />} />
            <Route path="/ops-os/social" element={<OpsSocial />} />
            <Route path="/ops-os/marketing" element={<OpsMarketing />} />
            <Route path="/ops-os/approvals" element={<OpsApprovals />} />
            <Route path="/ops-os/content-studio" element={<OpsContentStudio />} />
            <Route path="/ops-os/events" element={<OpsEventsCommand />} />
            <Route path="/ops-os/revenue" element={<OpsRevenue />} />
            <Route path="/ops-os/tasks" element={<OpsTasksCommand />} />
            <Route path="/brand/:brandKey" element={<BrandDetail />} />
            <Route path="/division/:slug" element={<DivisionDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
