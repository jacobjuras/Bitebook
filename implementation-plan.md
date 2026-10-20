# Bitebook Implementation Plan

This plan tracks implementation in dependency order. Completed work remains checked so the file records how the application was built, not only what remains.

## 1. Product and repository foundation

**Stack:** Product design and repository configuration

- [x] Define the product goals, core views, technical architecture, data models, security requirements, and privacy boundaries.
- [x] Create the npm workspace monorepo.
- [x] Pin Node.js 24 and document installation, build, test, Expo, and bundle commands.
- [x] Scaffold the Expo mobile application with Expo Router.
- [x] Scaffold the shared `@bitebook/domain` package.
- [x] Scaffold the `@bitebook/api` Lambda package with a fail-closed handler.
- [x] Scaffold the `@bitebook/infra` CDK application.
- [x] Add repository-wide build, type-check, and test scripts.
- [x] Ignore generated build and CDK synthesis artifacts.

## 2. Shared domain models and logic

**Stack:** Shared TypeScript domain package (`@bitebook/domain`)

- [x] Define and validate Quantity and supported measurement units.
- [x] Define and validate NutritionFacts and micronutrients.
- [x] Define and validate Food.
- [x] Define and validate Ingredient and Meal.
- [x] Define and validate MealEntry and ingredient snapshots.
- [x] Define and validate CalendarMeal.
- [x] Define and validate StockTransaction.
- [x] Define and validate UserProfile.
- [x] Define and validate NutritionGoal.
- [x] Convert compatible mass and volume quantities.
- [x] Scale nutrition facts by consumed quantity.
- [x] Sum nutrition facts while treating absent nutrient values as zero.
- [x] Group nearby MealEntries into local-day CalendarMeals.
- [x] Select the effective NutritionGoal for a local date.
- [x] Calculate Meal availability from current Food stock.
- [x] Calculate validated Food stock increases and decreases.
- [x] Add concise function documentation for non-obvious public domain operations.

## 3. Mobile shell and visual foundation

**Stack:** Expo React Native mobile app (`@bitebook/mobile`)

- [x] Add Calendar, Pantry, Eat, Reports, and Me tabs.
- [x] Add nested Pantry navigation so child screens keep the tab bar visible.
- [x] Add Food and Meal Pantry empty states.
- [x] Distinguish the Meal empty state for users with and without Foods.
- [x] Add placeholder Food and Meal creation destinations.
- [x] Centralize semantic light and dark color tokens.
- [x] Apply theme colors to the tab bar and screen backgrounds.
- [ ] Add shared spacing, typography, and radius tokens when repeated UI patterns justify them.

## 4. Core AWS infrastructure

**Stack:** AWS CDK infrastructure (`@bitebook/infra`)

- [x] Add the user-scoped DynamoDB table with on-demand billing.
- [x] Add point-in-time recovery, deletion protection, and retained removal behavior.
- [x] Encrypt the table with a rotating customer-managed KMS key.
- [x] Bundle the API handler as a private Node.js 24 Lambda.
- [x] Give the Lambda only the DynamoDB operations currently used by the API.
- [x] Add structured Lambda and API Gateway access log groups.
- [x] Add the Cognito User Pool and secretless native-app client.
- [x] Configure verified, case-insensitive email identities and one-year refresh tokens.
- [x] Keep MFA and Cognito Plus threat protection out of the initial release.
- [x] Add the API Gateway HTTP API with Cognito JWT authorization on every route.
- [x] Enable the authenticated default API Gateway endpoint.
- [x] Export the API URL, AWS Region, User Pool ID, and app-client ID.
- [ ] Resolve the conflict between ten-year security-event retention guidance and the product privacy/cost target before Production.

## 5. Food backend API

**Stack:** Lambda backend (`@bitebook/api`) and its least-privilege CDK grants (`@bitebook/infra`)

- [x] Create Foods for the authenticated user.
- [x] List the authenticated user's Foods.
- [x] Get one owned Food by ID.
- [x] Update mutable Food metadata.
- [x] Delete an owned Food conditionally.
- [x] Adjust Food stock and record an immutable StockTransaction atomically.
- [x] Refactor Food reads and DynamoDB client setup into focused modules.

## 6. Meal backend API

**Stack:** Lambda backend (`@bitebook/api`) and its least-privilege CDK grants (`@bitebook/infra`)

- [x] Create Meals from Foods owned by the authenticated user.
- [x] List the authenticated user's Meals.
- [x] Get one owned Meal by ID.
- [x] Update Meal metadata and ingredients with optimistic concurrency.
- [x] Delete an owned Meal conditionally.

