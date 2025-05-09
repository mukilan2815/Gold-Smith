
# Firebase Studio - Goldsmith Assistant

This is a Next.js starter application for a Goldsmith Assistant, built within Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later recommended)
- npm (usually comes with Node.js) or yarn

## Firebase Setup

1.  **Create a Firebase Project:** If you haven't already, create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  **Enable Firestore:** In your Firebase project, navigate to Firestore Database and create a database. Start in test mode for initial development if preferred, but remember to set up security rules for production.
3.  **Enable Authentication:** If you plan to use Firebase Authentication (recommended), enable it in the Authentication section of your Firebase project. Configure your desired sign-in methods.
4.  **Get Firebase Configuration:** In your Firebase project settings (Project settings > General tab), find your web app's Firebase configuration snippet. You'll need these values for the environment variables.

## Environment Variables

Create a `.env` file in the root of your project and add your Firebase project configuration details. This file is ignored by Git by default.

```env
# Firebase Configuration - Get these from your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID" # Optional

# Genkit / Google AI API Key (if using GenAI features)
# Get this from Google AI Studio or Google Cloud Console
GOOGLE_GENAI_API_KEY="YOUR_GOOGLE_GENAI_API_KEY"
```

**Important:**
- Replace `YOUR_...` placeholders with your actual Firebase and Google AI credentials.
- **Never commit your `.env` file to version control if it contains sensitive keys.**

## Installation

1.  Clone the repository (if you haven't already):
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```

2.  Install project dependencies:
    ```bash
    npm install
    ```
    or if you prefer yarn:
    ```bash
    yarn install
    ```

## Running the Application

This application consists of two main parts that might need to be run concurrently during development: the Next.js frontend and the Genkit development server (if you are using GenAI flows).

1.  **Run the Next.js Development Server:**
    This serves the main web application.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002` (as per your `package.json` script).

2.  **Run the Genkit Development Server (Optional - if using GenAI features):**
    If your application uses Genkit flows (e.g., for interacting with Large Language Models), you need to run the Genkit development server. Open a new terminal window for this.
    -   To start Genkit and have it reload on file changes:
        ```bash
        npm run genkit:watch
        ```
    -   To start Genkit without watching for changes:
        ```bash
        npm run genkit:dev
        ```
    The Genkit server typically runs on `http://localhost:3400` and provides a UI to inspect and test your flows.

## Building for Production

1.  **Build the Next.js Application:**
    ```bash
    npm run build
    ```
    This command creates an optimized production build in the `.next` folder.

2.  **Start the Production Server:**
    ```bash
    npm run start
    ```
    This command starts the Next.js production server.

## Performance Note: Firestore Indexes

For optimal performance, especially when listing and filtering data, ensure that you have created the necessary Firestore indexes. Queries involving sorting (`orderBy`) or filtering (`where`) on multiple fields often require composite indexes.

Please refer to the [Firestore Index Guide](./firestore.indexes.md) for a list of recommended indexes for this application. Missing these indexes can lead to significantly slower data retrieval and increased costs.

## Linting and Type Checking

-   To lint your code:
    ```bash
    npm run lint
    ```
-   To perform a TypeScript type check:
    ```bash
    npm run typecheck
    ```

## Project Structure

-   `src/app/`: Contains the Next.js App Router pages and layouts.
-   `src/components/`: Reusable UI components.
-   `src/components/ui/`: ShadCN UI components.
-   `src/lib/`: Utility functions, Firebase configuration.
-   `src/hooks/`: Custom React hooks.
-   `src/ai/`: Genkit related code (flows, prompts, etc.).
-   `public/`: Static assets.

Happy coding!
