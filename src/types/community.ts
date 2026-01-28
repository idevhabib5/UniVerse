export type CommunityType = 'general' | 'study_help' | 'interest' | 'gaming' | 'tech' | 'creative';

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  community_type: CommunityType;
  is_private: boolean;
  member_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  joined_at: string;
}

export interface CommunityRule {
  id: string;
  community_id: string;
  rule_number: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityBan {
  id: string;
  community_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface Post {
  id: string;
  community_id: string;
  user_id: string;
  title: string;
  content: string | null;
  post_type: 'discussion' | 'question' | 'announcement' | 'link';
  link_url: string | null;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  community?: {
    name: string;
    slug: string;
  } | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
}

export interface ChatMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface PostVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: -1 | 1;
  created_at: string;
}
