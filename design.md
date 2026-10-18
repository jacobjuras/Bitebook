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
- When a user logs an eaten food or meal, it appropriately updates the in-stock counts for the foods/ingredients in that meal
- When a user attempts to log an eaten food or meal, they will be prompted on whether or not they want this to update their stock; if they select yes, they will be soft-blocked from logging it if they are out of stock of any of the ingredients in the meal. This is particularly useful for logging meals in the past that you don't want to affect current stock values 
- Users can create login credentials to access their data from different devices, so their data is backed up to their account
- Users can link a Google or Apple account to use for sign-in rather than creating a Bitebook-specific username and password


## Core User Experience

#### First-time setup
First-time setup and a simple "logged out" experience should be the same. The user should be prompted to either enter their unique log-in credentials, log in with a linked google/apple account, or create an account using new login credentials.

### Core views
The app should contain five core views, separated through a bottom nav bar. From left to right, the selectable core views should be: Calendar, Pantry, Eat, Reports, Me.

#### Calendar View
The Calendar view will display the user's meal calendar, with selectable month- and day-at-a-glance views. In month view, a typical stack of Sunday-Saturday weeks with is shown, with each past day having a green or red dot indicating whether or not the user met their eating goal that day; success = calories within 5% of their goal calories (either direction). To switch to a day view, the user can just click on a specific day from the month view. To switch back to month view, can just press / swipe back. The day view will support much more than the month view. It will show 2 things: on top, a scrollable window starting at 12a and ending at 12a (the start of the next day), showing meals eaten at which times of the day. These meal cards will be clickable to open up details on the meal. On the bottom, it will have a statistical summary on the day, showing macro and mitro nutrient data. Future days can also have a warning message for when there is a food or meal planned that is out of stock.

#### Pantry View
The Pantry view will display the user's pantry-at-a-glance. It displays a list of everything the user has ever added to their pantry, with sorting options like alphabetically or most recently eaten. It also supports searching for items and updating their metadata (nutrients, stock, etc). It will also support a "stock" action to batch-execute an update of food item quantities, following a real-life grocery run. Meals themselves do not have a settable stock, they derive their stock from the minimum stock of its constituent ingredients. Future entries are considered planned until their scheduled time passes, at which point they are automatically considered eaten.

#### Eat View
The Eat view will allow the user to record an eaten meal or record a new item or food into their pantry. So it will prompt the user for what food or meal was eaten from their pantry with the option to directly add something new to their pantry from that view via barcode scan or manual entry, then let the user log it to a certain date/time or just "Now", or simply add it to the pantry without logging it as eaten. Users log meals with a future timestamp to plan out meals for the future (viewable in Calendar). 

#### Reports View
The Reports view will allow the user to view breakdowns of their eating habits. It can create reports on average caloric intake, nutrient breakdown, locked in %, etc on absolute time ranges (e.g. sept 1st to 22nd) or relative (e.g. last 7 days).

#### Me View
The Me view allows the user to configure their personal information, such as name, login credentials (if applicable), goal caloric intake, etc.

## Technical Design
#### Web/PWA Framework
Bitebook will use React with TypeScript, built using Vite. React Router will provide client-side navigation, and vite-plugin-pwa will provide the web app manifest and service-worker foundation. The frontend will build into static files and communicate with a separate backend through APIs.

#### Backend and APIs
Bitebook will use TypeScript AWS Lambda functions behind an Amazon API Gateway HTTP API. The frontend will communicate with the backend through REST-style JSON endpoints. Backend functions will enforce business rules, authorize access to user data, access persistent storage, and integrate with external services.

#### Authentication
Amazon Cognito User Pools will manage accounts, email verification, password recovery, and user sessions. Users will be able to sign in with an email and password or through linked Google and Apple accounts. Sign-in will use the OAuth authorization-code flow with PKCE. API Gateway will validate Cognito access tokens before invoking the backend, and every data operation will verify that the authenticated user owns the requested data.

#### Database and File Storage
Application data will be stored in Amazon DynamoDB using on-demand capacity. Records will be scoped to the authenticated user's Cognito identifier. Operations that must update several records together, such as recording a meal and reducing ingredient stock, will use transactional writes so that either every change succeeds or none do. Point-in-time recovery will be enabled.

Bitebook will not store user-uploaded files initially because the current requirements do not need them. The database will store barcode values and food metadata rather than barcode images. If file uploads are added later, they will use private Amazon S3 storage accessed only through authorized backend operations.

#### Hosting and Deployment
The Vite frontend build will be hosted through Amazon CloudFront with a private Amazon S3 bucket as its origin. The bucket will block public access and allow reads only from its CloudFront distribution through Origin Access Control. CloudFront will enforce HTTPS and browser security headers.

All AWS resources will be defined in TypeScript using AWS CDK and deployed to a development AWS account. Deployments will initially be run manually from the project repository; automated deployment can be added if the project later needs it. The API will accept cross-origin requests only from Bitebook's deployed frontend origins and local development origin.

#### Offline Behavior and Synchronization
Bitebook will initially be online-first. The service worker will cache the application shell and static assets so the installed app can open without a network connection, but authenticated account data and writes will require connectivity. API responses containing user data will not be stored in the service-worker cache.

When connectivity is lost, the app will preserve the currently displayed screen, disable operations that require the backend, and explain that it is offline. After reconnecting, it will fetch the current server state. Offline write queues, conflict resolution, and multi-device data merging are outside the initial scope.

## Data Models
Define the main entities, their fields, and relationships

## Security and Privacy
Describe what personal data is collected, who can access it, and how it is protected

## Testing and Operations
Cover unit tests, browser testing, monitoring, backups, and recovery

