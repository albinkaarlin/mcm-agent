import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, X, FileText, Image, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useCampaignStore } from "@/lib/campaign-store";
import { generateCampaign, type ClarificationQuestion } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function CreatePage() {
  const navigate = useNavigate();
  const {
    prompt,
    setPrompt,
    uploadedFiles,
    addFiles,
    removeFile,
    setGeneratedEmails,
    setStep,
    isGenerating,
    setIsGenerating,
  } = useCampaignStore();

  const [dragActive, setDragActive] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      addFiles(files);
    },
    [addFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const buildEnrichedPrompt = () => {
    if (clarificationQuestions.length === 0) return prompt;
    const answersText = clarificationQuestions
      .map((q) => `Q: ${q.question}\nA: ${clarificationAnswers[q.field] ?? ""}`)
      .filter((entry) => entry.includes("\nA: ") && clarificationAnswers[clarificationQuestions.find(q => entry.includes(q.question))?.field ?? ""])
      .join("\n\n");
    return answersText
      ? `${prompt}\n\nAdditional context:\n${answersText}`
      : prompt;
  };

  const handleGenerate = async (enrichedPrompt?: string) => {
    const activePrompt = enrichedPrompt ?? prompt;
    if (!activePrompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateCampaign({ prompt: activePrompt, files: uploadedFiles });

      if (response.status === "needs_clarification" && response.questions?.length) {
        setClarificationQuestions(response.questions);
        setClarificationAnswers({});
        return;
      }

      setGeneratedEmails(response.emails);
      setStep(1);
      navigate("/review");
    } catch (err) {
      console.error("Failed to generate campaign:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClarificationSubmit = () => {
    setClarificationQuestions([]);
    handleGenerate(buildEnrichedPrompt());
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-primary" />;
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
            <Card key={q.field} className="border border-border">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {q.question}
                </p>
                <Textarea
                  placeholder="Your answer (or leave blank to skip)..."
                  className="min-h-[80px] resize-none text-sm"
                  value={clarificationAnswers[q.field] ?? ""}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({ ...prev, [q.field]: e.target.value }))
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
          AI-Powered Multi Channel Marketing 
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] text-foreground leading-[1.1]">
          Create your next{" "}
          <span className="gradient-text">marketing campaign</span>
        </h1>
        <p className="mx-auto max-w-lg text-base text-muted-foreground leading-relaxed">
          Describe your campaign goals, target audience, and preferences. <b>Mark</b> will generate
          personalized email campaigns tailored to your needs.
        </p>
      </motion.div>

      {/* Prompt Box */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-4">
            <Textarea
              placeholder="Describe your campaign. 'Create a 3-email spring sale campaign targeting EU customers aged 25-40. Include GDPR compliance, use a professional but friendly tone, and promote our new collection with a 30% discount code.'"
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

      {/* File Upload */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? "border-primary bg-accent"
              : "border-border hover:border-primary/40 hover:bg-muted/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-foreground">
            Drop company assets here or{" "}
            <label className="cursor-pointer text-primary hover:underline font-medium">
              browse files
              <input
                type="file"
                className="hidden"
                multiple
                onChange={handleFileInput}
                accept=".pdf,.png,.jpg,.jpeg,.svg,.txt,.doc,.docx"
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Logos, brand guidelines, company policies, legal docs
          </p>
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs"
              >
                {getFileIcon(file)}
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Generate Button */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          className="h-11 px-8 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          onClick={() => handleGenerate()}
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

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-center"
          >
            {error}
          </motion.div>
        )}
      </div>
    );
}