## 7. Profile and NutritionGoal backend API

**Stack:** Lambda backend (`@bitebook/api`) and API Gateway routes (`@bitebook/infra`)

- [x] Get the authenticated user's profile.
- [x] Replace the authenticated user's profile while preserving its creation time.
- [x] Create effective-dated NutritionGoals with one goal per date.
- [x] Get the goal effective on a requested local date.
- [x] Allow an unactioned future NutritionGoal to be rescheduled or replaced without rewriting effective history.
- [x] Delete any NutritionGoal and recalculate reports from the remaining goal history.

## 8. Staged CI/CD foundation

**Stack:** GitHub CI, CDK Pipelines, and AWS deployment accounts (`@bitebook/infra`)

This is the current phase.

- [x] Choose separate AWS accounts for Beta and Production, without a separate management or tooling account for now.
- [x] Designate `jacjuras-test` (`492683309774`) as the Beta AWS account.
- [x] Create and designate Production AWS account `805982516567`.
- [x] Select PDX (`us-west-2`) as the deployment Region.
- [x] Bootstrap CDK deployment roles and artifact access in both accounts.
- [x] Make CDK application composition stage-aware.
- [x] Synthesize isolated Beta and Production application stacks.
- [x] Add pull-request CI for build, type-check, unit tests, and CDK synthesis.
- [x] Keep deployed API integration tests out of pull-request CI; run them only against Beta in the deployment pipeline.
- [x] Add a deployed API integration-test package.
- [x] Define a self-updating pipeline sourced from GitHub `main` and targeting Beta.
- [x] Authorize the GitHub CodeConnections connection in the Beta account.
- [x] Deploy the pipeline so merges to `main` deploy Beta.
- [x] Configure deployed API integration tests against Beta as a pipeline gate.
- [x] Add a non-blocking mobile UI placeholder that reports skipped until the runner exists.
- [ ] Add a pipeline gate for mobile UI tests once the UI-test runner exists.
- [ ] Block Production promotion when either pipeline test gate fails.
- [ ] Automatically roll Beta back to its last successful revision when Beta smoke tests fail.
- [ ] Automatically promote the same tested artifact to Production when both Beta pipeline gates pass.
- [ ] Run Production smoke tests after deployment and mark promotion successful only when they pass.
- [ ] Automatically roll Production back to its last successful revision when Production smoke tests fail.
- [x] Add environment-specific mobile configuration for local development, Beta, and Production.

## 9. Authentication infrastructure

**Stack:** Amazon Cognito and OAuth configuration (`@bitebook/infra` plus provider consoles)

Temporary internal Beta and Production environments use admin-created Cognito test users. Public registration and social identity providers remain disabled there and are enabled only after migration to externally owned accounts.

- [ ] Configure admin-created test users for temporary internal environments.
- [ ] Enable public email account registration with verification and recovery after external-account migration.
- [ ] Register Google as a Cognito identity provider after external-account migration.
- [ ] Add a Cognito domain and authorization-code flow with PKCE.
- [ ] Register exact mobile callback and sign-out URLs.
- [ ] Reassess Sign in with Apple before iOS App Store submission.

## 10. Mobile authentication and API client

**Stack:** Expo React Native mobile app (`@bitebook/mobile`)

- [ ] Add mobile email sign-up and verification.
- [ ] Add sign-in and sign-out.
- [ ] Store tokens in platform-backed secure storage.
- [ ] Refresh access and ID tokens silently.
- [ ] Add Google sign-in and Expo deep-link handling.
- [ ] Add a shared authenticated HTTP client.
- [ ] Add consistent loading, validation, offline, and API error handling.

## 11. Pantry mobile experience

**Stack:** Expo React Native mobile app (`@bitebook/mobile`), consuming the completed Food and Meal APIs

- [ ] Load Foods and Meals from the authenticated API.
- [ ] Connect Pantry empty states to live data.
- [ ] Build the Food list with search and sorting.
- [ ] Build manual Food creation.
- [ ] Build Food details and metadata editing.
- [ ] Build the Food deletion interface.
- [ ] Build Food stock adjustment and grocery-restock interfaces.
- [ ] Build the Meal list with search and sorting.
- [ ] Build Meal creation with Food selection and quantities.
- [ ] Build Meal details and editing.
- [ ] Display Meal nutrition and available servings.
- [ ] Build the Meal deletion interface.

