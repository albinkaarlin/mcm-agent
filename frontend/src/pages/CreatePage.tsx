import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useCampaignStore } from "@/lib/campaign-store";
import { generateCampaign } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function CreatePage() {
  const navigate = useNavigate();
  const {
    prompt,
    setPrompt,
    setGeneratedEmails,
    setStep,
    isGenerating,
    setIsGenerating,
  } = useCampaignStore();

  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const buildEnrichedPrompt = () => {
    const answersText = clarificationQuestions
      .map((q, i) => `Q: ${q.question}\nA: ${clarificationAnswers[i] ?? "(no answer provided)"}`)
      .join("\n\n");
    return answersText
      ? `${prompt}\n\nAdditional context from clarification:\n${answersText}`
      : prompt;
  };

  const handleGenerate = async (enrichedPrompt?: string, forceProceed = false) => {
    const activePrompt = enrichedPrompt ?? prompt;
    if (!activePrompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await generateCampaign({ prompt: activePrompt, force_proceed: forceProceed });

      if (response.status === "needs_clarification" && response.questions?.length) {
        setClarificationQuestions(response.questions);
        setClarificationAnswers({});
        return;
      }

      setGeneratedEmails(response.emails);
      setStep(1);
      navigate("/review");
    } catch (error) {
      console.error("Failed to generate campaign:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClarificationSubmit = () => {
    const enriched = buildEnrichedPrompt();
    setClarificationQuestions([]);
    handleGenerate(enriched, true);
  };

  // ── Clarification screen ──────────────────────────────────────────────────
  if (clarificationQuestions.length > 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            A few quick questions
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Help Mark understand your <span className="gradient-text">campaign</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Answer these to get the best results. You can leave any blank to use AI defaults.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {clarificationQuestions.map((q, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {q.question}
                </p>
                <Textarea
                  placeholder="Your answer (or leave blank to skip)..."
                  className="min-h-[80px] resize-none text-sm"
                  value={clarificationAnswers[i] ?? ""}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                />
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => setClarificationQuestions([])}
          >
            Back
          </Button>
          <Button
            size="lg"
            className="h-11 px-8 text-sm font-semibold"
            onClick={handleClarificationSubmit}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Campaign
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main create screen ────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-5"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-Powered Campaign Creation
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] text-foreground leading-[1.1]">
          Create your next{" "}
          <span className="gradient-text">marketing campaign</span>
        </h1>
        <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed">
          Describe your campaign goals, target audience, and preferences. Mark will generate
          personalized email campaigns tailored to your needs.
        </p>
      </motion.div>

      {/* Prompt Box */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="border border-border shadow-sm">
          <CardContent className="p-5 space-y-4">
            <Textarea
              placeholder="Describe your campaign... e.g. 'Create a 3-email spring sale campaign targeting EU customers aged 25-40. Include GDPR compliance, use a professional but friendly tone, and promote our new collection with a 30% discount code.'"
              className="min-h-[160px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Be specific about target market, regions, number of emails, tone, and legal requirements.
              </p>
              <span className="text-xs text-muted-foreground font-mono-display">{prompt.length}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Generate Button */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          className="h-11 px-8 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Campaign
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
