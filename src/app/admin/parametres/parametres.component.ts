import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css',
})
export class ParametresComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('cur') cur!: ElementRef;
  @ViewChild('curRing') curRing!: ElementRef;

  isLoading = true;
  errorMessage: string | null = null;
  activeSection = 'apparence';
  currentTime: string = '00:00:00';
  uploadingAssets: Record<string, boolean> = {};
  private clockInterval: any;

  // Settings data
  settings: any = {
    theme: 'kadmiel',
    colors: {
      bg: '#070B14',
      primary: '#FF3B3B',
      secondary: '#7C3AED',
      text: '#E5E7EB'
    },
    display: {
      darkMode: true,
      animations: true,
      customCursor: true,
      bgGrid: true,
      floatingCv: true
    },
    hero: {
      eyebrow: 'Salut, je suis',
      name: 'KADMIEL',
      title: 'Développeur Full Stack',
      description: "Passionné par la création d'applications web & mobiles modernes alliant performance, sécurité et expérience utilisateur.",
      cta1: 'Voir mes projets',
      cta2: 'Me contacter',
      stat1Val: '12+',
      stat1Lbl: 'Projets réalisés',
      stat2Val: '3+',
      stat2Lbl: 'Années d\'expérience',
      stat3Val: '20+',
      stat3Lbl: 'Clients satisfaits'
    },
    branding: {
      logoType: 'text', // 'text' or 'image'
      logoText: 'KT.',
      logoSub: 'PORTFOLIO v2.2',
      logoImage: null,
      favicon: null,
      siteIcon: null,
      fullName: 'Kadmiel TOGNON',
      footerRights: 'Tous droits réservés.',
      location: 'Le Mans, France'
    },
    typography: {
      titleFont: 'orbitron',
      bodyFont: 'syne',
      fontSize: '16px — Standard',
      lineHeight: '1.75 — Standard'
    },
    security: {
      twoFactorEnabled: false,
      lastPasswordChange: 'il y a 30 jours',
      activeSessions: 1
    },
    advanced: {
      googleAnalyticsId: 'G-XXXXXXXXXX',
      hotjarEnabled: false
    },
    seo: {
      title: 'Kadmiel TOGNON — Développeur Full Stack Web & Mobile | Le Mans',
      description: 'Portfolio de Kadmiel TOGNON, développeur Full Stack passionné. Angular, React, Node.js, Laravel, Docker. Disponible pour stage, alternance ou mission au Mans ou en remote.',
      url: 'https://kadmieltognon.dev',
      keywords: 'développeur full stack, Angular, Node.js, Le Mans',
      ogTitle: '',
      ogImage: null
    },
    notifications: {
      emailNewMessage: true,
      emailWeeklyReport: true,
      emailTrafficPeak: false,
      inAppNotifications: true,
      notificationSound: false,
      recipientEmail: 'kadmieltognon5@gmail.com'
    },
    social: {
      linkedin: 'https://linkedin.com/in/kadmieltognon',
      github: 'https://github.com/kadmieltognon',
      twitter: '',
      instagram: '',
      whatsapp: 'https://wa.me/yournumber'
    }
  };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.startClock();
    this.loadSettings();
  }

  ngAfterViewInit(): void {
    this.initCursorAnimation();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString('fr-FR', { hour12: false });
    }, 1000);
  }

  public loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getAllSettings().subscribe({
      next: (data) => {
        if (Object.keys(data).length > 0) {
          // Merge loaded settings with defaults
          Object.keys(data).forEach(key => {
            if (this.settings.hasOwnProperty(key)) {
              this.settings[key] = this.mergeSettingValue(this.settings[key], data[key]);
            }
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.errorMessage = "Erreur lors du chargement des paramètres.";
        this.isLoading = false;
      }
    });
  }

  private mergeSettingValue(defaultValue: any, loadedValue: any): any {
    const isObject = (value: any) =>
      value !== null && typeof value === 'object' && !Array.isArray(value);

    if (isObject(defaultValue) && isObject(loadedValue)) {
      return { ...defaultValue, ...loadedValue };
    }

    return loadedValue;
  }

  saveSection(section: string): void {
    if (section === 'apparence') {
      // Sauvegarder theme, colors ET display.darkMode (essentiel pour la synchro front)
      const dataToSave = {
        theme: this.settings.theme,
        colors: this.settings.colors,
        display: this.settings.display
      };
      this.settingsService.updateMultipleSettings(dataToSave).subscribe({
        next: () => this.showToast('Thème sauvegardé et appliqué sur le site !', 'success'),
        error: () => this.showToast('Erreur lors de la sauvegarde.', 'error')
      });
      return;
    }

    const sectionData = this.settings[section];
    if (!sectionData) return;

    this.settingsService.updateSetting(section, sectionData).subscribe({
      next: () => this.showToast(`Paramètres ${section} sauvegardés !`, 'success'),
      error: () => this.showToast(`Erreur lors de la sauvegarde.`, 'error')
    });
  }

  saveAll(): void {
    this.isLoading = true;
    this.settingsService.updateMultipleSettings(this.settings).subscribe({
      next: () => {
        this.showToast('Tous les paramètres ont été sauvegardés !', 'success');
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error saving all settings:', err);
        this.showToast('Erreur lors de la sauvegarde globale.', 'error');
        this.isLoading = false;
      }
    });
  }

  showSection(sectionId: string): void {
    this.activeSection = sectionId;
  }

  selFont(type: 'title' | 'body', font: string): void {
    if (type === 'title') this.settings.typography.titleFont = font;
    else this.settings.typography.bodyFont = font;
    this.showToast(`Police ${font} sélectionnée.`, 'info');
  }

  resetSettings(): void {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      // Logic to reset would go here
      this.showToast('Paramètres réinitialisés (simulation).', 'error');
    }
  }

  clearCache(): void {
    this.showToast('Cache vidé avec succès.', 'success');
  }

  exportData(): void {
    const data = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings-export.json';
    a.click();
    this.showToast('Export JSON téléchargé.', 'success');
  }

  // Helper for theme selection
  selectTheme(themeId: string): void {
    this.settings.theme = themeId;

    // Chaque thème définit : couleurs + si le site est en mode sombre ou clair
    const themes: Record<string, { bg: string; primary: string; secondary: string; text: string; dark: boolean }> = {
      kadmiel:    { bg: '#070B14', primary: '#FF3B3B', secondary: '#7C3AED', text: '#E5E7EB', dark: true  },
      cyber:      { bg: '#000A0A', primary: '#00FF88', secondary: '#00BFFF', text: '#E5E7EB', dark: true  },
      neon:       { bg: '#0a000f', primary: '#FF00FF', secondary: '#00CFFF', text: '#E5E7EB', dark: true  },
      gold:       { bg: '#0A0800', primary: '#FFD700', secondary: '#FF8C00', text: '#E5E7EB', dark: true  },
      ice:        { bg: '#f0f4ff', primary: '#4F46E5', secondary: '#06B6D4', text: '#1F2937', dark: false },
      midnight:   { bg: '#010B1A', primary: '#3B82F6', secondary: '#8B5CF6', text: '#E5E7EB', dark: true  },
      forest:     { bg: '#030F08', primary: '#10B981', secondary: '#34D399', text: '#E5E7EB', dark: true  },
      rose:       { bg: '#100510', primary: '#EC4899', secondary: '#A855F7', text: '#E5E7EB', dark: true  },
      mono:       { bg: '#0A0A0A', primary: '#FFFFFF', secondary: '#9CA3AF', text: '#E5E7EB', dark: true  },
      sunset:     { bg: '#0F0508', primary: '#F97316', secondary: '#EC4899', text: '#E5E7EB', dark: true  },
    };

    const preset = themes[themeId];
    if (preset) {
      this.settings.colors = { bg: preset.bg, primary: preset.primary, secondary: preset.secondary, text: preset.text };
      // Synchroniser le mode dark/light du site selon le thème choisi
      this.settings.display = { ...this.settings.display, darkMode: preset.dark };
    }

    const names: Record<string, string> = {
      kadmiel: 'KADMIEL SIGNATURE', cyber: 'CYBER GREEN', neon: 'NEON TOKYO',
      gold: 'GOLD PREMIUM', ice: 'ICE LIGHT', midnight: 'MIDNIGHT BLUE',
      forest: 'FOREST', rose: 'ROSE', mono: 'MONOCHROME', sunset: 'SUNSET'
    };
    this.showToast(`Thème "${names[themeId] ?? themeId}" sélectionné — clique sur Sauvegarder pour l'appliquer.`, 'info');
  }

  // Synchronise les color pickers (input type=color → hex text et vice-versa)
  onColorPickerChange(field: 'bg' | 'primary' | 'secondary' | 'text', value: string): void {
    this.settings.colors[field] = value;
    // Marquer comme thème personnalisé
    this.settings.theme = 'custom';
  }

  // Toast logic
  toastMessage = '';
  toastType = 'info';
  isToastVisible = false;

  showToast(msg: string, type: string = 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.isToastVisible = true;
    setTimeout(() => this.isToastVisible = false, 3000);
  }

  // Cursor logic
  private initCursorAnimation(): void {
    if (!this.cur || !this.curRing) return;
    const c = this.cur.nativeElement;
    const cr = this.curRing.nativeElement;
    
    document.addEventListener('mousemove', (e) => {
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
      cr.style.left = e.clientX + 'px';
      cr.style.top = e.clientY + 'px';
    });

    document.querySelectorAll('button, a, input, select, textarea, .nav-item, .user-card, .settings-nav-item, .theme-card, .palette-preset, .logo-upload-area, .asset-upload-card, .font-card, .color-swatch').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cr.style.width = '44px';
        cr.style.height = '44px';
        cr.style.borderColor = 'var(--red)';
      });
      el.addEventListener('mouseleave', () => {
        cr.style.width = '28px';
        cr.style.height = '28px';
        cr.style.borderColor = 'var(--violet)';
      });
    });
  }

  getAssetUrl(value: string | null | undefined): string {
    if (!value) return '';
    if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http')) return value;

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  handleAssetUpload(event: Event, section: 'branding' | 'seo', key: string, label: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const uploadKey = `${section}.${key}`;
    this.uploadingAssets[uploadKey] = true;

    this.settingsService.uploadSettingsAsset(file, key).subscribe({
      next: (asset) => {
        this.settings[section][key] = asset.url;

        if (section === 'branding' && key === 'logoImage') {
          this.settings.branding.logoType = 'image';
        }

        this.settingsService.updateSetting(section, this.settings[section]).subscribe({
          next: () => {
            this.uploadingAssets[uploadKey] = false;
            this.showToast(`${label} mis à jour.`, 'success');
          },
          error: () => {
            this.uploadingAssets[uploadKey] = false;
            this.showToast(`${label} uploadé, mais non sauvegardé.`, 'error');
          }
        });
      },
      error: () => {
        this.uploadingAssets[uploadKey] = false;
        this.showToast(`Erreur lors de l'upload : ${label}.`, 'error');
      }
    });

    input.value = '';
  }

  useLogoAsFavicon(): void {
    if (!this.settings.branding.logoImage) {
      this.showToast('Ajoutez d’abord un logo.', 'error');
      return;
    }

    this.settings.branding.favicon = this.settings.branding.logoImage;
    this.settingsService.updateSetting('branding', this.settings.branding).subscribe({
      next: () => this.showToast('Favicon généré depuis le logo.', 'success'),
      error: () => this.showToast('Erreur lors de la sauvegarde du favicon.', 'error')
    });
  }
}
