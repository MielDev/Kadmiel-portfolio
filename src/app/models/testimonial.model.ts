export interface Testimonial {
  id?: number;
  name: string;
  role: string;
  company: string;
  content: string;
  photo?: string | null;
  status: 'published' | 'pending';
  created_at?: string;
}