## 12. MealEntry and scheduled-stock backend

**Stack:** Shared domain package, Lambda backend, DynamoDB, and scheduled AWS infrastructure

- [ ] Add MealEntry creation from a Food or saved Meal using ingredient snapshots.
- [ ] Add MealEntry reads by ID and date range.
- [ ] Add MealEntry updates.
- [ ] Add MealEntry deletion.
- [ ] Apply stock atomically for current and past entries when `affectsStock` is enabled.
- [ ] Soft-block insufficient stock while allowing an explicit user override.
- [ ] Apply only the stock difference when an applied entry changes.
- [ ] Restore stock when an applied entry is deleted.
- [ ] Add scheduled processing for future entries.
- [ ] Record `stockAppliedAt` idempotently so future entries apply once.

## 13. Eat mobile experience

**Stack:** Expo React Native mobile app (`@bitebook/mobile`), consuming the MealEntry API

- [ ] Build the Eat selection flow for Foods and Meals.
- [ ] Support custom logged quantities.
- [ ] Support home-prepared and prepared-elsewhere classification.
- [ ] Support logging for now, the past, or a future scheduled time.
- [ ] Let the user choose whether an entry affects stock.
- [ ] Show the insufficient-stock warning and explicit override.

## 14. Calendar backend API

**Stack:** Lambda backend (`@bitebook/api`) using shared CalendarMeal and NutritionGoal domain logic

- [ ] Add MealEntry date-range queries.
- [ ] Compose calendar-day responses from MealEntries and effective goals.
- [ ] Return grouped CalendarMeals and daily nutrition totals.
- [ ] Return future-entry stock warnings.

## 15. Calendar, profile, and goals mobile experience

**Stack:** Expo React Native mobile app (`@bitebook/mobile`)

- [ ] Build the Calendar month view.
- [ ] Show daily goal status in the month view.
- [ ] Build the Calendar day timeline.
- [ ] Build CalendarMeal details and combined nutrition.
- [ ] Show future-entry stock warnings.
- [ ] Build profile viewing and editing.
- [ ] Build NutritionGoal history and update flows.

## 16. Barcode lookup backend

**Stack:** Lambda backend, AWS Secrets Manager, and least-privilege CDK grants

- [ ] Store the USDA API key in AWS Secrets Manager.
- [ ] Grant only the barcode-lookup path permission to read the secret.
- [ ] Add a bounded authenticated USDA lookup endpoint.
- [ ] Normalize USDA results into Bitebook Food fields without persisting raw responses or barcodes.

## 17. Barcode scanning mobile experience

**Stack:** Expo React Native mobile app (`@bitebook/mobile`)

- [ ] Request camera permission only when scanning starts.
- [ ] Add barcode scanning.
- [ ] Add confirmation and correction before saving.
- [ ] Preserve manual entry when permission is denied or no usable result exists.

## 18. Reports backend and domain calculations

**Stack:** Shared domain package and Lambda backend

- [ ] Calculate nutrition totals over absolute and relative date ranges.
- [ ] Calculate home-prepared versus prepared-elsewhere percentages.
- [ ] Add backend aggregation only where client-side calculation would transfer excessive data.

## 19. Reports mobile experience

**Stack:** Expo React Native mobile app (`@bitebook/mobile`)

- [ ] Build calorie-intake reports.
- [ ] Build macro- and micronutrient reports.
- [ ] Build the Locked In report.
- [ ] Support absolute and relative report date ranges.

## 20. Monetization product decisions

**Stack:** Product design

- [x] Choose an advertising-supported free experience.
- [x] Choose an optional premium subscription priced at approximately $1 per month.
- [ ] Choose banner ads, interstitial ads, or both.
- [ ] Define ad placements and frequency limits that do not interrupt core logging flows.
- [ ] Choose the mobile ad network.
- [ ] Define the first premium-gated features.
- [ ] Decide whether premium removes advertising.
- [ ] Confirm the subscription price, supported regions, trial behavior, and grace-period behavior.
- [ ] Decide whether to integrate directly with Apple and Google or use a subscription-management provider.

## 21. Premium subscription backend

**Stack:** Shared domain package, Lambda backend, DynamoDB, store notifications, and CDK infrastructure

