import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flexlog.app',
  appName: 'FlexLog',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
