// import { bootstrapApplication } from '@angular/platform-browser';
// import { App } from './app/app';
// import { provideHttpClient } from '@angular/common/http';
// import { importProvidersFrom } from '@angular/core';
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// bootstrapApplication(App, {
//   providers: [
//     importProvidersFrom(BrowserAnimationsModule), // optional
//     provideHttpClient(), // <-- this enables HttpClient in standalone setup
//   ]
// }).catch(err => console.error(err));



import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
