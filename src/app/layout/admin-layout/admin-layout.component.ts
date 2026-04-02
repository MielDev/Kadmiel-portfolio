import { Component, AfterViewInit, ElementRef, ViewChild, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar';
import { AdminNavbarComponent } from '../admin-navbar/admin-navbar';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent, AdminNavbarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements AfterViewInit {
  @ViewChild('cur') cur!: ElementRef<HTMLDivElement>;
  @ViewChild('curRing') curRing!: ElementRef<HTMLDivElement>;

  isSidebarOpen = false;
  isMobile = false;

  // Cursor logic
  mx = 0; my = 0; rx = 0; ry = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.matchMedia('(hover:none)').matches;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && !this.isMobile) {
      this.animRing();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isMobile) return;
    this.mx = e.clientX;
    this.my = e.clientY;
    if (this.cur) {
      this.cur.nativeElement.style.left = `${this.mx}px`;
      this.cur.nativeElement.style.top = `${this.my}px`;
    }
  }

  animRing(): void {
    this.rx += (this.mx - this.rx) * 0.12;
    this.ry += (this.my - this.ry) * 0.12;
    if (this.curRing) {
      this.curRing.nativeElement.style.left = `${this.rx}px`;
      this.curRing.nativeElement.style.top = `${this.ry}px`;
    }
    requestAnimationFrame(() => this.animRing());
  }

  @HostListener('document:mouseover', ['$event'])
  onMouseOver(e: MouseEvent): void {
    if (this.isMobile || !this.curRing) return;
    const target = e.target as HTMLElement;
    const interactiveSelectors = ['a', 'button', '.stat-card', '.nav-item', '.msg-item', '.proj-table tr', '.qa-btn', '.user-card', '.field-input', '.eye-toggle', '.msg-row', '.mini-stat', '.inbox-filter', '.bulk-btn', '.dab-btn', '.msg-checkbox'];
    const isInteractive = interactiveSelectors.some(selector => target.closest(selector));

    if (isInteractive) {
      this.curRing.nativeElement.style.width = '44px';
      this.curRing.nativeElement.style.height = '44px';
      this.curRing.nativeElement.style.borderColor = 'var(--red)';
    } else {
      this.curRing.nativeElement.style.width = '30px';
      this.curRing.nativeElement.style.height = '30px';
      this.curRing.nativeElement.style.borderColor = 'var(--violet)';
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
