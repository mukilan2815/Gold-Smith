import { ObjectId } from 'mongodb';

export interface Client {
  _id?: ObjectId;
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientWithId extends Omit<Client, '_id'> {
  id: string; // String representation of MongoDB ObjectId
}

// Convert MongoDB document to client with string ID for frontend
export function mapClientToClientWithId(client: Client): ClientWithId {
  const { _id, ...rest } = client;
  return {
    ...rest,
    id: _id ? _id.toString() : '',
  };
}