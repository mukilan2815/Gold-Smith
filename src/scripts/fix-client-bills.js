/**
 * Migration script to fix client bills with invalid clientIds and missing clientInfo fields.
 * 
 * This script addresses two issues:
 * 1. Receipts showing "Name: N/A" despite clientBills having clientName
 * 2. Missing shop name and phone number in client bills page
 * 
 * The script will:
 * 1. Connect to the database
 * 2. Find all client bills
 * 3. For each bill:
 *    a. If clientId is invalid (e.g., "temp-hdgbjzs64"), update it to use clientName directly
 *    b. If clientInfo fields are empty, populate them from the client collection if possible
 *    c. Ensure clientName is always available in clientInfo
 * 4. Save the updated bill
 */

const mongoose = require('mongoose');

// MongoDB connection string - can be overridden with environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goldsmith';

// Define schemas directly in this file to avoid import issues
const { Schema } = mongoose;

// Client Schema
const ClientSchema = new Schema({
  clientName: { type: String, required: true, trim: true },
  shopName: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  address: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Client Receipt Item Schema (embedded in ClientBill)
const ReceiptItemSchema = new Schema({
  itemName: { type: String, required: true },
  tag: { type: String },
  grossWt: { type: Number, required: true },
  stoneWt: { type: Number, default: 0 },
  meltingTouch: { type: Number, required: true },
  stoneAmt: { type: Number, default: 0 }
});

// Client Bill Schema
const ClientBillSchema = new Schema({
  clientId: { type: Schema.Types.Mixed }, // Allow both ObjectId and string for migration
  clientInfo: {
    clientName: { type: String, required: true, trim: true },
    shopName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true }
  },
  metalType: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  items: [ReceiptItemSchema],
  totals: {
    grossWt: { type: Number, default: 0 },
    stoneWt: { type: Number, default: 0 },
    netWt: { type: Number, default: 0 },
    finalWt: { type: Number, default: 0 },
    stoneAmt: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function fixClientBills() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database');
    
    // Create models with the schemas
    const Client = mongoose.model('Client', ClientSchema);
    const ClientBill = mongoose.model('ClientBill', ClientBillSchema, 'client_bills');
    
    // Get all client bills
    const bills = await ClientBill.find({});
    console.log(`Found ${bills.length} client bills to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each bill
    for (const bill of bills) {
      try {
        let needsUpdate = false;
        let clientFound = false;
        
        // Check if clientId is valid ObjectId
        const hasValidClientId = bill.clientId && mongoose.Types.ObjectId.isValid(bill.clientId.toString());
        
        // If clientId is valid, try to fetch client information
        if (hasValidClientId) {
          const client = await Client.findById(bill.clientId);
          
          if (client) {
            clientFound = true;
            
            // Update clientInfo with the latest client data
            bill.clientInfo = {
              clientName: client.clientName,
              shopName: client.shopName || '',
              phoneNumber: client.phoneNumber || ''
            };
            
            needsUpdate = true;
            console.log(`Updated bill ${bill._id} with client info for ${client.clientName}`);
          }
        }
        
        // If client not found but bill has clientName, use that directly
        if (!clientFound) {
          // Ensure clientInfo exists
          if (!bill.clientInfo) {
            bill.clientInfo = {};
          }
          
          // If bill has clientName field directly, use it for clientInfo.clientName
          if (bill.clientName) {
            bill.clientInfo.clientName = bill.clientName;
            needsUpdate = true;
            console.log(`Updated bill ${bill._id} to use direct clientName: ${bill.clientName}`);
          }
          
          // Ensure clientInfo.clientName has a value
          if (!bill.clientInfo.clientName) {
            // If we still don't have a name, use a placeholder
            bill.clientInfo.clientName = 'Unknown Client';
            needsUpdate = true;
            console.log(`Set placeholder name for bill ${bill._id}`);
          }
        }
        
        // Save the bill if it was updated
        if (needsUpdate) {
          await bill.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing bill ${bill._id}:`, error);
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
fixClientBills();