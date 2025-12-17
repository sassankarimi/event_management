import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MockBackendInterceptor } from './app/core/interceptors/mock-backend.interceptor';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
// TODO: Implement and import the mock backend interceptor in a later phase.
// import { MockBackendInterceptor } from './app/core/interceptors/mock-backend.interceptor';

/**
 * Bootstraps the Angular application using the standalone API.
 * This entry file sets up global providers such as routing,
 * HTTP client with interceptors, animations and Material locale.
 */
bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    // Register class-based interceptors via DI and let HttpClient pick them up.
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MockBackendInterceptor,
      multi: true,
    },
    provideRouter(appRoutes),
    // Use the German locale for Angular Material components such as date pickers.
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
  ],
}).catch((err) => console.error(err));
