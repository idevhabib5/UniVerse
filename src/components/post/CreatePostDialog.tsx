import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PenLine, Link as LinkIcon, HelpCircle, Megaphone } from "lucide-react";

const baseSchema = {
  title: z.string().min(5, "Title must be at least 5 characters").max(300, "Title must be less than 300 characters"),
};

const discussionSchema = z.object({
  ...baseSchema,
  content: z.string().max(40000, "Content must be less than 40000 characters").optional(),
});

const linkSchema = z.object({
  ...baseSchema,
  link_url: z.string().url("Please enter a valid URL"),
});

interface CreatePostDialogProps {
  children: React.ReactNode;
  communityId: string;
  communitySlug: string;
  onPostCreated?: () => void;
}

const CreatePostDialog = ({ children, communityId, communitySlug, onPostCreated }: CreatePostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postType, setPostType] = useState<'discussion' | 'question' | 'link' | 'announcement'>('discussion');
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(postType === 'link' ? linkSchema : discussionSchema),
    defaultValues: {
      title: "",
      content: "",
      link_url: "",
    },
  });

  const onSubmit = async (values: any) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to create a post.",
      });
      return;
    }

    setIsSubmitting(true);

    const postData: any = {
      community_id: communityId,
      user_id: user.id,
      title: values.title,
      post_type: postType,
    };

    if (postType === 'link') {
      postData.link_url = values.link_url;
    } else {
      postData.content = values.content || null;
    }

    const { error } = await supabase.from("posts").insert(postData);

    if (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create post. Please try again.",
      });
    } else {
      toast({
        title: "Post created! 🎉",
        description: "Your post is now live.",
      });
      setOpen(false);
      form.reset();
      onPostCreated?.();
    }

    setIsSubmitting(false);
  };

  const handleTabChange = (value: string) => {
    setPostType(value as any);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Create a Post in c/{communitySlug}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={postType} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discussion" className="gap-2">
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Post</span>
            </TabsTrigger>
            <TabsTrigger value="question" className="gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Question</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Announce</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={
                          postType === 'question' 
                            ? "What would you like to know?" 
                            : postType === 'link'
                            ? "Give your link a title"
                            : "What's on your mind?"
                        }
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TabsContent value="discussion" className="mt-0">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your thoughts..."
                          className="min-h-[200px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="question" className="mt-0">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide more context for your question..."
                          className="min-h-[200px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="link" className="mt-0">
                <FormField
                  control={form.control}
                  name="link_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://..."
                          type="url"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="announcement" className="mt-0">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Announcement</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Share your announcement..."
                          className="min-h-[200px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="hero" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
