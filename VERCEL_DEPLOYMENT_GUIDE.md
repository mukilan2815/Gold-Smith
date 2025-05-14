# Vercel Deployment Guide for Goldsmith Assistant

## Prerequisites

✅ You have already updated your MongoDB connection from local to Atlas:
```
MONGODB_URI=mongodb+srv://Vignesh:vignesh@1801%23@cluster0.6fjqe2e.mongodb.net/goldsmith?retryWrites=true&w=majority&appName=Cluster0
```

## Deployment Steps

### 1. Prepare Your Application

Your application already has the necessary configuration files for Vercel deployment:
- `vercel.json` - Contains the build configuration
- `next.config.ts` - Contains Next.js specific settings

### 2. Deploy Using Vercel CLI (Recommended)

You can use the built-in deployment script:

```bash
npm run deploy
```

This script will:
1. Check your MongoDB configuration
2. Install Vercel CLI if needed
3. Build your application
4. Guide you through the Vercel deployment process

### 3. Manual Deployment to Vercel

Alternatively, you can deploy manually:

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy your application:
   ```bash
   vercel
   ```

4. Follow the prompts to complete the deployment

### 4. Set Up Environment Variables in Vercel

During deployment, Vercel will ask you to set up environment variables. Make sure to add:

- `MONGODB_URI`: Your MongoDB Atlas connection string

You can also set these up in the Vercel dashboard after deployment:
1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add your MongoDB Atlas connection string as `MONGODB_URI`

### 5. Verify Your Deployment

1. Once deployment is complete, Vercel will provide you with a URL
2. Visit the URL to ensure your application is working correctly
3. Test all functionality to verify everything is working as expected

## Troubleshooting

### MongoDB Connection Issues

If your application cannot connect to MongoDB Atlas:

1. Verify your MongoDB Atlas connection string is correct
2. Ensure your MongoDB Atlas cluster is running
3. Check that your IP address is whitelisted in MongoDB Atlas Network Access settings (or set it to allow access from anywhere for testing)
4. Verify that the environment variables are correctly set in Vercel

### Special Characters in Connection String

Your current connection string contains special characters (`%23` which is the URL-encoded form of `#`). Make sure these are properly encoded when setting up in Vercel.

### Deployment Failures

If your deployment fails:

1. Check the build logs in Vercel
2. Ensure all dependencies are correctly listed in your package.json
3. Verify that your Next.js application builds successfully locally with `npm run build`

## Next Steps

After successful deployment:

1. Set up a custom domain (if needed)
2. Configure continuous deployment from your GitHub repository
3. Set up monitoring and analytics in Vercel dashboard

---

Congratulations! Your Goldsmith Assistant application should now be successfully deployed to Vercel with MongoDB Atlas as the database backend.