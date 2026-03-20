import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieConsentComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  protected readonly title = signal('portfolio-kadmiel');
}
