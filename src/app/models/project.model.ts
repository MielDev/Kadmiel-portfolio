export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  github_url: string;
  demo_url: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
  // Champs optionnels pour la compatibilité UI si nécessaire
  status?: 'live' | 'pause' | 'archive';
  year?: string;
  views?: number;
  cat?: string;
  emoji?: string;
  bg?: string;
}
