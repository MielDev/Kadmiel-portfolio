import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { SettingsService } from '../../services/settings.service';

interface DocumentRow {
  title: string;
  type: string;
  date?: string;
  files: string[];
}

interface DocumentGroup {
  title: string;
  description: string;
  rows: DocumentRow[];
}

interface DigitalBlock {
  id: string;
  label: string;
  title: string;
  summary: string;
  groups: DocumentGroup[];
  skills: string[];
}

@Component({
  selector: 'app-digital-folder',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './digital-folder.component.html',
  styleUrl: './digital-folder.component.css',
})
export class DigitalFolderComponent implements OnInit, AfterViewInit {
  searchQuery = '';
  showScrollTop = false;

  @HostListener('window:scroll')
  onScroll() {
    this.showScrollTop = window.scrollY > 500;
    const bar = document.getElementById('dfScrollBar');
    if (bar) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    }
  }

  get filteredBlocks(): DigitalBlock[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.blocks;
    return this.blocks
      .map(block => ({
        ...block,
        groups: block.groups
          .map(group => ({
            ...group,
            rows: group.rows.filter(row =>
              row.title.toLowerCase().includes(q) ||
              row.type.toLowerCase().includes(q) ||
              row.files.some(f => f.toLowerCase().includes(q))
            ),
          }))
          .filter(group => group.rows.length > 0),
      }))
      .filter(block => block.groups.length > 0 ||
        block.title.toLowerCase().includes(q) ||
        block.label.toLowerCase().includes(q));
  }

  scrollToTop(): void { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  readonly stats = [
    { value: '4', label: 'parties du dossier' },
    { value: '61', label: 'éléments classés' },
    { value: '16', label: 'activités dans le bloc 2' },
    { value: '2025-2026', label: 'année de formation' },
  ];

  readonly blocks: DigitalBlock[] = [
    {
      id: 'bloc-1',
      label: 'Bloc 1',
      title: "Contribution à la présence en ligne de l'organisation",
      summary:
        "Documents liés aux bases du web, à HTML/CSS, à JavaScript, à Scrum et aux projets de présence en ligne.",
      groups: [
        {
          title: 'Cours et supports',
          description: 'Bases théoriques utilisées pour construire et structurer une présence web.',
          rows: [
            { title: 'HTML / CSS', type: 'Cours', files: ['Web\\HTML-CSS\\HTML.pdf'] },
            { title: 'Flexbox', type: 'Cours', files: ['Web\\HTML-CSS\\Flexbox.pdf'] },
            { title: 'Formulaires HTML', type: 'Cours', files: ['Web\\HTML-CSS\\Forms\\Cours-Forms.pdf'] },
            { title: 'JavaScript', type: 'Cours', files: ['Web\\Javascript\\Cours-JavaScript.pdf'] },
            { title: 'Scrum', type: 'Méthode projet', files: ['Scrum\\Scrum.pdf'] },
          ],
        },
        {
          title: 'Activités HTML / CSS',
          description: 'Travaux pratiques autour de la mise en page, des ressources et des styles.',
          rows: [
            {
              title: 'Flexbox',
              type: 'Activité / fichier HTML',
              files: ['Web\\HTML-CSS\\Activités\\Flexbox\\Act-flex.pdf', 'Web\\HTML-CSS\\Activités\\Flexbox\\act-flex.html'],
            },
            {
              title: 'Flottants',
              type: 'Activité / ressources',
              files: [
                'Web\\HTML-CSS\\Activités\\Flottants\\Notice.pdf',
                'Web\\HTML-CSS\\Activités\\Flottants\\Notice2.pdf',
                'Web\\HTML-CSS\\Activités\\Flottants\\flottants.zip',
              ],
            },
            {
              title: 'Personnalités',
              type: 'Activités / images',
              files: [
                'Web\\HTML-CSS\\Activités\\Personnalités\\Act1.pdf',
                'Web\\HTML-CSS\\Activités\\Personnalités\\Act1b.pdf',
                'Web\\HTML-CSS\\Activités\\Personnalités\\Act1c.pdf',
                'Web\\HTML-CSS\\Activités\\Personnalités\\images.zip',
              ],
            },
            {
              title: 'Pseudo-classes',
              type: 'Fichiers HTML / CSS',
              files: [
                'Web\\HTML-CSS\\Activités\\Pseudo-classes\\test.html',
                'Web\\HTML-CSS\\Activités\\Pseudo-classes\\test.css',
              ],
            },
            {
              title: 'Sports',
              type: 'Activité / ressources',
              files: [
                'Web\\HTML-CSS\\Activités\\Sports\\Sports.pdf',
                'Web\\HTML-CSS\\Activités\\Sports\\Sports2.pdf',
                'Web\\HTML-CSS\\Activités\\Sports\\jordan.png',
                'Web\\HTML-CSS\\Activités\\Sports\\Aboreto-Regular.ttf',
              ],
            },
          ],
        },
        {
          title: 'Activités JavaScript et projets',
          description: 'Exercices d’interaction et documents de conception pour deux projets web.',
          rows: [
            {
              title: 'Exercices JavaScript',
              type: 'Exercices / activités',
              files: ['Web\\Javascript\\Exercices.pdf', 'Web\\Javascript\\Balle.pdf', 'Web\\Javascript\\Chaines.pdf'],
            },
            {
              title: 'Couleur / heure',
              type: 'Fichiers HTML / JavaScript',
              files: ['Web\\Javascript\\color-hour.html', 'Web\\Javascript\\color.js'],
            },
            {
              title: 'Projet Freelance',
              type: 'Cahier des charges / logo',
              files: ['Projets\\Freelance\\Cahier des charges.pdf', 'Projets\\Freelance\\logo.png'],
            },
            {
              title: 'Projet Restaurant',
              type: 'Cahier des charges / logo',
              files: ['Projets\\Restaurant\\Cahier des charges.pdf', 'Projets\\Restaurant\\logo.png'],
            },
          ],
        },
      ],
      skills: [
        'Structurer une page avec HTML',
        'Mettre en forme avec CSS',
        'Découvrir JavaScript',
        'Lire un cahier des charges',
        'Participer à une démarche projet',
      ],
    },
    {
      id: 'bloc-2',
      label: 'Bloc 2',
      title: 'Participation à la gestion des services logiciels',
      summary:
        "Documents liés à la préparation d’un poste, aux services logiciels, au réseau, à GLPI et à la documentation technique.",
      groups: [
        {
          title: 'Système / matériel',
          description: 'Activités sur les composants, le montage, Windows 10 et la personnalisation du poste.',
          rows: [
            {
              title: "Activité 01 - Montage virtuel d'une unité centrale",
              type: 'Activité',
              date: '2025-09-02',
              files: ['01 - Système - Matériel\\Activité 01\\Activité 01.pdf'],
            },
            {
              title: "Activité 02 - Montage et démontage d'une unité centrale",
              type: 'Activité / modèle Excel',
              date: '2025-09-03',
              files: [
                '01 - Système - Matériel\\Activité 02\\Activité 02.pdf',
                '01 - Système - Matériel\\Activité 02\\Activité 02 - NOM Prénom.xlsx',
              ],
            },
            {
              title: "Activité 03 - Réponse à un appel d'offres",
              type: 'Activité / annexes / modèle',
              date: '2025-09-10',
              files: [
                '01 - Système - Matériel\\Activité 03\\Activité 03.pdf',
                '01 - Système - Matériel\\Activité 03\\Devis A03 - NOM Prénom.xlsx',
                '01 - Système - Matériel\\Activité 03\\ComCom Chinon Vienne et Loire\\CCAP.pdf',
                '01 - Système - Matériel\\Activité 03\\ComCom Chinon Vienne et Loire\\CCTP V1.pdf',
              ],
            },
            {
              title: "Activité 04 - Préparation d'un poste Windows 10",
              type: 'Activité / support',
              date: '2025-09-22',
              files: [
                '01 - Système - Matériel\\Activité 04\\Activité 04.pdf',
                '01 - Système - Matériel\\Activité 04\\Questions.pptx',
              ],
            },
            {
              title: 'Activité 05 - Personnalisation du poste de travail',
              type: 'Activité',
              date: '2025-09-29',
              files: ['01 - Système - Matériel\\Activité 05\\Activité 05.pdf'],
            },
          ],
        },
        {
          title: 'Services logiciels et réseaux',
          description: 'Installation de logiciels, dossier numérique, réseau domestique, TCP/IP, routage et DNS.',
          rows: [
            {
              title: "Activité 06 - Préparation d'un poste selon les besoins",
              type: 'Documentation technique',
              date: '2025-10-14',
              files: ['02 - Services logiciels\\Activité 06\\Activité 06.pdf'],
            },
            {
              title: 'Activité 07 - Étude comparative ePortfolio',
              type: 'Dossier numérique',
              date: '2025-11-03',
              files: ['02 - Services logiciels\\Activité 07\\Activité 07.pdf'],
            },
            {
              title: 'Activités réseau',
              type: 'Activités / synthèses',
              date: '2026-01',
              files: [
                '03 - Réseaux informatiques\\Activité 08\\Activité 08.pdf',
                '03 - Réseaux informatiques\\Activité 09\\Activité 09.docx',
                '03 - Réseaux informatiques\\Activité 09\\Activité 09 - corr.pdf',
                '03 - Réseaux informatiques\\Activité 10\\Activité 10.docx',
                '03 - Réseaux informatiques\\Synthèse - Les types de connexions.pdf',
                '03 - Réseaux informatiques\\Synthèse - Connexions à Internet.pdf',
              ],
            },
          ],
        },
        {
          title: 'Gestion de parc et documentation',
          description: 'Supports autour de GLPI, des incidents, de BookStack et des bases de connaissances.',
          rows: [
            {
              title: 'Activités 11 à 13 - Gestion de parc avec GLPI',
              type: 'Cours / activités',
              date: '2026-01 à 2026-02',
              files: [
                '04 - Gestion de parcs informatiques\\Activité 11.pdf',
                '04 - Gestion de parcs informatiques\\Activité 12.pdf',
                '04 - Gestion de parcs informatiques\\Activité 13.pdf',
              ],
            },
            {
              title: 'Activités 14 à 16 - Gestion de la documentation',
              type: 'Activités BookStack',
              date: '2026-04-27',
              files: [
                '05 - Gestion de la documentation\\Activité 14.pdf',
                '05 - Gestion de la documentation\\Activité 15.pdf',
                '05 - Gestion de la documentation\\Activité 16.pdf',
              ],
            },
          ],
        },
      ],
      skills: [
        'Préparer un poste utilisateur',
        'Installer et documenter des logiciels',
        'Comprendre le réseau, le routage et le DNS',
        'Utiliser GLPI pour la gestion de parc',
        'Structurer une base de connaissances',
      ],
    },
    {
      id: 'bloc-3',
      label: 'Bloc 3',
      title: 'Accompagnement des utilisateurs aux usages du numérique',
      summary:
        "Documents liés à l’esprit critique, aux fake news, à l’intelligence artificielle et au RGPD.",
      groups: [
        {
          title: 'IA, fake news et esprit critique',
          description: 'Activités de sensibilisation aux usages responsables et à la vérification de l’information.',
          rows: [
            {
              title: 'Démasquer les fake news',
              type: 'Activité pédagogique',
              date: '2025-09-02',
              files: ['ia\\Activite_FakeNews.docx'],
            },
            {
              title: 'Comprendre les théories complotistes',
              type: 'Activité pédagogique',
              date: '2025-09-02',
              files: ['ia\\Activite_Complotistes.docx'],
            },
            {
              title: 'Se méfier des intelligences artificielles',
              type: 'Activité pédagogique',
              date: '2025-09-02',
              files: ['ia\\Activite_Mefier_IA.docx'],
            },
            {
              title: "Bien utiliser l'intelligence artificielle",
              type: 'Activité pédagogique',
              date: '2026-05-26',
              files: ['ia\\Activite_Bien_Utiliser_IA.docx'],
            },
          ],
        },
        {
          title: 'RGPD',
          description: 'Support sur les obligations liées aux données personnelles et au consentement.',
          rows: [
            {
              title: 'RGPD - obligations et bonnes pratiques',
              type: 'Présentation',
              date: '2025-09-04',
              files: ['rgpd\\rgpd.pptx'],
            },
          ],
        },
      ],
      skills: [
        'Sensibiliser aux fausses informations',
        'Expliquer les limites de l’IA',
        'Accompagner les usages numériques',
        'Comprendre les bases du RGPD',
      ],
    },
    {
      id: 'pfmp',
      label: 'PFMP',
      title: 'Périodes de formation en milieu professionnel',
      summary:
        'Documents liés aux périodes de stage et au suivi PFMP dans le cadre du CS SNO.',
      groups: [
        {
          title: 'Documents PFMP',
          description:
            'Supports transmis pour organiser, cadrer ou préparer les périodes de formation en milieu professionnel.',
          rows: [
            {
              title: 'PFMP 2 - Protocole',
              type: 'Document de cadrage',
              date: '2026-05-27',
              files: ['Protocole-CSSNO-PFMP2.pdf'],
            },
            {
              title: 'Semaine post-PFMP 1',
              type: 'Support de suivi',
              date: '2026-05-27',
              files: ['Semaine Post-PFMP1 - 2025-2026.pdf'],
            },
          ],
        },
      ],
      skills: [
        'Préparer une période en entreprise',
        'Suivre les attendus de PFMP',
        'Relier la formation aux situations professionnelles',
      ],
    },
  ];

  constructor(
    private readonly titleService: Title,
    private readonly meta: Meta,
    private readonly settingsService: SettingsService
  ) {}

  ngAfterViewInit(): void {
    this.onScroll();
  }

  ngOnInit(): void {
    this.titleService.setTitle('Dossier numérique CS SNO | Kadmiel Tognon');
    this.meta.updateTag({
      name: 'description',
      content:
        'Dossier numérique CS SNO construit à partir des blocs 1, 2 et 3 : présence en ligne, services logiciels et accompagnement des usages numériques.',
    });
    this.loadPortfolioSettings();
  }

  getFileHref(blockId: string, file: string): string {
    const blockFolder = blockId.replace('bloc-', 'bloc');
    const normalizedFile = file.replace(/\\/g, '/');

    if (this.opensNativelyInBrowser(file)) {
      return encodeURI(`/dossier-numerique/${blockFolder}/${normalizedFile}`);
    }

    return encodeURI(`/dossier-numerique-preview/${blockFolder}/${normalizedFile}.html`);
  }

  getFileName(file: string): string {
    return file.replace(/\\/g, '/').split('/').pop() || file;
  }

  getFileType(file: string): string {
    switch (this.getFileExtension(file)) {
      case 'pdf':
        return 'Support PDF';
      case 'html':
        return 'Page HTML';
      case 'css':
        return 'Feuille de style';
      case 'js':
        return 'Script JavaScript';
      case 'docx':
        return 'Document Word';
      case 'pptx':
        return 'Présentation';
      case 'xlsx':
        return 'Tableur Excel';
      case 'zip':
        return 'Archive ZIP';
      case 'png':
        return 'Image';
      case 'ttf':
        return 'Police';
      default:
        return 'Fichier';
    }
  }

  getFileIcon(file: string): string {
    switch (this.getFileExtension(file)) {
      case 'pdf':
        return 'fa-solid fa-file-pdf';
      case 'html':
        return 'fa-brands fa-html5';
      case 'css':
        return 'fa-brands fa-css3-alt';
      case 'js':
        return 'fa-brands fa-js';
      case 'docx':
        return 'fa-solid fa-file-word';
      case 'pptx':
        return 'fa-solid fa-file-powerpoint';
      case 'xlsx':
        return 'fa-solid fa-file-excel';
      case 'zip':
        return 'fa-solid fa-file-zipper';
      case 'png':
        return 'fa-solid fa-file-image';
      case 'ttf':
        return 'fa-solid fa-font';
      default:
        return 'fa-regular fa-file-lines';
    }
  }

  getFileAction(_file: string): string {
    return 'Ouvrir';
  }

  getFileExtension(file: string): string {
    return this.getFileName(file).split('.').pop()?.toLowerCase() || '';
  }

  private opensNativelyInBrowser(file: string): boolean {
    return ['pdf', 'html', 'css', 'js', 'png'].includes(this.getFileExtension(file));
  }

  private loadPortfolioSettings(): void {
    this.settingsService.getAllSettings().subscribe({
      next: (settings: any) => this.applyPortfolioSettings(settings),
      error: () => undefined,
    });
  }

  private applyPortfolioSettings(settings: any): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const colors = settings?.colors || {};
    const typography = settings?.typography || {};

    if (colors.bg) root.style.setProperty('--bg', colors.bg);
    if (colors.primary) root.style.setProperty('--red', colors.primary);
    if (colors.secondary) root.style.setProperty('--violet', colors.secondary);
    if (colors.text) root.style.setProperty('--text', colors.text);

    if (typography.titleFont) {
      const font =
        typography.titleFont === 'space'
          ? "'Space Mono', monospace"
          : typography.titleFont === 'rajdhani'
            ? "'Rajdhani', sans-serif"
            : "'Orbitron', sans-serif";
      root.style.setProperty('--font-title', font);
    }

    if (typography.bodyFont) {
      const font =
        typography.bodyFont === 'inter'
          ? "'Inter', sans-serif"
          : typography.bodyFont === 'manrope'
            ? "'Manrope', sans-serif"
            : "'Syne', sans-serif";
      root.style.setProperty('--font-body', font);
    }
  }
}
