export interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  read_minutes: number;
  image: string | null;
  tags: string[];
  status: 'draft' | 'published';
  created_at: string;
}
