import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DirectMessageSheet from "./DirectMessageSheet";

interface StartChatButtonProps {
  targetUserId: string;
  targetUserName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const StartChatButton = ({ 
  targetUserId, 
  targetUserName,
  variant = "outline",
  size = "sm",
  className
}: StartChatButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: "Cannot message yourself",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if conversation already exists
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvs) {
        for (const conv of myConvs) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .eq("user_id", targetUserId)
            .maybeSingle();

          if (otherParticipant) {
            // Conversation exists
            setConversationId(conv.conversation_id);
            setSheetOpen(true);
            setLoading(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError || !newConv) {
        throw new Error("Failed to create conversation");
      }

      // Add participants
      const { error: partError } = await supabase.from("conversation_participants").insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: targetUserId },
      ]);

      if (partError) {
        throw new Error("Failed to add participants");
      }

      setConversationId(newConv.id);
      setSheetOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleStartChat}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4 mr-1" />
        )}
        Message
      </Button>
      
      {sheetOpen && conversationId && (
        <DirectMessageSheet 
          defaultOpen={true}
          defaultConversationId={conversationId}
          onOpenChange={setSheetOpen}
        >
          <span className="hidden" />
        </DirectMessageSheet>
      )}
    </>
  );
};

export default StartChatButton;
