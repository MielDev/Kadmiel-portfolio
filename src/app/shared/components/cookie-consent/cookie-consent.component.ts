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
  cookiesList: { name: string, value: string, description: string }[] = [];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getConsent$().subscribe(consent => {
      this.showBanner = consent === null;
      if (this.showBanner) this.updateCookiesList();
    });
  }

  updateCookiesList(): void {
    this.cookiesList = [
      {
        name: 'analytics_consent',
        value: localStorage.getItem('analytics_consent') || 'non défini',
        description: 'Mémorise votre choix concernant les statistiques.'
      },
      {
        name: 'Google Analytics',
        value: 'Désactivé tant que vous n\'avez pas accepté',
        description: 'Mesure l\'audience du site uniquement après votre accord.'
      },
      {
        name: 'Publicité',
        value: 'Désactivée',
        description: 'Aucun cookie publicitaire ni retargeting n\'est activé par ce site.'
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
