#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔶 Goldsmith Assistant Deployment Helper 🔶\n');
console.log('This script will help you deploy your Goldsmith Assistant application to Vercel.\n');

// Check if Vercel CLI is installed
const checkVercelCLI = () => {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
};

// Main function
const main = async () => {
  // Step 1: Check MongoDB URI
  console.log('Step 1: Checking MongoDB configuration...');
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  if (!envContent.includes('MONGODB_URI=mongodb+srv://')) {
    console.log('\n⚠️ Your MongoDB URI is not properly configured in .env file.');
    console.log('Please update it before deploying.\n');
    
    rl.question('Do you have a MongoDB Atlas account? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'n') {
        console.log('\nPlease sign up for MongoDB Atlas at https://www.mongodb.com/cloud/atlas');
        console.log('Then update your .env file with the connection string.\n');
      } else {
        console.log('\nPlease update your .env file with your MongoDB connection string.\n');
      }
      
      console.log('Refer to the DEPLOYMENT.md file for detailed instructions.\n');
      rl.close();
    });
    return;
  }
  
  // Step 2: Check if Vercel CLI is installed
  console.log('Step 2: Checking Vercel CLI installation...');
  if (!checkVercelCLI()) {
    console.log('\n⚠️ Vercel CLI is not installed. Installing now...\n');
    try {
      execSync('npm install -g vercel', { stdio: 'inherit' });
      console.log('\n✅ Vercel CLI installed successfully!\n');
    } catch (error) {
      console.error('\n❌ Failed to install Vercel CLI. Please install it manually:\n');
      console.log('npm install -g vercel\n');
      rl.close();
      return;
    }
  } else {
    console.log('✅ Vercel CLI is already installed.\n');
  }
  
  // Step 3: Build the application
  console.log('Step 3: Building the application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\n✅ Application built successfully!\n');
  } catch (error) {
    console.error('\n❌ Build failed. Please fix the errors and try again.\n');
    rl.close();
    return;
  }
  
  // Step 4: Deploy to Vercel
  console.log('Step 4: Deploying to Vercel...');
  console.log('\nYou will be guided through the Vercel deployment process.\n');
  
  rl.question('Ready to deploy? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      try {
        console.log('\nStarting Vercel deployment...\n');
        execSync('vercel', { stdio: 'inherit' });
        console.log('\n✅ Deployment initiated! Follow the instructions in your terminal.\n');
      } catch (error) {
        console.error('\n❌ Deployment failed. Please try again or deploy manually.\n');
        console.log('Refer to the DEPLOYMENT.md file for manual deployment instructions.\n');
      }
    } else {
      console.log('\nDeployment cancelled. You can deploy manually later.\n');
      console.log('Refer to the DEPLOYMENT.md file for manual deployment instructions.\n');
    }
    rl.close();
  });
};

// Run the main function
main().catch(error => {
  console.error('An error occurred:', error);
  rl.close();
});