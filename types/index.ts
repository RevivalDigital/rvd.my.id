export type UserRole = "admin" | "developer" | "social_media_manager" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bio?: string;
  avatar?: string;
  is_online: boolean;
  notification_prefs?: Record<string, boolean>;
  created: string;
  updated: string;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "feature" | "bug" | "content" | "design" | "devops" | "research";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type?: TaskType;
  project?: string;
  assignee?: string;
  assignees?: string[];
  created_by?: string;
  due_date?: string;
  sort_order?: number;
  tags?: string[];
  attachments?: string[];
  created: string;
  updated: string;
  expand?: {
    assignee?: User | User[];
    project?: Project;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "active" | "on_hold" | "completed" | "archived";
  color?: string;
  owner?: string;
  members?: string[];
  due_date?: string;
  created: string;
  updated: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: "feature_release" | "social_post" | "meeting" | "deadline" | "maintenance" | "review";
  start_at: string;
  end_at?: string;
  all_day: boolean;
  color?: string;
  created_by?: string;
  attendees?: string[];
  related_task?: string;
  created: string;
  updated: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  channel: "general" | "dev" | "social" | "design" | "urgent" | "random";
  sender: string;
  reply_to?: string;
  is_pinned: boolean;
  reactions?: Record<string, string[]>;
  attachments?: string[];
  created: string;
  updated: string;
  expand?: { sender?: User };
}

export interface FileRecord {
  id: string;
  name: string;
  description?: string;
  category: "design" | "document" | "image" | "video" | "code" | "other";
  file: string;
  uploaded_by?: string;
  project?: string;
  version?: string;
  tags?: string[];
  created: string;
  updated: string;
  expand?: { uploaded_by?: User };
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  severity: "info" | "warning" | "error" | "success";
  recipient: string;
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  created: string;
}

export interface SocialPost {
  id: string;
  caption: string;
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  scheduled_at?: string;
  published_at?: string;
  media?: string[];
  hashtags?: string[];
  analytics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    reach?: number;
    impressions?: number;
  };
  created_by?: string;
  created: string;
  updated: string;
}

export interface SiteHealth {
  id: string;
  url: string;
  name: string;
  status: "up" | "down" | "degraded" | "unknown";
  response_time_ms?: number;
  status_code?: number;
  uptime_percent?: number;
  pagespeed_data?: {
    performance?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  };
  last_checked?: string;
  created: string;
  updated: string;
}

export interface GitActivity {
  id: string;
  repo: string;
  type: "commit" | "pull_request" | "merge" | "issue" | "release" | "deploy";
  message: string;
  author?: string;
  branch?: string;
  sha?: string;
  url?: string;
  pr_status?: "open" | "closed" | "merged" | "draft";
  created: string;
  updated: string;
}
