// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Import provideHttpClient and withInterceptors
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes'; // Your defined routes

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // Provide router
    provideHttpClient(),    // Provide HttpClient
    // If you plan to add interceptors later, you'd do it here:
    // provideHttpClient(withInterceptors([authInterceptor])),
  ],
}).catch((err) => console.error(err));