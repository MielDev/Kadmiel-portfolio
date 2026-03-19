export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  content: string;
  status?: string;
  created_at?: string;
}
