import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, ArrowLeft, Loader2, Search, Image as ImageIcon, Link as LinkIcon, Mic, MicOff, X, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  otherUser: Profile;
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread: boolean;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'link';
  media_url?: string | null;
  media_thumbnail_url?: string | null;
  link_preview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  } | null;
}

interface DirectMessageSheetProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultConversationId?: string;
  onOpenChange?: (open: boolean) => void;
}

const DirectMessageSheet = ({ 
  children, 
  defaultOpen = false, 
  defaultConversationId,
  onOpenChange 
}: DirectMessageSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (open && user) {
      fetchConversations();
    }
  }, [open, user]);

  // Handle default conversation ID - auto-select conversation when opened from profile
  useEffect(() => {
    if (defaultConversationId && conversations.length > 0 && !selectedConversation) {
      const conv = conversations.find(c => c.id === defaultConversationId);
      if (conv) {
        setSelectedConversation(conv);
      } else {
        // Conversation not in list yet, fetch it directly
        loadConversationById(defaultConversationId);
      }
    }
  }, [defaultConversationId, conversations]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setSelectedConversation(null);
      setMessages([]);
    }
  };

  const loadConversationById = async (conversationId: string) => {
    if (!user) return;

    // Get conversation participants
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    const otherUserId = participants?.find(p => p.user_id !== user.id)?.user_id;
    
    if (otherUserId) {
      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", otherUserId)
        .single();

      const { data: convData } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (convData && otherProfile) {
        const conv: Conversation = {
          id: convData.id,
          created_at: convData.created_at,
          updated_at: convData.updated_at,
          otherUser: otherProfile,
          unread: false,
        };
        setSelectedConversation(conv);
      }
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    // Get all conversation IDs where user is a participant
    const { data: participantData } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participantData || participantData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participantData.map(p => p.conversation_id);

    // Get conversations
    const { data: convData } = await supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false });

    if (!convData) {
      setLoading(false);
      return;
    }

    // Get all participants for these conversations
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, last_read_at")
      .in("conversation_id", conversationIds);

    // Get other user profiles
    const otherUserIds = allParticipants
      ?.filter(p => p.user_id !== user.id)
      .map(p => p.user_id) || [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", otherUserIds);

    // Get last message for each conversation
    const { data: lastMessages } = await supabase
      .from("direct_messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    // Build conversation list
    const conversationList: Conversation[] = convData.map(conv => {
      const otherParticipant = allParticipants?.find(
        p => p.conversation_id === conv.id && p.user_id !== user.id
      );
      const myParticipant = allParticipants?.find(
        p => p.conversation_id === conv.id && p.user_id === user.id
      );
      const otherProfile = profiles?.find(p => p.id === otherParticipant?.user_id);
      const lastMessage = lastMessages?.find(m => m.conversation_id === conv.id);

      const unread = lastMessage && myParticipant?.last_read_at
        ? new Date(lastMessage.created_at) > new Date(myParticipant.last_read_at)
        : !!lastMessage && !myParticipant?.last_read_at;

      return {
        id: conv.id,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        otherUser: otherProfile || { id: "", username: null, full_name: "Unknown User", avatar_url: null },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          sender_id: lastMessage.sender_id,
        } : undefined,
        unread,
      };
    });

    setConversations(conversationList);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (data) {
      setMessages(data);
    }

    // Mark as read
    if (user) {
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if it's not from current user
          if (user && newMessage.sender_id !== user.id) {
            supabase
              .from("conversation_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId)
              .eq("user_id", user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Detect URLs in text
  const detectLinks = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Fetch link preview metadata
  const fetchLinkPreview = async (url: string) => {
    try {
      // In a real app, you'd call a backend API to fetch link preview
      // For now, we'll just extract basic info
      return {
        url,
        title: new URL(url).hostname,
        description: null,
        image: null,
      };
    } catch {
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !user) return;
    
    const messageText = newMessage.trim();
    const links = detectLinks(messageText);
    let messageType: 'text' | 'link' = 'text';
    let linkPreview = null;

    // If message contains links, fetch preview
    if (links.length > 0) {
      messageType = 'link';
      linkPreview = await fetchLinkPreview(links[0]);
    }

    if (!messageText && !audioBlob) return;

    setSending(true);

    try {
      let mediaUrl = null;
      let mediaThumbnailUrl = null;
      let finalMessageType = messageType;

      // Handle audio upload
      if (audioBlob) {
        finalMessageType = 'audio';
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const filePath = `${user.id}/${selectedConversation.id}/${Date.now()}-${audioFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("dm-media")
          .upload(filePath, audioFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("dm-media")
            .getPublicUrl(filePath);
          mediaUrl = publicUrl;
        }
      }

      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: messageText || (audioBlob ? "Voice message" : ""),
        message_type: finalMessageType,
        media_url: mediaUrl,
        media_thumbnail_url: mediaThumbnailUrl,
        link_preview: linkPreview,
      });

      if (error) {
        console.error("Error sending message:", error);
        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: error.message || "Please try again.",
        });
      } else {
        setNewMessage("");
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", selectedConversation.id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }

    setSending(false);
  };

  const handleMediaUpload = async (file: File) => {
    if (!selectedConversation || !user) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      return;
    }

    setUploadingMedia(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${selectedConversation.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("dm-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("dm-media")
        .getPublicUrl(filePath);

      let thumbnailUrl = null;
      if (isVideo) {
        // For videos, we'd generate a thumbnail (simplified here)
        thumbnailUrl = publicUrl;
      } else {
        thumbnailUrl = publicUrl;
      }

      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: "",
        message_type: isImage ? 'image' : 'video',
        media_url: publicUrl,
        media_thumbnail_url: thumbnailUrl,
      });

      if (!error) {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", selectedConversation.id);
      }
    } catch (error) {
      console.error("Error uploading media:", error);
    }

    setUploadingMedia(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream?.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
    setMediaRecorder(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const playAudio = (messageId: string, audioUrl: string) => {
    if (playingAudioId === messageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      setPlayingAudioId(messageId);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        audioRef.current.onended = () => setPlayingAudioId(null);
      }
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    
    // Search by full_name first (most users have this)
    const { data: byName } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .ilike("full_name", `%${query}%`)
      .neq("id", user?.id || "")
      .limit(10);

    // Also search by username for those who have it set
    const { data: byUsername } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .not("username", "is", null)
      .ilike("username", `%${query}%`)
      .neq("id", user?.id || "")
      .limit(10);

    // Combine and deduplicate results
    const combined = [...(byName || [])];
    byUsername?.forEach(profile => {
      if (!combined.find(p => p.id === profile.id)) {
        combined.push(profile);
      }
    });

    setSearchResults(combined.slice(0, 10));
    setSearching(false);
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

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
          .eq("user_id", otherUserId)
          .maybeSingle();

        if (otherParticipant) {
          // Conversation exists, load it
          const existingConv = conversations.find(c => c.id === conv.conversation_id);
          if (existingConv) {
            setSelectedConversation(existingConv);
            setShowNewChat(false);
            setSearchQuery("");
            setSearchResults([]);
            return;
          } else {
            // Conversation exists but not in list, load it
            await loadConversationById(conv.conversation_id);
            setShowNewChat(false);
            setSearchQuery("");
            setSearchResults([]);
            return;
          }
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
      console.error("Error creating conversation:", convError);
      return;
    }

    // Add participants
    const { error: partError } = await supabase.from("conversation_participants").insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    if (partError) {
      console.error("Error adding participants:", partError);
      return;
    }

    // Get other user profile
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", otherUserId)
      .single();

    const newConversation: Conversation = {
      id: newConv.id,
      created_at: newConv.created_at,
      updated_at: newConv.updated_at,
      otherUser: otherProfile || { id: otherUserId, username: null, full_name: "Unknown User", avatar_url: null },
      unread: false,
    };

    setConversations(prev => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
    setShowNewChat(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const unreadCount = conversations.filter(c => c.unread).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {selectedConversation ? (
          // Chat View
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                    fetchConversations();
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedConversation.otherUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(selectedConversation.otherUser.full_name || selectedConversation.otherUser.username)}
                  </AvatarFallback>
                </Avatar>
                <SheetTitle className="text-left">
                  {selectedConversation.otherUser.full_name || selectedConversation.otherUser.username || "User"}
                </SheetTitle>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.sender_id === user?.id ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2",
                        message.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      )}
                    >
                      {/* Media Display */}
                      {message.media_url && (
                        <div className="mb-2">
                          {message.message_type === 'image' && (
                            <img
                              src={message.media_url}
                              alt="Shared image"
                              className="max-w-full rounded-lg max-h-64 object-cover"
                            />
                          )}
                          {message.message_type === 'video' && (
                            <video
                              src={message.media_url}
                              controls
                              className="max-w-full rounded-lg max-h-64"
                            />
                          )}
                          {message.message_type === 'audio' && (
                            <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => playAudio(message.id, message.media_url!)}
                              >
                                {playingAudioId === message.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              <span className="text-xs">Voice message</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link Preview */}
                      {message.link_preview && (
                        <a
                          href={message.link_preview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                        >
                          {message.link_preview.image && (
                            <img
                              src={message.link_preview.image}
                              alt={message.link_preview.title}
                              className="w-full rounded mb-2 max-h-32 object-cover"
                            />
                          )}
                          <p className="font-semibold text-sm">{message.link_preview.title}</p>
                          {message.link_preview.description && (
                            <p className="text-xs opacity-80 mt-1 line-clamp-2">
                              {message.link_preview.description}
                            </p>
                          )}
                          <p className="text-xs opacity-60 mt-1 truncate">{message.link_preview.url}</p>
                        </a>
                      )}

                      {/* Text Content */}
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      
                      <p className={cn(
                        "text-[10px] mt-1",
                        message.sender_id === user?.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <audio ref={audioRef} className="hidden" />
            </ScrollArea>

            <div className="p-4 border-t">
              {/* Audio Preview */}
              {audioUrl && (
                <div className="mb-2 p-2 bg-secondary rounded-lg flex items-center gap-2">
                  <audio src={audioUrl} controls className="flex-1 h-8" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={cancelRecording}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <div className="flex-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia || recording}
                  >
                    {uploadingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(file);
                      e.target.value = '';
                    }}
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn("h-9 w-9", recording && "bg-destructive text-destructive-foreground")}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    disabled={uploadingMedia || sending}
                  >
                    {recording ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>

                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    disabled={recording}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={(!newMessage.trim() && !audioBlob) || sending || recording}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : showNewChat ? (
          // New Chat View
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNewChat(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <SheetTitle>New Message</SheetTitle>
              </div>
            </SheetHeader>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {searching ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => startConversation(profile.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(profile.full_name || profile.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium">{profile.full_name || profile.username || "User"}</p>
                        {profile.username && (
                          <p className="text-sm text-muted-foreground">@{profile.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  Search for users to start a conversation
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          // Conversations List
          <>
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Messages</SheetTitle>
                <Button size="sm" onClick={() => setShowNewChat(true)}>
                  New Chat
                </Button>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center p-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <Button className="mt-4" onClick={() => setShowNewChat(true)}>
                    Start a Conversation
                  </Button>
                </div>
              ) : (
                <div className="p-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors",
                        conv.unread && "bg-primary/5"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.otherUser.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(conv.otherUser.full_name || conv.otherUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unread && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("font-medium truncate", conv.unread && "text-primary")}>
                            {conv.otherUser.full_name || conv.otherUser.username || "User"}
                          </p>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className={cn(
                            "text-sm truncate",
                            conv.unread ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {conv.lastMessage.sender_id === user?.id && "You: "}
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DirectMessageSheet;
