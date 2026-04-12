#!/bin/bash
set -e

cd /vercel/share/v0-project

git add -A
git commit -m "feat: overhaul handleSubmit with fail-safe logic for demo

- Relaxed validation: only Phone Number and Location required
- Conditional Base64: handle missing photos gracefully
- Direct Firestore write to 'alerts' collection
- Added try-catch with console.error for debugging
- UI feedback: submitting state always clears on error

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"

git push origin HEAD:main
