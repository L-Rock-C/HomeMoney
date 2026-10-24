import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homemoney.app',
  appName: 'HomeMoney',
  webDir: 'out',
  server: {
    url: 'https://home-money-jet.vercel.app',
    cleartext: false,
  },
};

export default config;
