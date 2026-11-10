# Dependency security maintenance

The project stays on Expo SDK 54 and its compatible native package versions.

## Dependency patches

The lockfile resolves `node-forge` to 1.4.3. The [upstream 1.4.1 release](https://github.com/digitalbazaar/forge/releases/tag/v1.4.1) fixed the nested DigestAlgorithm signature verification issue ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)). `npm run test:security` checks both valid signatures and rejection of extra nested elements.

The postinstall script adapts Metro asset reads to the byte-input API of patched image-size 2. Full Expo web export verifies the asset path.

## Verification

Run npm run typecheck, npm test -- --runInBand, npm run test:security, and npx expo export --platform web.
The server has separate tests. Real PostgreSQL suites explicitly skip if neither DATABASE_URL nor RUN_DB_TESTS=true is set. When requested, connection or schema failures fail the tests.
Never point real DB tests at a production database: the suites apply the Prisma schema and create test records.
