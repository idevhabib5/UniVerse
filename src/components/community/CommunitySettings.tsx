import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Community } from "@/types/community";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  Camera, 
  ImageIcon, 
  Save, 
  Settings,
  Globe,
  BookOpen,
  Sparkles,
  Gamepad2,
  Code,
  Palette
} from "lucide-react";

const communityTypeIcons = {
  general: Globe,
  study_help: BookOpen,
  interest: Sparkles,
  gaming: Gamepad2,
  tech: Code,
  creative: Palette,
};

interface CommunitySettingsProps {
  community: Community;
  onUpdate: () => void;
  children: React.ReactNode;
}

const CommunitySettings = ({ community, onUpdate, children }: CommunitySettingsProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: community.name,
    description: community.description || "",
    icon_url: community.icon_url,
    banner_url: community.banner_url,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingIcon(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${community.id}/icon.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("community-images")
        .getPublicUrl(filePath);

      const iconUrl = `${publicUrl}?t=${Date.now()}`;
      setFormData((prev) => ({ ...prev, icon_url: iconUrl }));

      await supabase
        .from("communities")
        .update({ icon_url: iconUrl })
        .eq("id", community.id);

      toast({ title: "Icon updated", description: "Community icon has been updated." });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload icon.",
        variant: "destructive",
      });
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingBanner(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${community.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("community-images")
        .getPublicUrl(filePath);

      const bannerUrl = `${publicUrl}?t=${Date.now()}`;
      setFormData((prev) => ({ ...prev, banner_url: bannerUrl }));

      await supabase
        .from("communities")
        .update({ banner_url: bannerUrl })
        .eq("id", community.id);

      toast({ title: "Banner updated", description: "Community banner has been updated." });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload banner.",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("communities")
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq("id", community.id);

      if (error) throw error;

      toast({ title: "Settings saved", description: "Community settings have been updated." });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const Icon = communityTypeIcons[community.community_type] || Globe;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Community Settings
          </SheetTitle>
          <SheetDescription>
            Customize your community's appearance and information.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Banner Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Banner Image
            </Label>
            <div
              className="relative h-32 rounded-lg overflow-hidden bg-secondary cursor-pointer group"
              onClick={() => bannerInputRef.current?.click()}
            >
              {formData.banner_url ? (
                <img
                  src={formData.banner_url}
                  alt="Community banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 dark:from-primary dark:via-primary/95 dark:to-primary/90 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingBanner ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
                disabled={uploadingBanner}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: 1500x500px, max 5MB
            </p>
          </div>

          {/* Icon Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Community Icon
            </Label>
            <div className="flex items-center gap-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => iconInputRef.current?.click()}
              >
                <Avatar className="h-20 w-20 transition-opacity group-hover:opacity-80">
                  <AvatarImage src={formData.icon_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    <Icon className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingIcon ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconUpload}
                  disabled={uploadingIcon}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Square image, at least 200x200px</p>
                <p>Max file size: 2MB</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Community name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's your community about?"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.description.length}/500
              </p>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommunitySettings;
