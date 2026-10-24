# Dependency security maintenance

The project stays on Expo SDK 54 and its compatible native package versions.

## Temporary upstream backport

node-forge@1.4.0 is affected by [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv). No patched npm version was published as of 2026-10-24. scripts/apply-security-patches.cjs applies the minimal nested DigestAlgorithm element-count validation from [upstream PR 1152](https://github.com/digitalbazaar/forge/pull/1152) after installation. npm run test:security checks both valid signatures and rejection of extra nested elements. The script fails for unrecognized upstream source.

The npm audit version database still reports this advisory and its Expo parent dependencies. These reports are not suppressed or counted as zero. Remove the backport only after upgrading to a published upstream fix and rerunning the regression tests.

The same postinstall script adapts Metro asset reads to the byte-input API of patched image-size 2. Full Expo web export verifies the asset path.

## Verification

Run npm run typecheck, npm test -- --runInBand, npm run test:security, and npx expo export --platform web.
The server has separate tests. Real PostgreSQL suites explicitly skip if neither DATABASE_URL nor RUN_DB_TESTS=true is set. When requested, connection or schema failures fail the tests.
Never point real DB tests at a production database: the suites apply the Prisma schema and create test records.
