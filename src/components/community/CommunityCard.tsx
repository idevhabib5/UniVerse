import { Community } from "@/types/community";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, Gamepad2, Code, Palette, BookOpen, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const communityTypeIcons = {
  general: Globe,
  study_help: BookOpen,
  interest: Sparkles,
  gaming: Gamepad2,
  tech: Code,
  creative: Palette,
};

interface CommunityCardProps {
  community: Community;
}

const CommunityCard = ({ community }: CommunityCardProps) => {
  const navigate = useNavigate();
  const Icon = communityTypeIcons[community.community_type] || Globe;
  
  return (
    <Card 
      className="group hover:border-muted-foreground/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/c/${community.slug}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Community Icon */}
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {community.icon_url ? (
              <img 
                src={community.icon_url} 
                alt={community.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Icon className="w-6 h-6 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                c/{community.slug}
              </h3>
            </div>
            
            {community.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {community.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {community.member_count.toLocaleString()} members
              </span>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {community.community_type.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Join Button */}
          <Button 
            size="sm" 
            className="shrink-0 h-8"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/c/${community.slug}`);
            }}
          >
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityCard;
