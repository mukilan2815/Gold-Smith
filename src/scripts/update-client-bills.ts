import { connectToDatabase } from '../lib/mongoose';
import { Client, ClientBill } from '../lib/models/mongoose-schemas';
import mongoose from 'mongoose';

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