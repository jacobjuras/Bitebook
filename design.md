## Bitebook Design

## Summary

Bitebook is an app designed to host a living record of everything meal-related. From planning out groceries to simply tracking everything you are eating day or will eat tomorrow or ate yesterday, Bitebook will be your companion every step of the way. It targets individuals who find themselves spending too much manual effort on planning out meals, thinking about when the next Costco run will be and what it will need, and tracking calories, macronutrients, and micronutrients.

## Goals

In this section, we will cover all of the functionality the app should support

### Goals

- Users can manage a calendar of meals, where they can specify what meals they eat in a day (whether in the past or in the future)
- Users can view their planned meals in a calendar-type view, which supports monthly and daily views
- Users add times to logged meals
- Users can scan grocery barcodes to add individual food items or ingredients into their "pantry"
- Users can manually add individual food items or ingredients into their "pantry" by manually entering its pantry metadata
- Users can use pre-saved food items or ingredients to contribute to their meal calendar
- Users can use pre-saved food items or ingredients to contribute to a grouping of them called pre-saved "meal"s
- Users can use pre-saved "meals" to contribute to their meal calendar
- Users flag logged foods/meals with whether or not they were eaten out or made at home, which contributes to the "Locked In" statistic that tracks % of meals eaten home-cooked vs out
- Users can view their pantry to see all food items and meals they have ever added
- A food in the user's pantry stores metadata on its macronutrients, micronutrients, and current stock; for meals, this is computed from its constituent ingredients, not stored
- Each logged food or meal has a user-settable flag that determines whether the entry updates pantry stock
- When a user wants a food or meal to affect stock, it appropriately updates the in-stock counts for the foods/ingredients in that meal
- When a user wants a food or meal to affect stock, they will be soft-blocked from logging it if they don't have enough stock of any of the ingredients in the meal (bypassable by the user)
- Users can create login credentials to access their data from different devices, so their data is backed up to their account
- Users can link a Google or Apple account to use for sign-in rather than creating a Bitebook-specific username and password
- The free experience will include advertising through at least one format; banner versus interstitial placement remains a product decision
- Users can purchase an optional premium subscription; premium-gated features and whether premium removes ads remain product decisions


## Core User Experience

#### First-time setup
First-time setup and a simple "logged out" experience should be the same. The user should be prompted to either enter their unique log-in credentials, log in with a linked google/apple account, or create an account using new login credentials.

### Core views
The app should contain five core views, separated through a bottom nav bar. From left to right, the selectable core views should be: Calendar, Pantry, Eat, Reports, Me.

#### Calendar View
The Calendar view will display the user's meal calendar, with selectable month- and day-at-a-glance views. In month view, a typical stack of Sunday-Saturday weeks with is shown, with each past day having a green or red dot indicating whether or not the user met their eating goal that day; success = calories within 5% of their goal calories (either direction). To switch to a day view, the user can just click on a specific day from the month view. To switch back to month view, can just press / swipe back. The day view will support much more than the month view. It will show 2 things: on top, a scrollable window starting at 12a and ending at 12a (the start of the next day), showing meals eaten at which times of the day. These meal cards will be clickable to open up details on the meal. On the bottom, it will have a statistical summary on the day, showing macro and mitro nutrient data. Future days can also have a warning message for when there is a food or meal planned that is out of stock.

#### Pantry View
The Pantry view will display the user's pantry-at-a-glance. It displays a list of everything the user has ever added to their pantry, with sorting options like alphabetically or most recently eaten. It also supports searching for items and updating their metadata (nutrients, stock, etc). It will also support a "stock" action to batch-execute an update of food item quantities, following a real-life grocery run. Meals themselves do not have a settable stock, they derive their stock from the minimum stock of its constituent ingredients. Future entries are considered planned until their scheduled time passes, at which point they are automatically considered eaten. A future entry changes stock at that time only when its `affectsStock` flag is enabled.

