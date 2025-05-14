import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldsmith';

// Global variable to track connection status
let isConnected = false;

/**
 * Connect to MongoDB using Mongoose
 */
export async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    // Set strictQuery to prepare for Mongoose 7
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    
    isConnected = true;
    console.log('Connected to MongoDB via Mongoose');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Export the mongoose instance for use in other files
export default mongoose;