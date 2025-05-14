import { connectToDatabase } from '../mongoose';
import { Client, ClientBill, AdminBill, IClient, IClientBill, IAdminBill } from '../models/mongoose-schemas';
import mongoose from 'mongoose';

// Client Services
export async function createClient(clientData: Partial<IClient>) {
  await connectToDatabase();
  const client = new Client(clientData);
  await client.save();
  return client;
}

export async function getClientById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return Client.findById(id);
}

export async function getAllClients() {
  await connectToDatabase();
  return Client.find({});
}

export async function searchClients(query: any) {
  await connectToDatabase();
  const searchQuery: any = {};
  
  if (query.shopName) searchQuery.shopName = new RegExp(query.shopName, 'i');
  if (query.clientName) searchQuery.clientName = new RegExp(query.clientName, 'i');
  if (query.phoneNumber) searchQuery.phoneNumber = new RegExp(query.phoneNumber, 'i');
  
  return Client.find(searchQuery);
}

export async function updateClient(id: string, clientData: Partial<IClient>) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return Client.findByIdAndUpdate(id, clientData, { new: true });
}

export async function deleteClient(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  await connectToDatabase();
  const result = await Client.findByIdAndDelete(id);
  return !!result;
}

// Client Bill (Receipt) Services
export async function createClientBill(billData: Partial<IClientBill>) {
  await connectToDatabase();
  
  // Ensure clientInfo exists
  if (!billData.clientInfo) {
    billData.clientInfo = {
      clientName: billData.clientName || 'Unknown Client',
      shopName: '',
      phoneNumber: ''
    };
  }
  
  // If clientId is provided and valid, fetch client information to ensure clientInfo is complete
  if (billData.clientId && mongoose.Types.ObjectId.isValid(billData.clientId.toString())) {
    const client = await Client.findById(billData.clientId);
    
    if (client) {
      // Ensure clientInfo is populated with the latest client data
      billData.clientInfo = {
        clientName: client.clientName,
        shopName: client.shopName || '',
        phoneNumber: client.phoneNumber || ''
      };
    }
  } else if (billData.clientName) {
    // If clientId is invalid but clientName is provided, use it directly
    billData.clientInfo.clientName = billData.clientName;
  }
  
  const bill = new ClientBill(billData);
  await bill.save();
  return bill;
}

export async function getClientBillById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  
  // Find the receipt and populate client information from the Client model
  const receipt = await ClientBill.findById(id);
  
  if (receipt) {
    // Ensure clientInfo exists
    if (!receipt.clientInfo) {
      receipt.clientInfo = {
        clientName: receipt.clientName || 'Unknown Client',
        shopName: '',
        phoneNumber: ''
      };
    }
    
    // If clientId is valid, fetch client information
    if (receipt.clientId && mongoose.Types.ObjectId.isValid(receipt.clientId.toString())) {
      // Fetch client information separately
      const client = await Client.findById(receipt.clientId);
      
      // Update clientInfo with the latest client data if available
      if (client) {
        receipt.clientInfo = {
          clientName: client.clientName,
          shopName: client.shopName || '',
          phoneNumber: client.phoneNumber || ''
        };
      }
    } else if (receipt.clientName && (!receipt.clientInfo.clientName || receipt.clientInfo.clientName === 'Unknown Client')) {
      // If clientId is invalid but receipt has clientName, use it directly
      receipt.clientInfo.clientName = receipt.clientName;
    }
  }
  
  return receipt;
}

export async function getClientBillsByClientId(clientId: string) {
  if (!mongoose.Types.ObjectId.isValid(clientId)) return [];
  await connectToDatabase();
  return ClientBill.find({ clientId });
}

export async function getAllClientBills() {
  await connectToDatabase();
  return ClientBill.find({});
}

export async function searchClientBills(query: any) {
  await connectToDatabase();
  const searchQuery: any = {};
  
  if (query.clientId && mongoose.Types.ObjectId.isValid(query.clientId)) {
    searchQuery.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  
  if (query.clientName) searchQuery['clientInfo.clientName'] = new RegExp(query.clientName, 'i');
  if (query.metalType) searchQuery.metalType = new RegExp(query.metalType, 'i');
  
  if (query.fromDate || query.toDate) {
    searchQuery.issueDate = {};
    if (query.fromDate) searchQuery.issueDate.$gte = new Date(query.fromDate);
    if (query.toDate) searchQuery.issueDate.$lte = new Date(query.toDate);
  }
  
  return ClientBill.find(searchQuery);
}

export async function updateClientBill(id: string, billData: Partial<IClientBill>) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return ClientBill.findByIdAndUpdate(id, billData, { new: true });
}

export async function deleteClientBill(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  await connectToDatabase();
  const result = await ClientBill.findByIdAndDelete(id);
  return !!result;
}

// Admin Bill Services
export async function createAdminBill(billData: Partial<IAdminBill>) {
  await connectToDatabase();
  const bill = new AdminBill(billData);
  await bill.save();
  return bill;
}

export async function getAdminBillById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return AdminBill.findById(id);
}

export async function getAdminBillsByClientId(clientId: string) {
  if (!mongoose.Types.ObjectId.isValid(clientId)) return [];
  await connectToDatabase();
  return AdminBill.find({ clientId });
}

export async function getAllAdminBills() {
  await connectToDatabase();
  return AdminBill.find({});
}

export async function searchAdminBills(query: any) {
  await connectToDatabase();
  const searchQuery: any = {};
  
  if (query.clientId && mongoose.Types.ObjectId.isValid(query.clientId)) {
    searchQuery.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  
  if (query.clientName) searchQuery['clientInfo.clientName'] = new RegExp(query.clientName, 'i');
  if (query.status) searchQuery.status = query.status;
  
  if (query.fromDate || query.toDate) {
    searchQuery.issueDate = {};
    if (query.fromDate) searchQuery.issueDate.$gte = new Date(query.fromDate);
    if (query.toDate) searchQuery.issueDate.$lte = new Date(query.toDate);
  }
  
  return AdminBill.find(searchQuery);
}

export async function updateAdminBill(id: string, billData: Partial<IAdminBill>) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectToDatabase();
  return AdminBill.findByIdAndUpdate(id, billData, { new: true });
}

export async function deleteAdminBill(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  await connectToDatabase();
  const result = await AdminBill.findByIdAndDelete(id);
  return !!result;
}