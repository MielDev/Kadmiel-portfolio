export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  github_url: string;
  demo_url: string;
  tags: string[];
  tasks: string[];
  created_at: string;
}
