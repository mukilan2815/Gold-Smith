# How to Host Your Goldsmith Assistant Application

## Quick Start Guide

Your Goldsmith Assistant application is now ready to be hosted online. Follow these simple steps to deploy it:

### Step 1: Set Up MongoDB Database

1. Create a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (the free tier works fine)
3. Set up a database user with password
4. Get your connection string by clicking "Connect" > "Connect your application"
5. Update the `.env` file with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/goldsmith?retryWrites=true&w=majority
   ```

### Step 2: Deploy to Vercel (Recommended)

1. Create a free account on [Vercel](https://vercel.com/signup)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. From your project directory, run:
   ```bash
   vercel
   ```
4. Follow the prompts to complete the deployment
5. When asked about environment variables, make sure to add your `MONGODB_URI`

### Step 3: Access Your Hosted Application

Once deployment is complete, Vercel will provide you with a URL where your application is hosted (typically something like `https://goldsmith-assistant.vercel.app`).

## Alternative Hosting Options

### Netlify

1. Create a free account on [Netlify](https://app.netlify.com/signup)
2. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
3. From your project directory, run:
   ```bash
   netlify deploy
   ```
4. Follow the prompts to complete the deployment

### Railway

1. Create an account on [Railway](https://railway.app/)
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Login to Railway:
   ```bash
   railway login
   ```
4. Initialize and deploy your project:
   ```bash
   railway init
   railway up
   ```

## Troubleshooting

If you encounter issues during deployment:

1. Make sure your MongoDB connection string is correct
2. Check that all environment variables are properly set in your hosting platform
3. Verify that your application runs correctly locally with `npm run dev`

## Need More Help?

For more detailed instructions, refer to:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)