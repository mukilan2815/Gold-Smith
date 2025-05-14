import { ObjectId } from 'mongodb';

// Base Receipt interface for MongoDB documents
export interface Receipt {
  _id?: ObjectId;
  clientId: string;
  clientName: string;
  metalType: string;
  issueDate: Date;
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Receipt with string ID for frontend use
export interface ReceiptWithId {
  id: string; // String representation of MongoDB ObjectId
  clientId: string;
  clientName: string;
  metalType: string;
  issueDate: string; // ISO string format for frontend
  totals: {
    grossWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
    stoneWt?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to convert MongoDB document to receipt with string ID for frontend
export function mapReceiptToReceiptWithId(receipt: Receipt): ReceiptWithId {
  return {
    ...receipt,
    id: receipt._id ? receipt._id.toString() : '',
    issueDate: receipt.issueDate ? receipt.issueDate.toISOString() : new Date().toISOString(),
  };
}