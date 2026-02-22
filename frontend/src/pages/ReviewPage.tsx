import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCampaignStore } from "@/lib/campaign-store";
import { useCampaignsStore } from "@/lib/campaigns-list-store";
import { editEmail } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { GeneratedEmail } from "@/lib/api";

function EmailPreviewCard({
  email,
  index,
  onClick,
}: {
  email: GeneratedEmail;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        className="cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 border-border"
        onClick={onClick}
      >
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-sm font-semibold leading-tight text-foreground">
            {email.subject}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[180px] overflow-hidden border-t border-border">
            <iframe
              srcDoc={email.htmlContent}
              className="pointer-events-none h-[600px] w-[600px] origin-top-left scale-[0.5]"
              sandbox=""
              title={email.subject}
            />
          </div>
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground">Target:</span> {email.summary.targetGroup}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmailEditorModal({
  email,
  open,
  onClose,
  onHtmlUpdated,
}: {
  email: GeneratedEmail | null;
  open: boolean;
  onClose: () => void;
  onHtmlUpdated: (id: string, html: string) => void;
}) {
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  if (!email) return null;

  const handleSubmitEdit = async () => {
    if (!editPrompt.trim()) return;
    setIsEditing(true);
    try {
      const updated = await editEmail(
        email.id,
        email.htmlContent,
        email.subject,
        editPrompt
      );
      onHtmlUpdated(email.id, updated.htmlContent);
      setEditPrompt("");
      toast({
        title: "Email updated",
        description: "Changes applied successfully.",
      });
    } catch (err) {
      toast({
        title: "Edit failed",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base font-semibold">{email.subject}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <iframe
              srcDoc={email.htmlContent}
              className="h-full w-full"
              sandbox=""
              title="Email preview"
            />
          </div>

          <div className="w-[300px] flex-shrink-0 border-l border-border bg-muted/30 flex flex-col overflow-hidden">
            <Tabs defaultValue="summary" className="flex flex-col h-full">
              <div className="px-4 pt-4 pb-2 flex-shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1 gap-1.5 text-xs">
                    <Sparkles className="h-3 w-3" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="flex-1 gap-1.5 text-xs">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="flex-1 overflow-auto px-5 pb-5 mt-0">
                <div className="space-y-4 pt-2">
                  {[
                    { label: "Target Group", value: email.summary.targetGroup },
                    { label: "Regional Adaptation", value: email.summary.regionalAdaptation },
                    { label: "Tone & Style", value: email.summary.toneDecision },
                    { label: "Legal Compliance", value: email.summary.legalConsiderations },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-xs text-foreground leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="edit" className="flex-1 flex flex-col overflow-auto px-5 pb-5 mt-0">
                <div className="flex flex-col gap-4 pt-2 flex-1">
                  <p className="text-xs text-muted-foreground">
                    Describe the changes you'd like. The AI will regenerate this email based on your instructions.
                  </p>
                  <Textarea
                    placeholder="e.g. Make the tone more formal, add a discount code section..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="min-h-[140px] flex-1 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitEdit}
                    disabled={!editPrompt.trim() || isEditing}
                    className="w-full"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const { generatedEmails, prompt, setStep, updateEmailHtml } = useCampaignStore();
  const { addCampaign } = useCampaignsStore();
  const [selectedEmail, setSelectedEmail] = useState<GeneratedEmail | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (generatedEmails.length === 0) {
    navigate("/create");
    return null;
  }

  const handleSave = () => {
    setIsSaving(true);
    const id = crypto.randomUUID();
    // Derive a campaign name from the first ~60 chars of the prompt
    const name =
      prompt.trim().slice(0, 60).trim() +
      (prompt.trim().length > 60 ? "…" : "");
    addCampaign({
      id,
      name: name || "Untitled Campaign",
      status: "draft",
      createdAt: new Date().toISOString(),
      prompt: prompt.trim(),
      emails: generatedEmails,
      approvals: {},
      emailAssignments: {},
    });
    setStep(1);
    navigate(`/campaigns/${id}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-3"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Review Your <span className="gradient-text">Campaign</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Click any email to edit. Review AI analysis and make adjustments before sending.
        </p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {generatedEmails.map((email, index) => (
          <EmailPreviewCard
            key={email.id}
            email={email}
            index={index}
            onClick={() => setSelectedEmail(email)}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          className="h-11 px-8 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Save Campaign
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </motion.div>

      <EmailEditorModal
        email={selectedEmail}
        open={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onHtmlUpdated={(id, html) => {
          updateEmailHtml(id, html);
          // Refresh selected email reference
          setSelectedEmail((prev) =>
            prev?.id === id ? { ...prev, htmlContent: html } : prev
          );
        }}
      />
    </div>
  );
}
