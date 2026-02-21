import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Link2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import markLogo from "@/assets/mark-logo.png";

async function connectHubSpot(): Promise<{ success: boolean }> {
  // Mock API call — replace with real HubSpot CRM integration
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate success (flip to reject to test failure)
      resolve({ success: true });
    }, 2000);
  });
}

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await connectHubSpot();
      if (result.success) {
        toast({
          title: "CRM connected",
          description: "HubSpot linked successfully. Let's create your first campaign.",
        });
        navigate("/create");
      } else {
        throw new Error("Connection failed");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: "Could not connect to HubSpot. Please try again.",
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-16 py-12">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-6"
      >
        <motion.img
          src={markLogo}
          alt="Mark"
          className="mx-auto h-16 w-16"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        />

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-foreground leading-[1.05]">
          Meet <span className="gradient-text">Mark</span>
        </h1>

        <p className="mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed">
          Your AI-powered marketing campaign agent. Create multi-channel email campaigns,
          review personalized content, and reach your audience — all from one place.
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-3 pt-2"
        >
          {["AI Campaign Generation", "Email Personalization", "Multi-Region Targeting"].map(
            (tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {tag}
              </span>
            )
          )}
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <Button
          size="lg"
          className="h-14 px-10 text-base font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to HubSpot…
            </>
          ) : (
            <>
              <Link2 className="h-5 w-5" />
              Connect your CRM via HubSpot
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          Import contacts and start building campaigns in minutes
        </p>
      </motion.div>
    </div>
  );
}
