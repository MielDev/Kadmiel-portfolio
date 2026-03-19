export interface TechnicalLevel {
  id: number;
  type: 'hard' | 'soft';
  title: string;
  description: string | null;
  percent: number | null;
  icon: string | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
}

