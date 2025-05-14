import { Collection, ObjectId } from 'mongodb';
import clientPromise from '../mongodb';
import { Client, ClientWithId, mapClientToClientWithId } from '../models/client';

// Database and collection names
const DB_NAME = 'goldsmith';
const CLIENTS_COLLECTION = 'clients';

// Get clients collection
async function getClientsCollection(): Promise<Collection<Client>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Client>(CLIENTS_COLLECTION);
}

// Create a new client
export async function createClient(clientData: Omit<Client, '_id' | 'createdAt' | 'updatedAt'>): Promise<ClientWithId> {
  const collection = await getClientsCollection();
  
  const now = new Date();
  const newClient: Client = {
    ...clientData,
    createdAt: now,
    updatedAt: now
  };
  
  const result = await collection.insertOne(newClient);
  
  return mapClientToClientWithId({
    ...newClient,
    _id: result.insertedId
  });
}

// Get all clients
export async function getAllClients(): Promise<ClientWithId[]> {
  const collection = await getClientsCollection();
  const clients = await collection.find({}).toArray();
  return clients.map(mapClientToClientWithId);
}

// Get client by ID
export async function getClientById(id: string): Promise<ClientWithId | null> {
  try {
    const collection = await getClientsCollection();
    const client = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!client) return null;
    
    return mapClientToClientWithId(client);
  } catch (error) {
    console.error('Error fetching client by ID:', error);
    return null;
  }
}

// Update client
export async function updateClient(id: string, clientData: Partial<Omit<Client, '_id' | 'createdAt'>>): Promise<ClientWithId | null> {
  try {
    const collection = await getClientsCollection();
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...clientData,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    );
    
    if (!result) return null;
    
    return mapClientToClientWithId(result);
  } catch (error) {
    console.error('Error updating client:', error);
    return null;
  }
}

// Delete client
export async function deleteClient(id: string): Promise<boolean> {
  try {
    const collection = await getClientsCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  } catch (error) {
    console.error('Error deleting client:', error);
    return false;
  }
}

// Search clients by filter criteria
export async function searchClients(filters: {
  shopName?: string;
  clientName?: string;
  phoneNumber?: string;
}): Promise<ClientWithId[]> {
  const collection = await getClientsCollection();
  
  const query: any = {};
  
  if (filters.shopName) {
    query.shopName = { $regex: filters.shopName, $options: 'i' };
  }
  
  if (filters.clientName) {
    query.clientName = { $regex: filters.clientName, $options: 'i' };
  }
  
  if (filters.phoneNumber) {
    query.phoneNumber = { $regex: filters.phoneNumber, $options: 'i' };
  }
  
  const clients = await collection.find(query).toArray();
  return clients.map(mapClientToClientWithId);
}