#### Eat View
The Eat view will allow the user to record an eaten meal or record a new item or food into their pantry. So it will prompt the user for what food or meal was eaten from their pantry with the option to directly add something new to their pantry from that view via barcode scan or manual entry, then let the user log it to a certain date/time or just "Now", or simply add it to the pantry without logging it as eaten. When logging an entry, the user chooses whether it affects pantry stock. If enabled, Bitebook checks availability and updates stock according to the entry's scheduled time; if disabled, Bitebook neither validates nor changes stock. Users log meals with a future timestamp to plan out meals for the future (viewable in Calendar).

#### Reports View
The Reports view will allow the user to view breakdowns of their eating habits. It can create reports on average caloric intake, nutrient breakdown, locked in %, etc on absolute time ranges (e.g. sept 1st to 22nd) or relative (e.g. last 7 days).

#### Me View
The Me view allows the user to configure their personal information, such as name, login credentials (if applicable), goal caloric intake, etc.

## Technical Design
#### Mobile Application Framework

Bitebook will use React Native with TypeScript through Expo. A single application project will build the iOS and Android apps, with platform-specific components used where their user experiences differ. Expo Router will provide navigation, while Expo modules will provide native capabilities such as camera access and iOS Liquid Glass effects.

#### Backend and APIs
Bitebook will use TypeScript AWS Lambda functions behind an Amazon API Gateway HTTP API. The frontend will communicate with the backend through REST-style JSON endpoints. Backend functions will enforce business rules, authorize access to user data, access persistent storage, and integrate with external services.

The food barcode scanner extracts a GTIN/UPC, a lambda backend will query USDA FoodData Central, and the user confirms or corrects the result before saving it. No barcode, USDA identifier, or shared product cache is persisted; if USDA returns no usable match, Bitebook falls back to manual entry.

#### Authentication
Amazon Cognito User Pools will manage accounts, email verification, password recovery, and user sessions. Users will be able to sign in with an email and password or through linked Google and Apple accounts. Sign-in will use the OAuth authorization-code flow with PKCE. API Gateway will validate Cognito access tokens before invoking the backend, and every data operation will verify that the authenticated user owns the requested data.

#### Monetization
Bitebook will offer a free advertising-supported experience and an optional premium subscription. The exact ad format, placements, frequency limits, premium features, and whether premium removes ads will be decided before monetization implementation.

Apple App Store and Google Play billing will process subscriptions because premium unlocks digital app functionality. The app will support purchase restoration and subscription management through each platform. Bitebook's backend will validate store transactions and maintain the user's current entitlement; the mobile client will not grant premium access based only on local state. Store notifications will update entitlements after renewals, cancellations, refunds, billing failures, and expirations.

Advertising will use a mobile ad network SDK. Bitebook will not use pantry, meal, nutrition, profile, or precise health-related behavior to target advertisements. Before ads launch, the implementation will define consent, tracking, age, regional privacy, and platform-disclosure behavior and will default to the least data-intensive viable ad configuration.

#### Database and File Storage
Application data will be stored in Amazon DynamoDB using on-demand capacity. Records will be scoped to the authenticated user's Cognito identifier. Operations that must update several records together, such as recording a meal and reducing ingredient stock, will use transactional writes so that either every change succeeds or none do. Point-in-time recovery will be enabled.

Bitebook will not store user-uploaded files initially because the current requirements do not need them. The database will store confirmed food metadata but will not persist barcode values or images. If file uploads are added later, they will use private Amazon S3 storage accessed only through authorized backend operations.

#### Application Distribution and Deployment
Bitebook will be built as native iOS and Android applications using Expo Application Services (EAS Build). Release builds will be distributed through the Apple App Store and Google Play, while development builds will run on physical devices and platform simulators.

