// src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: '<router-outlet></router-outlet>', // This is where your routed components will appear
  styleUrls: ['./app.css'],
})
export class AppComponent {
  title = 'chat-app-frontend';
}