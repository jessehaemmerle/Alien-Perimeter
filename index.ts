import { registerRootComponent } from 'expo';

import App from './App';
import { setupPwa } from './src/pwa';

// PWA-Metadaten + Service Worker (wirkt nur im Web-Build, no-op nativ)
setupPwa();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