- [ ] Define a server-owned premium entitlement model independent of either app store's receipt format.
- [ ] Add authenticated entitlement lookup for the mobile app.
- [ ] Validate Apple App Store transactions on the backend.
- [ ] Validate Google Play transactions on the backend.
- [ ] Process signed store notifications for renewals, cancellations, refunds, billing failures, and expirations.
- [ ] Keep purchase identifiers and subscription metadata out of application logs.
- [ ] Test purchase, restoration, renewal, cancellation, refund, grace-period, and expiration transitions.
- [ ] Ensure account deletion handles retained store records and active subscription instructions correctly.

## 22. Premium subscription mobile experience

**Stack:** Expo React Native mobile app, Apple StoreKit, and Google Play Billing

- [ ] Configure the approximately $1 monthly subscription product in both stores.
- [ ] Design and build the premium explanation and purchase screen after premium features are chosen.
- [ ] Purchase subscriptions through the platform billing system.
- [ ] Restore purchases on another device or after reinstalling.
- [ ] Provide access to platform subscription management.
- [ ] Read premium access from the validated backend entitlement.
- [ ] Gate only the premium features selected in the product decision.
- [ ] Apply the chosen premium advertising behavior.

## 23. Advertising mobile experience

**Stack:** Expo React Native mobile app and selected mobile ad network

- [ ] Integrate the selected ad SDK with development test ads.
- [ ] Implement the chosen banner and/or interstitial placements.
- [ ] Enforce placement and frequency limits.
- [ ] Prevent test ads and test identifiers from reaching Production.
- [ ] Apply premium entitlement behavior to ads if ad removal is selected.
- [ ] Verify ads do not obstruct navigation, meal logging, accessibility, or error messages.
- [ ] Add consent and tracking behavior required by platform and regional rules.
- [ ] Update the privacy notice, Apple privacy disclosures, and Google Play Data safety disclosures for the selected SDK.

## 24. Operational readiness

**Stack:** AWS CDK infrastructure and runbooks

- [ ] Add API throttling and abuse limits.
- [ ] Add CloudWatch metrics and alarms for API, Lambda, stock processing, USDA failures, and subscription-notification failures.
- [ ] Add operational runbooks for deployment failures and rollbacks.
- [ ] Add account deletion for Cognito and every user-owned DynamoDB record.
- [ ] Inspect representative logs for prohibited user data and credentials.
- [ ] Publish the privacy notice and complete platform privacy disclosures.

## 25. End-to-end release validation

**Stack:** Deployed API integration tests, mobile UI automation, Beta application, and deployment pipeline

This phase intentionally runs near the end, after the product workflows and operational controls are complete. Unit tests continue to ship with each implementation change.

- [ ] Create comprehensive deployed API integration tests for authentication, Foods, Meals, MealEntries, profile, goals, barcode lookup, reports, subscriptions, and ads.
- [ ] Add deployed API tests for malformed input, unauthenticated access, and cross-user access.
- [ ] Add deployed API tests for rollback-sensitive stock operations.
- [ ] Select and configure a mobile UI test framework and execution environment for iOS and Android.
- [ ] Create mobile UI tests for authentication, Pantry, meal logging, Calendar, Reports, subscriptions, and ads.
- [ ] Verify the completed API integration and mobile UI suites pass through their existing Beta pipeline gates.

## 26. Mobile distribution preparation

**Stack:** Expo Application Services, Apple App Store, and Google Play

- [ ] Add EAS development, Beta, and Production build profiles.
- [ ] Build and distribute internal Beta releases.
- [ ] Prepare Apple App Store metadata and review materials.
- [ ] Prepare Google Play metadata and review materials.

## 27. Final account migration and launch

**Stack:** AWS accounts, CDK infrastructure, deployment pipeline, mobile configuration, and app stores

- [ ] Revisit every CDK resource and deployment setting before migration, especially retention, removal policies, backups, logging, KMS keys, capacity, billing modes, alarms, quotas, and deletion protection.
- [ ] Estimate Beta and Production monthly costs from the final synthesized infrastructure and adjust configuration before creating resources.
- [ ] Create fresh externally owned Beta and Production AWS accounts with budgets, billing alerts, and account-level security controls.
- [ ] Bootstrap both fresh accounts and retarget the pipeline, application stages, and mobile environment configuration.
- [ ] Configure SNS email alerts for pipeline failures, cancellations, and rollback starts or failures.
- [ ] Deploy all infrastructure to the fresh accounts and pass the complete Beta API integration and mobile UI test gates.
- [ ] Verify automatic promotion deploys the same tested artifact to the fresh Production account.
- [ ] Remove Bitebook infrastructure from the temporary internal accounts only after the fresh environments are verified.
- [ ] Submit Production releases to the Apple App Store and Google Play.