All AWS resources will be defined in TypeScript using AWS CDK. Pull requests will run build, type-check, unit-test, and CDK-synthesis checks without deploying. Merges to `main` will deploy an isolated Beta stage, run integration tests against its deployed API, and then pause for manual approval before promoting the same tested artifact to Production. Beta and Production will deploy to separate AWS accounts with independent APIs, Cognito User Pools, DynamoDB tables, KMS keys, logs, permissions, and service quotas. The mobile application will authenticate API requests with Cognito access tokens and use environment-specific deployment configuration.

#### Offline Behavior and Synchronization
Bitebook will initially be online-first. The installed native application will contain the interface and static assets, but authenticated account reads and writes will require connectivity. User data will not initially be persisted in an offline cache on the device.

When connectivity is lost, the app will preserve the currently displayed screen, disable operations that require the backend, and explain that it is offline. After reconnecting, it will fetch the current server state. Offline write queues, conflict resolution, and multi-device data merging are outside the initial scope.

## Data Models

#### Food
A Food represents a user-owned item in the pantry. Food metadata can be entered manually or populated from a barcode scan. Scanned information must be confirmed or corrected by the user before it is saved.

```
type Food = {
  id: string;                     // Globally unique UUID
  userId: string;                 // Cognito identifier of the user who owns the food
  name: string;                   // User-visible and user-configured name of the food
  servingSize: Quantity;          // Quantity represented by one serving
  nutritionFacts: NutritionFacts; // Nutritional values for one serving
  currentStock: Quantity;         // Quantity currently available in the pantry
  createdAt: string;              // UTC timestamp recording when the food was created
  updatedAt: string;              // UTC timestamp recording when the food was last edited
};
```

A food remains in the pantry when its current stock reaches zero and is removed only when the user explicitly deletes it. Each user owns and edits an independent copy of a food.

For barcode entry, the frontend scans a GTIN or UPC and sends it temporarily to the backend. The backend queries USDA FoodData Central and returns the matching product information for confirmation. Bitebook does not persist the barcode, USDA identifier, brand, or shared product cache. If no usable match is found, the user can enter the food manually.

\* example `servingSize: { amount: 28, unit: "g" }` which we can use TypeScript `convert` library to convert to other units, e.g. `convert(1, "ounces").to("grams") // 28.3495`

#### Quantity / Unit

A Quantity represents serving sizes, pantry stock, meal ingredients, and logged amounts.

```
type Unit =
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "l"
  | "tsp"
  | "tbsp"
  | "cup"
  | "flOz"
  | "item";

type Quantity = {
  amount: number;
  unit: Unit;
};
```

Bitebook will use `convert` whenever two compatible units must be converted.

#### Nutrition Facts

NutritionFacts represents the nutritional values in one serving of a Food. Calories and common macronutrients use fixed fields and units so Bitebook can calculate daily totals efficiently. Micronutrients use a supported key-value collection because they vary between foods and may be missing from provider data.

```
type Micronutrient =
  | "sodium"
  | "potassium"
  | "calcium"
  | "iron";

type NutrientAmount = {
  amount: number;
  unit: "g" | "mg" | "mcg";
};

type NutritionFacts = {
  caloriesKcal: number;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
  saturatedFatG?: number;
  transFatG?: number;
  fiberG?: number;
  sugarG?: number;
  addedSugarG?: number;
  cholesterolMg?: number;
  micronutrients: Partial<Record<Micronutrient, NutrientAmount>>;
};
```

All values are non-negative and represent one `servingSize` of the associated food. Calories is the only required field. An omitted value means the nutrient is unknown, while zero meants it is known to be absent. USDA results will be converted into Bitebook's field names and units before being saved. Bitebook will not persist USDA nutrient identifiers or raw provider responses. Additional micronutrients can be added to the supported union later without changing existing Food records.

#### Meal Templates and Logged Entries

A saved Meal is a reusable template containing default Foods and quantities. Logging or planning a Meal creates a MealEntry with its own copy of those ingredients. The user can change a copied quantity for one MealEntry without changing the saved Meal or its defaults.

```
type Ingredient = {
  foodId: string;
  quantity: Quantity;             // Default quantity for one serving of the Meal
};

type LoggedIngredient = Ingredient & {
  foodSnapshot: Pick<Food, "name" | "servingSize" | "nutritionFacts">;
};
```

