import { Collection, ObjectId } from 'mongodb';
import clientPromise from '../mongodb';
import { Receipt, ReceiptWithId, mapReceiptToReceiptWithId } from '../models/receipt';

// Database and collection names
const DB_NAME = 'goldsmith';
const RECEIPTS_COLLECTION = 'receipts';

// Get receipts collection
async function getReceiptsCollection(): Promise<Collection<Receipt>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Receipt>(RECEIPTS_COLLECTION);
}

// Create a new receipt
export async function createReceipt(receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'>): Promise<ReceiptWithId> {
  const collection = await getReceiptsCollection();
  
  const now = new Date();
  const newReceipt: Receipt = {
    ...receiptData,
    createdAt: now,
    updatedAt: now
  };
  
  const result = await collection.insertOne(newReceipt);
  
  return mapReceiptToReceiptWithId({
    ...newReceipt,
    _id: result.insertedId
  });
}

// Get all receipts
export async function getAllReceipts(): Promise<ReceiptWithId[]> {
  const collection = await getReceiptsCollection();
  const receipts = await collection.find({}).toArray();
  return receipts.map(mapReceiptToReceiptWithId);
}

// Get receipt by ID
export async function getReceiptById(id: string): Promise<ReceiptWithId | null> {
  try {
    const collection = await getReceiptsCollection();
    const receipt = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!receipt) return null;
    
    return mapReceiptToReceiptWithId(receipt);
  } catch (error) {
    console.error('Error fetching receipt by ID:', error);
    return null;
  }
}

// Get receipts by client ID
export async function getReceiptsByClientId(clientId: string): Promise<ReceiptWithId[]> {
  try {
    const collection = await getReceiptsCollection();
    const receipts = await collection.find({ clientId }).toArray();
    return receipts.map(mapReceiptToReceiptWithId);
  } catch (error) {
    console.error('Error fetching receipts by client ID:', error);
    return [];
  }
}

// Update receipt
export async function updateReceipt(id: string, receiptData: Partial<Omit<Receipt, '_id' | 'createdAt'>>): Promise<ReceiptWithId | null> {
  try {
    const collection = await getReceiptsCollection();
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...receiptData,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result) return null;
    
    return mapReceiptToReceiptWithId(result);
  } catch (error) {
    console.error('Error updating receipt:', error);
    return null;
  }
}

// Delete receipt
export async function deleteReceipt(id: string): Promise<boolean> {
  try {
    const collection = await getReceiptsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return false;
  }
}

// Search receipts by filter criteria
export async function searchReceipts(filters: {
  clientId?: string;
  clientName?: string;
  metalType?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<ReceiptWithId[]> {
  const collection = await getReceiptsCollection();
  
  // Build query based on provided filters
  const query: any = {};
  
  if (filters.clientId) {
    query.clientId = filters.clientId;
  }
  
  if (filters.clientName) {
    query.clientName = { $regex: filters.clientName, $options: 'i' };
  }
  
  if (filters.metalType) {
    query.metalType = { $regex: filters.metalType, $options: 'i' };
  }
  
  // Date range query if provided
  if (filters.fromDate || filters.toDate) {
    query.issueDate = {};
    
    if (filters.fromDate) {
      query.issueDate.$gte = filters.fromDate;
    }
    
    if (filters.toDate) {
      query.issueDate.$lte = filters.toDate;
    }
  }
  
  const receipts = await collection.find(query).toArray();
  return receipts.map(mapReceiptToReceiptWithId);
}