# Split Build Workflows — Setup Guide

## What Changed
The old `build-apps.yml` built EVERYTHING on every push to main.
Now each platform has its own workflow, triggered by its own branch.

## Files to Add
Put all 5 `.yml` files into `.github/workflows/` in your repo.
Then **delete** the old `build-apps.yml`.

## How It Works

| Branch          | What Builds        | Workflow File         |
|-----------------|--------------------|-----------------------|
| `build/windows` | Windows .exe       | `build-windows.yml`   |
| `build/linux`   | Linux .AppImage    | `build-linux.yml`     |
| `build/android` | Android .apk       | `build-android.yml`   |
| `v*` tags       | All platforms      | All 3 trigger on tags |
| Manual button   | Any single one     | workflow_dispatch      |

`build-frontend.yml` is a shared reusable workflow — each platform calls it first.
`release.yml` is manual — collects all artifacts into a GitHub Release.

## Quick Start

```bash
# Create the platform branches from main
git checkout main
git checkout -b build/windows && git push origin build/windows
git checkout -b build/linux   && git push origin build/linux
git checkout -b build/android && git push origin build/android
```

To trigger a build, just push (or merge main) to that branch:
```bash
git checkout build/linux
git merge main
git push
# → Only the Linux build runs
```

Or use the "Run workflow" button on GitHub Actions for any of them.

## Linux Fix
The Linux workflow now installs `rpm` and `libarchive-tools` before
running electron-builder. These were missing and caused the AppImage
build to fail.
