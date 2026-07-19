export interface NewsPost {
  id: string;
  title: string;
  content: string;
  date: string; // ISO string
  author: string;
}

export type StaffRole = 'admin' | 'moderator' | 'helper' | 'developer';
export type StaffCategory = 'private_server' | 'discord_moderation';

export interface StaffMember {
  id: string;
  nickname: string;
  role: string;
  category: StaffCategory;
  avatarUrl?: string;
  socialLink?: string;
  order: number;
}

export interface ServerStats {
  accounts: number;
  levels: number;
  rates: number;
  songs: number;
}
