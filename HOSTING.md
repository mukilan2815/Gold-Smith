# Hosting Your Goldsmith Assistant Application

## Overview

This guide provides instructions for hosting your Goldsmith Assistant application. The application has been configured to use MongoDB as its database and can be deployed to Vercel, which is the recommended hosting platform for Next.js applications.

## Quick Start

We've prepared everything you need to deploy your application:

1. Run the deployment helper script:
   ```bash
   npm run deploy
   ```

   This script will:
   - Check your MongoDB configuration
   - Verify Vercel CLI installation (and install it if needed)
   - Build your application
   - Guide you through the Vercel deployment process

## Manual Deployment Steps

### 1. Set Up MongoDB Atlas

1. Create a MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Set up a new cluster (the free tier is sufficient for starting)
3. Create a database user and get your connection string
4. Update the `.env` file with your MongoDB connection string

### 2. Deploy to Vercel

1. Create a Vercel account at [https://vercel.com](https://vercel.com)
2. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Build your application:
   ```bash
   npm run build
   ```
4. Deploy to Vercel:
   ```bash
   vercel
   ```
5. Follow the prompts to complete the deployment

## Environment Variables

Ensure these environment variables are set in your Vercel project:

- `MONGODB_URI`: Your MongoDB connection string

## Detailed Instructions

For more detailed deployment instructions, please refer to the [DEPLOYMENT.md](./DEPLOYMENT.md) file.

## Testing Your Deployment

After deployment, verify that:

1. The application loads correctly
2. User authentication works
3. Data is being saved to and retrieved from MongoDB

## Troubleshooting

If you encounter issues during deployment:

1. Check the Vercel deployment logs
2. Verify your MongoDB connection string is correct
3. Ensure all environment variables are properly set

## Need Help?

If you need further assistance with deployment, please refer to:

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)