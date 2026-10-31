import { mount } from 'svelte';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './app.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

// Offline support, only in the built app (in development it would cache stale code).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Not fatal: the game works without it, just not offline.
    });
  });
}

export default app;
