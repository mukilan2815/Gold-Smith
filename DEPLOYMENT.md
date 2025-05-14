# Goldsmith Assistant Deployment Guide

This guide will walk you through deploying your Goldsmith Assistant application to Vercel, which is the recommended hosting platform for Next.js applications.

## Prerequisites

Before deploying, ensure you have:

1. A [GitHub](https://github.com) account (for source code hosting)
2. A [Vercel](https://vercel.com) account (for deployment)
3. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (for database hosting)

## Step 1: Set Up MongoDB Atlas

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project (if needed)
3. Build a new cluster (the free tier is sufficient for starting)
4. Once your cluster is created, click on "Connect"
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<username>`, `<password>`, and `<dbname>` with your actual MongoDB username, password, and database name (goldsmith)

## Step 2: Update Environment Variables

1. Open the `.env` file in your project
2. Update the `MONGODB_URI` with your actual MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://your_actual_username:your_actual_password@your_cluster.mongodb.net/goldsmith?retryWrites=true&w=majority
   ```
3. Save the file (but don't commit it to version control with real credentials)

## Step 3: Push Your Code to GitHub

1. Create a new GitHub repository
2. Initialize Git in your project folder (if not already done):
   ```bash
   git init
   ```
3. Add all files to Git:
   ```bash
   git add .
   ```
4. Commit the changes:
   ```bash
   git commit -m "Initial commit"
   ```
5. Add your GitHub repository as a remote:
   ```bash
   git remote add origin https://github.com/yourusername/goldsmith-assistant.git
   ```
6. Push your code to GitHub:
   ```bash
   git push -u origin main
   ```

## Step 4: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next
5. Add environment variables:
   - Click on "Environment Variables"
   - Add the `MONGODB_URI` variable with your MongoDB connection string
   - Add any other environment variables from your `.env` file that are needed for production
6. Click "Deploy"

## Step 5: Verify Deployment

1. Once deployment is complete, Vercel will provide you with a URL for your application
2. Visit the URL to ensure your application is working correctly
3. Test all functionality to verify everything is working as expected

## Additional Configuration

### Custom Domain

To add a custom domain to your Vercel deployment:

1. Go to your project settings in Vercel
2. Click on "Domains"
3. Add your domain and follow the instructions to configure DNS settings

### Continuous Deployment

Vercel automatically sets up continuous deployment from your GitHub repository. Any changes pushed to your main branch will trigger a new deployment.

## Troubleshooting

### Database Connection Issues

If your application cannot connect to MongoDB:

1. Verify your MongoDB connection string is correct
2. Ensure your MongoDB Atlas cluster is running
3. Check that your IP address is whitelisted in MongoDB Atlas Network Access settings
4. Verify that the environment variables are correctly set in Vercel

### Deployment Failures

If your deployment fails:

1. Check the build logs in Vercel
2. Ensure all dependencies are correctly listed in your package.json
3. Verify that your Next.js application builds successfully locally with `npm run build`

## Maintenance

Regularly update your dependencies to ensure security and performance:

```bash
npm update
```

Monitor your application's performance and errors using Vercel's built-in analytics and logging tools.

---

Congratulations! Your Goldsmith Assistant application should now be successfully deployed to Vercel with MongoDB Atlas as the database backend.