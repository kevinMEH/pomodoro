import { FusesPlugin } from '@electron-forge/plugin-fuses';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const osxSign = {
  identity: '-',
  identityValidation: false,
  preAutoEntitlements: false,
  preEmbedProvisioningProfile: false,
  continueOnError: false,
  optionsForFile: () => ({
    hardenedRuntime: false,
    timestamp: 'none',
  }),
};
const macOSGenericIcon =
  '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: 'com.pomodoro.timer',
    asar: true,
    extendInfo: {
      LSUIElement: true,
    },
    icon: process.platform === 'darwin' ? macOSGenericIcon : undefined,
    osxSign,
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
