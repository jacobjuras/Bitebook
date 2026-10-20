# Bitebook

Bitebook is an Expo and React Native application organized as an npm workspace monorepo.

## Prerequisites

- Node.js 24.20.0, as specified by `.nvmrc`
- npm
- Xcode and an iOS Simulator runtime for iOS development
- Android Studio and an Android Virtual Device for Android development

On macOS, accept the Xcode license after installing or updating Xcode:

```bash
sudo xcodebuild -license
```

## Install dependencies

Run commands from the repository root unless a section says otherwise.

```bash
nvm install
nvm use
npm install
```

Use `npm ci` instead of `npm install` when reproducing the exact dependency tree from `package-lock.json`, such as in continuous integration:

```bash
npm ci
```

## Build and validate

Build every workspace that currently has a build script:

```bash
npm run build
```

Type-check every workspace:

```bash
npm run typecheck
```

Run all automated tests:

```bash
npm test
```

Run the Expo project checks:

```bash
cd apps/mobile
npx expo-doctor
cd ../..
```

### Configure the mobile environment

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and replace its placeholders with the target `Bitebook-Beta` or `Bitebook-Production` CloudFormation outputs. Local development, Beta, and Production use the same variable names with different values.

Variables prefixed with `EXPO_PUBLIC_` are embedded in the application bundle. Use them only for the public API URL and Cognito client identifiers, never credentials or secrets.

Create production JavaScript bundles for both mobile platforms:

```bash
cd apps/mobile
npx expo export --platform ios --output-dir dist
npx expo export --platform android --output-dir dist-android
cd ../..
```

The generated `dist` and `dist-android` directories are build artifacts and must not be committed.

## Run the mobile app

Bitebook uses an app-specific Expo development build rather than Expo Go. Local simulator and emulator builds do not require EAS or a paid Expo plan.

Build and install the iOS development app after cloning or changing native dependencies:

```bash
npm run ios:build --workspace @bitebook/mobile
```

Then start Metro and open the installed development app:

```bash
npm run ios --workspace @bitebook/mobile
```

Saving a TypeScript or TSX file triggers Fast Refresh. Press `r` in the Metro terminal to reload manually and `Ctrl+C` to stop the server.

### Android Emulator

Start an Android Virtual Device, then build and install the Android development app after cloning or changing native dependencies:

```bash
npm run android:build --workspace @bitebook/mobile
```

For daily development, start Metro and open the installed app:

```bash
npm run android --workspace @bitebook/mobile
```

The generated `ios` and `android` directories are local build artifacts and must not be committed.

### Start Metro without opening a device

```bash
npm run mobile
```

The server binds to localhost. While it is running, press `i` to open iOS or `a` to open Android.

The iOS Simulator does not provide a camera suitable for barcode-scanning tests. Use a physical device for that feature.

### Clear the Expo cache

If Metro serves stale code or module-resolution errors after dependency changes, restart it with a clean cache:

```bash
npm run start --workspace @bitebook/mobile -- --clear
```

## Work with one package

Build only the shared domain package:

```bash
npm run build --workspace @bitebook/domain
```

Type-check only the mobile package:

```bash
npm run typecheck --workspace @bitebook/mobile
```

Run only the domain tests:

```bash
npm test --workspace @bitebook/domain
```

## Before committing

Run the checks relevant to the changed package. For changes that can affect the full repository, run:

```bash
npm run build
npm run typecheck
npm test

cd apps/mobile
npx expo-doctor
npx expo export --platform ios --output-dir dist
npx expo export --platform android --output-dir dist-android
```
