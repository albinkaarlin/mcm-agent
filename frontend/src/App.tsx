import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "@/pages/Index";
import CreatePage from "@/pages/CreatePage";
import ReviewPage from "@/pages/ReviewPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignDetailPage from "@/pages/CampaignDetailPage";
import SendPage from "@/pages/SendPage";
import BrandPage from "@/pages/BrandPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/brand" element={<BrandPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
