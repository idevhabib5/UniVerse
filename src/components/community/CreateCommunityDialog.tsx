import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { CommunityType } from "@/types/community";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name must be less than 50 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters").max(30, "Slug must be less than 30 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and dashes"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  community_type: z.enum(['general', 'study_help', 'interest', 'gaming', 'tech', 'creative']),
  is_private: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCommunityDialogProps {
  children: React.ReactNode;
}

const CreateCommunityDialog = ({ children }: CreateCommunityDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      community_type: "general",
      is_private: false,
    },
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!form.getValues("slug") || form.getValues("slug") === generateSlug(form.getValues("name").slice(0, -1))) {
      form.setValue("slug", generateSlug(value));
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please sign in to create a community.",
      });
      return;
    }

    setIsSubmitting(true);

    // Create the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .insert({
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        community_type: values.community_type as CommunityType,
        is_private: values.is_private,
        created_by: user.id,
      })
      .select()
      .single();

    if (communityError) {
      console.error("Error creating community:", communityError);
      toast({
        variant: "destructive",
        title: "Error",
        description: communityError.message.includes("unique") 
          ? "A community with this name or slug already exists." 
          : "Failed to create community. Please try again.",
      });
      setIsSubmitting(false);
      return;
    }

    // Join as owner
    await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: "owner",
      });

    toast({
      title: "Community created! 🎉",
      description: `Welcome to c/${values.slug}`,
    });

    setOpen(false);
    form.reset();
    setIsSubmitting(false);
    navigate(`/c/${values.slug}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Create a Community
          </DialogTitle>
          <DialogDescription>
            Build a space for people who share your interests.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Web Developers Hub" 
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground mr-2">c/</span>
                      <Input placeholder="web-dev" {...field} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    This will be your community's unique URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What's your community about?"
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="community_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="study_help">Study Help</SelectItem>
                      <SelectItem value="interest">Interest</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_private"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Private Community</FormLabel>
                    <FormDescription>
                      Only members can see posts and chat.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Community
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityDialog;