The Pantry uses a Meal's default ingredient quantities when calculating its availability. When a MealEntry is saved, Bitebook validates stock and calculates nutrition using that entry's actual quantities. One-off quantity changes therefore affect only that entry's nutrition, stock usage, and reports.

Planned entries retain the quantities selected when they were created, even if the saved Meal is later edited. MealEntry ingredient snapshots also preserve historical names, serving sizes, and nutrition facts so later Food or Meal edits do not rewrite history. These snapshots will be embedded directly in the MealEntry rather than stored as separate DynamoDB records.

When an already-eaten MealEntry has `affectsStock` enabled, changing an ingredient quantity applies only the stock difference. Deleting the entry restores the stock it consumed. Future entries do not affect stock until their scheduled time passes.

#### Meal Entry

A Meal Entry represents one Food or saved Meal that the user plans or logs at a particular time. Logging a saved Meal copies its default ingredients into the etnry, allowing the user to change quantities for that occurrence without changing the saved Meal.

```
type MealEntrySource = {
  type: "food" | "meal";           // Type of pantry item that was logged
  id: string;                      // ID of the original Food or Meal
  name: string;                    // Historical snapshot of its displayed name
};

type Preparation = "homePrepared" | "preparedElsewhere";

type MealEntry = {
  id: string;                      // Globally unique UUID
  userId: string;                  // Cognito identifier of the user who owns the entry
  source: MealEntrySource;         // Food or saved Meal used to create the entry
  ingredients: LoggedIngredient[]; // Exact Foods and quantities for this occurrence
  scheduledAt: string;             // UTC timestamp when the entry is considered eaten
  preparation: Preparation;        // Classification used by the Locked In statistic
  affectsStock: boolean;           // Whether this entry consumes pantry stock
  stockAppliedAt?: string;         // When its stock reduction was successfully applied
  createdAt: string;               // UTC timestamp recording when the entry was created
  updatedAt: string;               // UTC timestamp recording when the entry was last edited
};
```

Logging a food creates a MealEntry containing one LoggedIngredient. Logging a saved Meal creates a MealEntry containing copies of all its default ingredients. The source preserves whether the user originally logged a Food or Meal, while ingredients records exactly what was consumed.

An entry with a future scheduledAt value is considered planned until that time passes. Once the scheduled time passes, it is automatically considered eaten; Bitebook does not store a separate planned or eaten status.

When affectsStock is enabled, Bitebook validates and reduces stock at the scheduled time. stockAppliedAt records that the reduction completed, preventing the same entry from reducing stock more than once. Editing or deleting an entry whose stock was already applie adjusts or restores the appropriate quantities. MealEntry nutrition is calculated from its LoggedIngredient snapshots rather than stored separately.

CalendarMeal records are calculated by gruoping nearby MealEntry records. They do not replace or modify the underlying entities.

#### Calendar Meal

A Calendar Meal is a derived grouping of MealEntries logged near one another. It represents what the user sees as one meal on the Calendar, rather than a reusable Meal from the Pantry.

```
type CalendarMeal = {
  startTime: string;                  // Timestamp of the earliest grouped entry
  endTime: string;                    // Timestamp of the latest grouped entry
  entries: MealEntry[];               // Foods and saved Meals included in the group
  nutritionTotals: NutritionFacts;    // Combined nutrition calculated from the entries
};
```
For example, a Food logged at 12:00 and a saved Meal logged at 12:30 appear in one CalendarMeal. Selecting that CalendarMeal opens a detailed page showing both MealEntries, their ingredients and quantities, and their combined calorie, macro, and micronutrient totals.

CalendarMeals are calculated from stored MealEntries and are not stored separately in DDB. nutritionTotals is also calculated rather than persisted.

