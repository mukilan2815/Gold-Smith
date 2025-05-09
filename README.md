
# Firebase Studio - Goldsmith Assistant

This is a Next.js starter application for a Goldsmith Assistant, built within Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later recommended)
- npm (usually comes with Node.js) or yarn

## Firebase Setup (Current)

**Note:** The application is currently configured to use Firebase Firestore. If you are migrating to a local SQL database, refer to the "Migrating to a Local SQL Database" section below.

1.  **Create a Firebase Project:** If you haven't already, create a new project in the [Firebase Console](https://console.firebase.google.com/).
2.  **Enable Firestore:** In your Firebase project, navigate to Firestore Database and create a database. Start in test mode for initial development if preferred, but remember to set up security rules for production.
3.  **Enable Authentication:** If you plan to use Firebase Authentication (recommended), enable it in the Authentication section of your Firebase project. Configure your desired sign-in methods.
4.  **Get Firebase Configuration:** In your Firebase project settings (Project settings > General tab), find your web app's Firebase configuration snippet. You'll need these values for the environment variables.

## Environment Variables

Create a `.env` file in the root of your project and add your Firebase project configuration details. This file is ignored by Git by default.

**For Firebase Usage:**
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

**For Local SQL Database Usage (after migration):**
If you migrate to a local SQL database, you will need to define an environment variable for your database connection string (e.g., `DATABASE_URL`). The specific format will depend on the SQL database and ORM/driver used.
Example:
```env
# Example for PostgreSQL with Prisma
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
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

**If using a local SQL database after migration:** Ensure your local SQL database server is running before starting the Next.js application.

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

## Performance Note: Firestore Indexes (If using Firebase)

For optimal performance, especially when listing and filtering data, ensure that you have created the necessary Firestore indexes. Queries involving sorting (`orderBy`) or filtering (`where`) on multiple fields often require composite indexes.

Please refer to the [Firestore Index Guide](./firestore.indexes.md) for a list of recommended indexes for this application. Missing these indexes can lead to significantly slower data retrieval and increased costs.

## Migrating to a Local SQL Database

You have requested to migrate the application from Firebase Firestore to a local SQL database. To proceed with this significant architectural change, please provide the following information:

1.  **Type of SQL Database:**
    Specify which SQL database you intend to use locally (e.g., PostgreSQL, MySQL, SQLite). If you don't have a preference, SQLite is often simplest for local development.
2.  **Environment Variable Name for Connection String:**
    Provide the name you'd like to use for the environment variable that will store your database connection string (e.g., `DATABASE_URL`). **Do not provide the actual connection string or any sensitive credentials.** This name will be used as a placeholder in the code.

Once this information is available, the migration process will involve:
*   Removing Firebase SDK and Firestore-related data access code.
*   Adding a new SQL database client setup (e.g., using Prisma or a similar ORM, depending on your chosen SQL database).
*   Refactoring existing data fetching and mutation logic to use the new SQL database client.
*   Providing an example schema definition for your tables based on the existing Firestore collections.

**Your Responsibilities During Migration:**
*   **Install and Set Up SQL Database:** You will need to install and configure your chosen SQL database server locally.
*   **Create Database and Tables:** You'll be responsible for creating the database and its tables, potentially using migrations generated by an ORM.
*   **Manage Connection Details:** You will need to set the actual database connection string in your local `.env` file.
*   **Data Migration:** If you have existing data in Firestore, you will need to handle migrating it to your new SQL database.

The current authentication mechanism (using localStorage) will remain unchanged unless you request modifications.

Please provide the requested details so the refactoring can begin.

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
-   `src/lib/`: Utility functions, Firebase configuration (to be replaced/modified during SQL migration).
-   `src/hooks/`: Custom React hooks.
-   `src/ai/`: Genkit related code (flows, prompts, etc.).
-   `public/`: Static assets.

Happy coding!
    