import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "@/types/community";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Smile, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯'];

interface ChatRoomProps {
  communityId: string;
  className?: string;
}

const ChatRoom = ({ communityId, className }: ChatRoomProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        *,
        profiles:user_id (full_name, username, avatar_url)
      `)
      .eq("community_id", communityId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error && data) {
      const transformed = data.map((msg: any) => ({
        ...msg,
        profiles: msg.profiles || null,
      }));
      setMessages(transformed);
    }
    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!newMessage.trim()) return;
    
    setSending(true);

    const { error } = await supabase.from("chat_messages").insert({
      community_id: communityId,
      user_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
    }

    setSending(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if reaction exists
    const { data: existing } = await supabase
      .from("message_reactions")
      .select()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Add reaction
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }

    setShowEmojiPicker(null);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">Live Chat</h3>
        <p className="text-xs text-muted-foreground">Chat with community members in real-time</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to say hello! 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.user_id === user?.id;
              const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
              
              return (
                <div key={message.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={message.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(message.profiles?.full_name || message.profiles?.username)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  
                  <div className={cn("flex flex-col max-w-[75%]", isOwn && "items-end")}>
                    {showAvatar && (
                      <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
                        <span className="text-sm font-medium text-foreground">
                          {message.profiles?.full_name || message.profiles?.username || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    
                    <div className="group relative">
                      <div className={cn(
                        "px-4 py-2 rounded-2xl text-sm",
                        isOwn 
                          ? "bg-primary text-primary-foreground rounded-br-md" 
                          : "bg-muted text-foreground rounded-bl-md"
                      )}>
                        {message.content}
                      </div>
                      
                      {/* Reaction Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute -right-8 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                          isOwn && "right-auto -left-8"
                        )}
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                      >
                        <Smile className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker === message.id && (
                        <div className={cn(
                          "absolute top-8 z-10 flex gap-1 p-2 bg-popover rounded-lg shadow-lg border border-border",
                          isOwn ? "right-0" : "left-0"
                        )}>
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              className="hover:scale-125 transition-transform text-lg"
                              onClick={() => handleReaction(message.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user ? "Type a message..." : "Sign in to chat"}
            disabled={!user || sending}
            className="flex-1"
            maxLength={2000}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!user || sending || !newMessage.trim()}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatRoom;