Entries from the same local calendar day are grouped when they occur within 30 minutes of each other. This means that a CalendarMeal's start and end times are dynamic, with detection logic allowing a meal eaten less than 30 minutes before or after the window of a CalendarMeal to be automatically added to it and its start/end time appropriately updated. Adding, editing, moving, or deleting a MealEntry may change its CalendarMeal grouping and calculated nutrition.

#### Stock Transaction

A StockTransaction records one change to the current stock of a Food. Transactions provide a history of restocks, consumption, corrections, and reversals without replacing the Food's current stock value.

```
type StockTransactionReason =
  | "restock"
  | "mealEntry"
  | "mealEntryAdjustment"
  | "mealEntryDeletion"
  | "manualAdjustment";

type StockTransaction = {
  id: string;                       // Globally unique UUID
  userId: string;                   // Cognito identifier of the user who owns the Food
  foodId: string;                   // Food whose stock changed
  direction: "increase" | "decrease";
  quantity: Quantity;               // Positive quantity added or removed
  reason: StockTransactionReason;   // Operation that caused the change
  mealEntryId?: string;             // Related MealEntry when applicable
  createdAt: string;                // UTC timestamp when the change occurred
};
```

StockTransaction records are immutable. Correcting a stock change creates another transaction rather than editing or deleting the original record.

Bitebook will update the Food's currentStock and create its StockTransaction in one DDB transaction so they cannot become inconsistent. Logging a MealEntry creates one StockTransaction for each affected Food. Editing or deleting an entry creates additional transactions representing the quantities adjusted or restored. Manual stock updates and grocery restocks also create transactions. StockTransaction history does not need to be visible in the initial application, but it preserves enough information to support troubleshooting and a future stock-history view.

#### User Profile

 A UserProfile stores Bitebook-specific information and preferences for one user. Amazon Cognito manages authN information separately, including email addresses, passwords, account verification, recovery, and linked Google or Apple accounts.

 ```
 type UserProfile = {
  userId: string;        // Cognito identifier and unique profile key
  displayName?: string;  // Optional name displayed within Bitebook
  timeZone: string;      // IANA time zone used for calendar dates and scheduling
  createdAt: string;     // UTC timestamp recording when the profile was created
  updatedAt: string;     // UTC timestamp recording when the profile was last edited
};
```

Bitebook will initially suggest the device's current time zone when creating the profile. Time zones use IANA IDs because regional daylight-saving rules can change the applicable offset.

#### Nutrition Goal

A NutritionGoal records the user's daily calorie target beginning on a particular local calendar date. Bitebook retains earlier goals so changing the current target does not alter whether historical days met their goals.

```
type NutritionGoal = {
  id: string;             // Globally unique UUID
  userId: string;         // Cognito identifier of the user who owns the goal
  caloriesKcal: number;   // Target daily calorie intake
  effectiveFrom: string;  // Inclusive local date in YYYY-MM-DD format
  createdAt: string;      // UTC timestamp recording when the goal was created
};
```

To determine the goal for a particular day, Bitebook selects the user's most recent NutritionGoal whose date is on or before that day. Changing a goal only creates a new NutritionGoal rather than overwriting the previous one. The new goal begins on the date selected by the user, which defaults to the current date. Only one goal may begin on a particular date.

The Calendar uses the applicable goal to determine whether, in this example, the user met their calorie goal for the day (within 5%). Additional macro or micronutrient targets can be added later if we want to introduce goals for those values.

## Security and Privacy

#### Data Collection

Bitebook collects only the information required to provide its features:

- Cognito account information, including email address and linked Google or Apple identity.
- Profile information, including an optional display name and time zone.
- User-created pantry foods, meals, nutrition information, stock history, meal entries, preparation classifications, and nutrition goals.
- Operational metadata such as request identifiers, timestamps, outcomes, and error categories.

Passwords and social-login credentials are handled by Cognito and the identity provider; the Bitebook backend never receives or stores plaintext passwords. Bitebook does not collect precise location, contacts, photos, or raw camera frames. Barcode scanning occurs on the device. The decoded GTIN or UPC is sent temporarily to the backend for a USDA lookup, but neither the identifier nor the camera image is persisted.

