export interface Experience {
  id: number;
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string[];
  current: number;
  created_at: string;
  type?: string;
  icon?: string;
  color?: string;
  digital_folder_url?: string | null;
  image?: string | null;
}
