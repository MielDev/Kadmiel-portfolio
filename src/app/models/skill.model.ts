export interface Skill {
  id: number;
  title: string;
  description: string;
  icon: string;
  technologies: string[];
  created_at?: string;
  // Les champs suivants sont conservés pour la compatibilité avec le CV interactif si nécessaire
  proficiency?: number;
  category?: string;
}
