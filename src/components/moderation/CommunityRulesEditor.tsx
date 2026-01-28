import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CommunityRule } from "@/types/community";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Loader2,
  ScrollText,
  Pencil
} from "lucide-react";

interface CommunityRulesEditorProps {
  communityId: string;
  children: React.ReactNode;
}

const CommunityRulesEditor = ({ communityId, children }: CommunityRulesEditorProps) => {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<CommunityRule | null>(null);
  const [newRule, setNewRule] = useState({ title: "", description: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open, communityId]);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_rules")
      .select("*")
      .eq("community_id", communityId)
      .order("rule_number", { ascending: true });

    if (data) {
      setRules(data as CommunityRule[]);
    }
    setLoading(false);
  };

  const handleAddRule = async () => {
    if (!newRule.title.trim()) return;

    const nextNumber = rules.length > 0 
      ? Math.max(...rules.map(r => r.rule_number)) + 1 
      : 1;

    const { error } = await supabase.from("community_rules").insert({
      community_id: communityId,
      rule_number: nextNumber,
      title: newRule.title,
      description: newRule.description || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rule added" });
      setNewRule({ title: "", description: "" });
      setShowAddForm(false);
      fetchRules();
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    const { error } = await supabase
      .from("community_rules")
      .update({
        title: editingRule.title,
        description: editingRule.description,
      })
      .eq("id", editingRule.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rule updated" });
      setEditingRule(null);
      fetchRules();
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const { error } = await supabase
      .from("community_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rule deleted" });
      fetchRules();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Community Rules
          </DialogTitle>
          <DialogDescription>
            Set rules to help members understand community expectations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 && !showAddForm ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No rules set yet</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-3">
                    {editingRule?.id === rule.id ? (
                      <div className="space-y-3">
                        <Input
                          value={editingRule.title}
                          onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                          placeholder="Rule title"
                        />
                        <Textarea
                          value={editingRule.description || ""}
                          onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                          placeholder="Description (optional)"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateRule}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-primary shrink-0">
                          {rule.rule_number}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{rule.title}</p>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {showAddForm ? (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <Input
                      value={newRule.title}
                      onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                      placeholder="Rule title"
                    />
                    <Textarea
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      placeholder="Description (optional)"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddRule} disabled={!newRule.title.trim()}>
                        Add Rule
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowAddForm(false);
                        setNewRule({ title: "", description: "" });
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommunityRulesEditor;
