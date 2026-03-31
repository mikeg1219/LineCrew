# LineCrew Mobile App Quickstart (Capacitor)

This is the fastest way to see your current web app as a native app shell for iOS/Android stores.

## What this setup does

- Uses Capacitor as a native wrapper.
- Loads your deployed web app URL in a native app shell:
  - default: `https://line-crew-sigma.vercel.app`
- Lets you test mobile behavior now without rebuilding backend flows.

## Prerequisites

- Node.js installed
- Android Studio installed (for Android builds)
- Xcode on macOS (for iOS builds)

## Environment (optional)

If you want a different URL than production alias:

```bash
CAPACITOR_APP_URL=https://your-preview-or-prod-url
```

## Android quickstart (Windows/macOS)

From repo root:

```bash
npm install
npm run mobile:android:add
npm run mobile:android:sync
npm run mobile:android:open
```

Then in Android Studio:

1. Let Gradle sync.
2. Choose an emulator/device.
3. Run the app.

## iOS quickstart (macOS only)

From repo root:

```bash
npm install
npm run mobile:ios:add
npm run mobile:ios:sync
npm run mobile:ios:open
```

Then in Xcode:

1. Select a simulator/device.
2. Configure signing/team.
3. Run.

## Notes for store readiness

- Keep using Stripe backend/webhooks exactly as-is.
- Add deep links/universal links before release.
- Add push notifications if needed.
- Keep `CAPACITOR_APP_URL` pointed to your stable production URL before submission.

## Testing checklist

1. Login/signup works in app shell.
2. Customer can post a booking and reach Stripe checkout.
3. Line Holder can browse/accept jobs.
4. Profile updates persist.
5. Payment flow returns to app/browser correctly.
