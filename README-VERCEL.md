# Deploying Your Goldsmith Application to Vercel

## Overview

This guide provides step-by-step instructions for deploying your Goldsmith application to Vercel using your MongoDB Atlas database connection.

## Prerequisites

✅ **MongoDB Atlas Connection**: You've already updated your connection string from local to Atlas:
```
MONGODB_URI=mongodb+srv://Vignesh:vignesh@1801%23@cluster0.6fjqe2e.mongodb.net/goldsmith?retryWrites=true&w=majority&appName=Cluster0
```

✅ **Vercel Account**: You'll need a Vercel account (free tier is sufficient)

## Deployment Options

### Option 1: Using the Built-in Deploy Script (Recommended)

Your project already includes a deployment helper script that simplifies the process:

1. Open your terminal in the project directory
2. Run the deployment script:
   ```bash
   npm run deploy
   ```
3. Follow the prompts in the terminal

The script will:
- Verify your MongoDB Atlas connection
- Install Vercel CLI if needed
- Build your application
- Guide you through the deployment process

### Option 2: Manual Deployment

If you prefer to deploy manually:

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel
   ```

4. Follow the interactive prompts

## Important Environment Variables

During deployment, ensure these environment variables are set in Vercel:

- `MONGODB_URI`: Your MongoDB Atlas connection string

You can set these during the CLI deployment process or later in the Vercel dashboard under Project Settings → Environment Variables.

## Verifying Your Deployment

1. After deployment completes, Vercel will provide a URL to your application
2. Open the URL in your browser to verify the application works correctly
3. Test all functionality to ensure everything is working with your MongoDB Atlas database

## Troubleshooting

### Connection Issues

If you encounter database connection problems:

1. Verify your MongoDB Atlas connection string is correctly set in Vercel's environment variables
2. Check that your MongoDB Atlas cluster is running
3. Ensure your IP address is whitelisted in MongoDB Atlas Network Access settings (or set to allow access from anywhere for testing)

### Special Characters in Connection String

Your connection string contains special characters (`%23` which is the URL-encoded form of `#`). Make sure these are properly encoded in your Vercel environment variables.

## Next Steps

After successful deployment:

1. Set up a custom domain (if needed) in the Vercel dashboard
2. Configure continuous deployment from your GitHub repository
3. Set up monitoring and analytics in the Vercel dashboard

---

For more detailed information, refer to the `VERCEL_DEPLOYMENT_GUIDE.md` file in your project.