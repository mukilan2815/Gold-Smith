import mongoose, { Schema, Document, model, Model } from 'mongoose';

// Client Schema
export interface IClient extends Document {
  shopName: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    shopName: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    address: { type: String, required: false, trim: true },
  },
  { timestamps: true }
);

// Create indexes for better performance
ClientSchema.index({ clientName: 1 });
ClientSchema.index({ shopName: 1 });
ClientSchema.index({ phoneNumber: 1 });

// Client Receipt Item Schema (embedded in ClientBill)
interface IReceiptItem {
  itemName: string;
  tag: string;
  grossWt: number;
  stoneWt: number;
  meltingTouch: number; // Percentage
  stoneAmt: number;
}

const ReceiptItemSchema = new Schema<IReceiptItem>({
  itemName: { type: String, required: true, trim: true },
  tag: { type: String, required: false, trim: true },
  grossWt: { type: Number, required: true },
  stoneWt: { type: Number, required: false, default: 0 },
  meltingTouch: { type: Number, required: true }, // Percentage
  stoneAmt: { type: Number, required: false, default: 0 },
});

// Client Bill (Receipt) Schema
export interface IClientBill extends Document {
  clientId?: mongoose.Types.ObjectId;
  clientName?: string; // For backward compatibility
  clientInfo: {
    clientName: string;
    shopName?: string;
    phoneNumber?: string;
  };
  metalType: string;
  issueDate: Date;
  items: IReceiptItem[];
  totals: {
    grossWt: number;
    stoneWt: number;
    netWt: number;
    finalWt: number;
    stoneAmt: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ClientBillSchema = new Schema<IClientBill>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
    clientName: { type: String, trim: true }, // For backward compatibility
    clientInfo: {
      clientName: { type: String, required: true, trim: true },
      shopName: { type: String, required: false, trim: true, default: '' },
      phoneNumber: { type: String, required: false, trim: true, default: '' },
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

// Create indexes for better performance
ClientBillSchema.index({ clientId: 1 });
ClientBillSchema.index({ 'clientInfo.clientName': 1 });
ClientBillSchema.index({ issueDate: 1 });
ClientBillSchema.index({ metalType: 1 });

// Admin Bill Item Schema (embedded in AdminBill)
interface IAdminBillItem {
  itemName: string;
  weight: number;
  description?: string;
}

const AdminBillItemSchema = new Schema<IAdminBillItem>({
  itemName: { type: String, required: true, trim: true },
  weight: { type: Number, required: true },
  description: { type: String, required: false, trim: true },
});

// Admin Bill Schema
export interface IAdminBill extends Document {
  clientId: mongoose.Types.ObjectId;
  clientInfo: {
    clientName: string;
    shopName?: string;
    phoneNumber?: string;
  };
  issueDate: Date;
  given: {
    items: IAdminBillItem[];
    total: number;
  };
  received: {
    items: IAdminBillItem[];
    total: number;
  };
  status: 'empty' | 'incomplete' | 'complete';
  createdAt: Date;
  updatedAt: Date;
}

const AdminBillSchema = new Schema<IAdminBill>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    clientInfo: {
      clientName: { type: String, required: true, trim: true },
      shopName: { type: String, required: false, trim: true },
      phoneNumber: { type: String, required: false, trim: true },
    },
    issueDate: { type: Date, required: true },
    given: {
      items: [AdminBillItemSchema],
      total: { type: Number, required: true, default: 0 },
    },
    received: {
      items: [AdminBillItemSchema],
      total: { type: Number, required: true, default: 0 },
    },
    status: {
      type: String,
      enum: ['empty', 'incomplete', 'complete'],
      default: 'empty',
    },
  },
  { timestamps: true }
);

// Create indexes for better performance
AdminBillSchema.index({ clientId: 1 });
AdminBillSchema.index({ 'clientInfo.clientName': 1 });
AdminBillSchema.index({ issueDate: 1 });
AdminBillSchema.index({ status: 1 });

// Create models
// We need to check if the models are already defined to prevent errors during hot reloading
let Client: Model<IClient>;
let ClientBill: Model<IClientBill>;
let AdminBill: Model<IAdminBill>;

// This prevents errors when the code is reloaded in development
if (mongoose.models.Client) {
  Client = mongoose.model<IClient>('Client');
} else {
  Client = mongoose.model<IClient>('Client', ClientSchema);
}

if (mongoose.models.ClientBill) {
  ClientBill = mongoose.model<IClientBill>('ClientBill');
} else {
  ClientBill = mongoose.model<IClientBill>('ClientBill', ClientBillSchema, 'client_bills');
}

if (mongoose.models.AdminBill) {
  AdminBill = mongoose.model<IAdminBill>('AdminBill');
} else {
  AdminBill = mongoose.model<IAdminBill>('AdminBill', AdminBillSchema, 'admin_bills');
}

export { Client, ClientBill, AdminBill };