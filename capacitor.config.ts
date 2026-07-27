import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jmellott.flexlog',
  appName: 'FlexLogger',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
