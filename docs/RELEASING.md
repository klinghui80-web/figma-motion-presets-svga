# Release procedure

## GitHub

1. Confirm the public project name, owner and license before the first push.
2. Run `npm ci`, `npm run build`, `npm test` and `npm run release:package`.
3. Check `git status` before committing. `artifacts/`, `dist/`, credentials and local design files must not be staged.
4. Publish the source to the owner's public repository. Use a no-reply Git author address if the owner does not want their personal email in commits.
5. Create a `v1.0.0` release and attach the ZIP and SHA-256 file generated in `dist/`.
6. The ZIP is a ready-to-import development plugin. The full source and asset provenance remain in the repository.

## Figma Community

1. Enable two-factor authentication on the publishing account yourself. Keep verification and recovery codes private.
2. In Figma Desktop, open Plugins → Manage plugins → Development → the plugin's more menu → Publish.
3. Use the reviewed text and images in `docs/FIGMA_LISTING.md`.
4. Figma assigns a new plugin ID during the first publishing flow. Copy that exact ID into `manifest.json`; never invent it or reuse another plugin's ID.
5. Rebuild and test after the manifest change. Keep the same ID for future updates.
6. Confirm the publisher, free Community destination and support URL. If Figma presents a legal agreement, the account owner must review and authorize its acceptance.
7. Submit for review. A submitted plugin is not necessarily publicly installable until Figma approves it; record the actual status and URL shown by Figma.
8. Once the Community listing exists, add the verified installation link to the README and release notes.

The production manifest uses Figma-assigned ID `1699346735533425751`. Keep this ID for future Community updates.
