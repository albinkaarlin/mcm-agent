import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Plus, Send, Trash2, Users, CheckCircle2, Loader2, List, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCampaignStore } from "@/lib/campaign-store";
import { useMailListStore, type MailList } from "@/lib/mail-list-store";
import { sendEmails } from "@/lib/mock-api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function SendPage() {
  const navigate = useNavigate();
  const { generatedEmails, emailAssignments, setRecipients, reset } = useCampaignStore();
  const { lists, addList, removeList } = useMailListStore();
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmails, setNewListEmails] = useState("");
  const [selectedLists, setSelectedLists] = useState<Record<string, string[]>>({});

  if (generatedEmails.length === 0) {
    navigate("/");
    return null;
  }

  const handleAddRecipients = (emailId: string, value: string) => {
    const emails = value
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    setRecipients(emailId, emails);
  };

  const handleToggleList = (emailId: string, listId: string) => {
    setSelectedLists((prev) => {
      const current = prev[emailId] || [];
      const isSelected = current.includes(listId);
      const updated = isSelected
        ? current.filter((id) => id !== listId)
        : [...current, listId];

      const allEmails = lists
        .filter((l) => updated.includes(l.id))
        .flatMap((l) => l.emails);
      setRecipients(emailId, Array.from(new Set(allEmails)));

      return { ...prev, [emailId]: updated };
    });
  };

  const handleCreateList = () => {
    const emails = newListEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (!newListName.trim()) {
      toast({ title: "Name required", description: "Give your list a name.", variant: "destructive" });
      return;
    }
    if (emails.length === 0) {
      toast({ title: "No emails", description: "Add at least one email address.", variant: "destructive" });
      return;
    }

    addList({ id: crypto.randomUUID(), name: newListName.trim(), emails });
    toast({ title: "List created", description: `"${newListName.trim()}" saved with ${emails.length} addresses.` });
    setNewListName("");
    setNewListEmails("");
    setShowCreateList(false);
  };

  const totalRecipients = Object.values(emailAssignments).reduce(
    (acc, r) => acc + r.length,
    0
  );

  const handleSend = async () => {
    const assignments = Object.entries(emailAssignments)
      .filter(([_, recipients]) => recipients.length > 0)
      .map(([emailId, recipients]) => ({ emailId, recipients }));

    if (assignments.length === 0) {
      toast({
        title: "No recipients",
        description: "Add at least one recipient to an email before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmails(assignments);
      if (result.success) {
        setSent(true);
        toast({ title: "Campaign sent!", description: result.message });
      }
    } catch {
      toast({
        title: "Send failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-foreground">Campaign Sent! 🎉</h1>
          <p className="text-sm text-muted-foreground">
            {totalRecipients} emails have been queued for delivery.
          </p>
        </motion.div>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            navigate("/");
          }}
        >
          Create New Campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-3"
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Send Your <span className="gradient-text">Campaign</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Assign recipients to each email and send your campaign.
        </p>
      </motion.div>

      <div className="flex justify-end">
        <Button variant="outline" className="text-xs h-9" onClick={() => setShowCreateList(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create Mail List
        </Button>
      </div>

      <div className="space-y-4">
        {generatedEmails.map((email, index) => (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="border-border">
              <CardHeader className="pb-3 px-5 pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold">{email.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {email.summary.targetGroup}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-display">
                    <Users className="h-3 w-3" />
                    {emailAssignments[email.id]?.length || 0}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="manual" className="flex-1 text-xs">
                      <Mail className="h-3 w-3 mr-1.5" />
                      Manual
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex-1 text-xs">
                      <List className="h-3 w-3 mr-1.5" />
                      Mail List
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual" className="mt-3">
                    <Textarea
                      placeholder="Enter email addresses separated by commas or new lines..."
                      className="min-h-[80px] text-xs"
                      value={emailAssignments[email.id]?.join(", ") || ""}
                      onChange={(e) => handleAddRecipients(email.id, e.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="list" className="mt-3">
                    {lists.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <p className="text-xs text-muted-foreground">No mail lists yet.</p>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCreateList(true)}>
                          <Plus className="h-3 w-3" />
                          Create One
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between text-xs">
                              <span className="truncate">
                                {(selectedLists[email.id]?.length || 0) > 0
                                  ? `${selectedLists[email.id].length} list${selectedLists[email.id].length > 1 ? "s" : ""} selected`
                                  : "Select mail lists..."}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border z-50" align="start">
                            <div className="max-h-48 overflow-y-auto p-1">
                              {lists.map((list) => {
                                const isChecked = selectedLists[email.id]?.includes(list.id) ?? false;
                                return (
                                  <button
                                    key={list.id}
                                    type="button"
                                    className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                                    onClick={() => handleToggleList(email.id, list.id)}
                                  >
                                    <Checkbox checked={isChecked} className="pointer-events-none" />
                                    <span className="flex-1 text-left">{list.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono-display">
                                      {list.emails.length}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {(emailAssignments[email.id]?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {emailAssignments[email.id].map((addr, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] rounded px-2 py-0.5">
                                {addr}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary & Send */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Campaign Summary</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {generatedEmails.length} emails · {totalRecipients} total recipients
                </p>
              </div>
              <Button
                size="lg"
                className="h-11 px-8 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSend}
                disabled={isSending || totalRecipients === 0}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Campaign
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Mail List Dialog */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold">Create Mail List</DialogTitle>
            <DialogDescription className="text-xs">
              Save a reusable list of email addresses for future campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">List Name</label>
              <Input
                placeholder="e.g. Nordic Clients"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Email Addresses</label>
              <Textarea
                placeholder="Enter email addresses separated by commas or new lines..."
                className="min-h-[120px] text-xs"
                value={newListEmails}
                onChange={(e) => setNewListEmails(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="text-xs" onClick={() => setShowCreateList(false)}>
                Cancel
              </Button>
              <Button className="text-xs" onClick={handleCreateList}>
                <Plus className="h-3.5 w-3.5" />
                Save List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