#### Authentication and Authorization

Bitebook's APIs require a valid Cognito access token. API Gateway validates the token's signature, issuer, audience, and expiration before invoking Lambda. The Cognito native-app client will use authorization-code flow with PKCE and will not have a client secret, because a secret cannot be protected inside a distributed mobile application.

The mobile application stores Cognito tokens only in platform-backed secure storage through Expo SecureStore, not in AsyncStorage or application logs. OAuth redirect URLs will be restricted to Bitebook's registered application URLs.

Every backend operation derives the user's `userId` from the validated token rather than trusting a `userId` supplied by the client. Lambda verifies ownership before reading, changing, or deleting a resource. The mobile application receives no AWS credentials and cannot access DynamoDB directly. Authentication and authorization tests will verify that unauthenticated requests and cross-user resource access are rejected.

#### Data Protection and Secrets

All communication between the mobile application, API Gateway, Cognito, and USDA uses HTTPS. DynamoDB data, point-in-time recovery backups, Cognito data, Secrets Manager secrets, and CloudWatch logs will be encrypted at rest using AWS KMS-backed service encryption.

Lambda functions will use separate least-privilege IAM execution roles that grant access only to the tables, indexes, logs, and secrets each function requires. The USDA API key will be stored in AWS Secrets Manager, retrieved only by the barcode-lookup backend, and never embedded in the application, source code, deployment output, or logs.

All API inputs will be validated against explicit schemas and bounded in size before use. API Gateway throttling and Cognito protections will limit abusive traffic. Production builds will disable debug and network-payload logging.

#### External Services and Permissions

AWS processes authentication, API, database, secret, and operational data for Bitebook. Google and Apple receive only the information required for their sign-in flows. USDA FoodData Central receives only the scanned product identifier needed for lookup; Bitebook does not send USDA the user's identity, pantry, or meal history.

Camera permission will be requested only when the user opens barcode scanning, and denying permission will leave manual food entry available. Bitebook will not sell user data or use pantry, meal, nutrition, profile, or precise health-related behavior to target advertising. The selected ad network and app stores may process device, advertising, purchase, and subscription metadata needed to serve ads and operate purchases. Their exact data collection, consent requirements, platform privacy disclosures, and retention will be reviewed and documented before monetization launches.

#### Retention and User Control

Application data remains until the user edits or deletes it or deletes their account. Account deletion will be available from within the application and will remove the Cognito account and all active DynamoDB records owned by that user. Encrypted point-in-time recovery data may retain deleted records for up to the configured recovery window, initially 35 days, after which it expires automatically. Backups will not be used to serve ordinary application requests.

Operational CloudWatch logs will be retained for 30 days. Logs may contain request IDs, operation names, timing, status, and pseudonymous user identifiers when needed for security investigation, but must not contain access tokens, passwords, email addresses, barcodes, request or response bodies, food names, meal details, nutrition data, or third-party API keys.

Before public release, Bitebook will publish a privacy notice describing the collected data, service providers, retention periods, account-deletion process, and contact method. Security verification will include unauthenticated API tests, cross-user access tests, input-validation tests, secret scanning, and inspection of representative logs for prohibited data.

## Testing and Operations

Amazon CloudWatch will collect backend logs and metrics from API Gateway and Lambda. Application logs will be structured and limited to operational information such as request identifiers, operation names, latency, external-service outcomes, stock-update outcomes, and unexpected errors. Logs must not contain authentication tokens, email addresses, request bodies, meal details, or nutrition data, and will initially be retained for 30 days.

CloudWatch metrics and alarms will monitor API and Lambda request volume, errors, latency, and throttling, along with failures when communicating with USDA FoodData Central. Testing will include unit tests, iOS and Android device and simulator testing, and backend API integration testing. Backup and recovery procedures will cover DynamoDB point-in-time recovery.

