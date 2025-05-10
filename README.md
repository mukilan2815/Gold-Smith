
# Firebase Studio - Goldsmith Assistant (MongoDB Version)

This is a Next.js starter application for a Goldsmith Assistant, built within Firebase Studio.

**IMPORTANT: This application is being migrated to use MongoDB as its database.**

To get started, take a look at `src/app/page.tsx`.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later recommended)
- npm (usually comes with Node.js) or yarn
- MongoDB (either a local instance or access to a MongoDB Atlas cluster)

## MongoDB Setup (Migration In Progress)

The application is being migrated to use MongoDB. You will need to set up your MongoDB instance (local or cloud-based like MongoDB Atlas) and configure the application to connect to it.

**To complete the migration, please provide the following information:**

1.  **Environment Variable Name for MongoDB Connection String:**
    Provide the name you'd like to use for the environment variable that will store your MongoDB connection string (e.g., `MONGODB_URI`). **Do not provide the actual connection string or any sensitive credentials.** This name will be used as a placeholder in the code.

**Once you provide this information, the next steps will involve:**
*   Adding a MongoDB client setup (e.g., using the official `mongodb` driver or an ODM like Mongoose).
*   Refactoring existing data fetching and mutation logic (currently placeholder comments) to use the new MongoDB client.
*   Defining schemas/models if using an ODM.

**Your Responsibilities (After providing the above details and receiving updated code):**
*   **Install and Set Up MongoDB:** You will need to install and configure MongoDB locally or set up a MongoDB Atlas cluster.
*   **Create Database and Collections:** You'll be responsible for creating the database and collections.
*   **Manage Connection Details:** You will need to set the actual MongoDB connection string in your local `.env` file using the environment variable name you provide.
*   **Data Migration:** If you have existing data in Firestore or a SQL database that you wish to keep, you will need to handle migrating it to your new MongoDB database. This process is not covered by the automated refactoring.

The current authentication mechanism (using localStorage) will remain unchanged unless you request modifications.

**Please provide the requested detail (environment variable name for the MongoDB connection string) so the refactoring to integrate MongoDB can proceed.**

## Environment Variables

Create a `.env` file in the root of your project. This file is ignored by Git by default.

**For MongoDB Usage (after providing details and receiving updated code):**
You will need to define an environment variable for your MongoDB connection string. The name of this variable should be what you provide in the step above.
Example (if you chose `MONGODB_URI`):
```env
MONGODB_URI="mongodb://USER:PASSWORD@HOST:PORT/DATABASE_NAME?authSource=admin"
# For MongoDB Atlas, the connection string will look different:
# MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER_HOSTNAME/DATABASE_NAME?retryWrites=true&w=majority"

# Genkit / Google AI API Key (if using GenAI features)
# Get this from Google AI Studio or Google Cloud Console
GOOGLE_GENAI_API_KEY="YOUR_GOOGLE_GENAI_API_KEY"
```

**Important:**
- Replace `USER`, `PASSWORD`, `HOST`, `PORT`, `DATABASE_NAME`, `CLUSTER_HOSTNAME` placeholders with your actual credentials and details.
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

1.  **Ensure your MongoDB Instance is Running and Accessible:**
    Before starting the Next.js application, make sure your MongoDB server (local or Atlas) is running and accessible.

2.  **Run the Next.js Development Server:**
    This serves the main web application.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002` (as per your `package.json` script).

3.  **Run the Genkit Development Server (Optional - if using GenAI features):**
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
    This command starts the Next.js production server. Ensure your MongoDB database is configured and accessible for the production environment.

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
-   `src/lib/`: Utility functions. (Database configuration for MongoDB will be added here).
-   `src/hooks/`: Custom React hooks.
-   `src/ai/`: Genkit related code (flows, prompts, etc.).
-   `public/`: Static assets.

Happy coding!
