// CommonJS version of the update-client-bills script
// No dotenv dependency to avoid errors

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldsmith';

// Define schemas directly in this file to avoid import issues
const { Schema } = mongoose;

// Client Schema
const ClientSchema = new Schema(
  {
    shopName: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    address: { type: String, required: false, trim: true },
  },
  { timestamps: true }
);

// Client Receipt Item Schema (embedded in ClientBill)
const ReceiptItemSchema = new Schema({
  itemName: { type: String, required: true, trim: true },
  tag: { type: String, required: false, trim: true },
  grossWt: { type: Number, required: true },
  stoneWt: { type: Number, required: false, default: 0 },
  meltingTouch: { type: Number, required: true }, // Percentage
  stoneAmt: { type: Number, required: false, default: 0 },
});

// Client Bill Schema
const ClientBillSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    clientInfo: {
      clientName: { type: String, required: true, trim: true },
      shopName: { type: String, required: false, trim: true },
      phoneNumber: { type: String, required: false, trim: true },
    },
    metalType: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    items: [ReceiptItemSchema],
    totals: {
      grossWt: { type: Number, required: true, default: 0 },
      stoneWt: { type: Number, required: true, default: 0 },
      netWt: { type: Number, required: true, default: 0 },
      finalWt: { type: Number, required: true, default: 0 },
      stoneAmt: { type: Number, required: true, default: 0 },
    },
  },
  { timestamps: true }
);

/**
 * Connect to MongoDB using Mongoose
 */
async function connectToDatabase() {
  try {
    // Set strictQuery to prepare for Mongoose 7
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    
    console.log('Connected to MongoDB via Mongoose');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Migration script to update all existing client bills with the correct client information
 * from the clients collection.
 * 
 * This script will:
 * 1. Connect to the database
 * 2. Find all client bills
 * 3. For each bill, fetch the client information from the clients collection
 * 4. Update the clientInfo field with the correct information
 * 5. Save the updated bill
 */
async function updateClientBills() {
  try {
    console.log('Connecting to database...');
    await connectToDatabase();
    console.log('Connected to database');
    
    // Create models with the schemas
    // Use the third parameter to specify the collection name for ClientBill
    const Client = mongoose.model('Client', ClientSchema);
    const ClientBill = mongoose.model('ClientBill', ClientBillSchema, 'client_bills');
    
    // Get all client bills
    const bills = await ClientBill.find({});
    console.log(`Found ${bills.length} client bills to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each bill
    for (const bill of bills) {
      try {
        if (!bill.clientId || !mongoose.Types.ObjectId.isValid(bill.clientId.toString())) {
          console.log(`Skipping bill ${bill._id}: Invalid or missing clientId`);
          skippedCount++;
          continue;
        }
        
        // Fetch client information
        const client = await Client.findById(bill.clientId);
        
        if (!client) {
          console.log(`Skipping bill ${bill._id}: Client not found with ID ${bill.clientId}`);
          skippedCount++;
          continue;
        }
        
        // Update clientInfo with the latest client data
        bill.clientInfo = {
          clientName: client.clientName,
          shopName: client.shopName,
          phoneNumber: client.phoneNumber
        };
        
        // Save the updated bill
        await bill.save();
        updatedCount++;
        console.log(`Updated bill ${bill._id} with client info for ${client.clientName}`);
      } catch (error) {
        console.error(`Error updating bill ${bill._id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\nMigration completed:');
    console.log(`- Updated: ${updatedCount} bills`);
    console.log(`- Skipped: ${skippedCount} bills`);
    console.log(`- Errors: ${errorCount} bills`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
updateClientBills();