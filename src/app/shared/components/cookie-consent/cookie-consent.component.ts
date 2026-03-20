import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.css']
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;
  isExpanded = false;
  
  // Simulation des "cookies" récupérés (données stockées)
  cookiesList: { name: string, value: string, description: string }[] = [];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getConsent$().subscribe(consent => {
      this.showBanner = consent === null;
      if (this.showBanner) {
        this.updateCookiesList();
      }
    });
  }

  updateCookiesList(): void {
    this.cookiesList = [
      { 
        name: 'analytics_consent', 
        value: localStorage.getItem('analytics_consent') || 'non défini', 
        description: 'Stocke votre choix de consentement pour les statistiques.' 
      },
      { 
        name: 'analytics_session_id', 
        value: localStorage.getItem('analytics_session_id') || 'généré à l\'acceptation', 
        description: 'Identifiant unique de session pour analyser votre navigation.' 
      },
      {
        name: 'screen_info',
        value: `${window.screen.width}x${window.screen.height}`,
        description: 'Dimensions de l\'écran pour optimiser l\'affichage.'
      },
      {
        name: 'hardware_info',
        value: `${navigator.hardwareConcurrency || '?'} cœurs / ${(navigator as any).deviceMemory || '?'} Go RAM`,
        description: 'Capacités de l\'appareil pour adapter les animations.'
      },
      {
        name: 'user_pref',
        value: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Mode sombre' : 'Mode clair',
        description: 'Préférences système pour respecter votre thème.'
      },
      {
        name: 'ad_tracking',
        value: 'Interêts & Retargeting',
        description: 'Analyse vos centres d\'intérêt (ex: Projets, Blog) pour vous proposer du contenu adapté.'
      }
    ];
  }

  acceptAll(): void {
    this.analyticsService.setConsent(true);
    this.showBanner = false;
  }

  declineAll(): void {
    this.analyticsService.setConsent(false);
    this.showBanner = false;
  }
}
