import { z } from 'zod';

const ROLE_VALUES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as const;
const STATUS_VALUES = ['LEAD', 'ACTIVE', 'INACTIVE'] as const;
const TYPE_VALUES = ['Retail', 'Wholesale', 'Distributor'] as const;
const MOVEMENT_VALUES = ['IN', 'OUT'] as const;
const CHALLAN_STATUS_VALUES = ['DRAFT', 'CONFIRMED', 'CANCELLED'] as const;

export const emailSchema = z.string().trim().email('Invalid email format');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().min(1, 'Name is required'),
  role: z.enum(ROLE_VALUES),
});

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required'),
  mobile: z.string().trim().min(7, 'Mobile number is required'),
  email: emailSchema,
  businessName: z.string().trim().default(''),
  gstNumber: z.string().trim().optional().nullable(),
  type: z.enum(TYPE_VALUES).default('Retail'),
  address: z.string().trim().default(''),
  status: z.enum(STATUS_VALUES).default('LEAD'),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const followUpSchema = z.object({
  note: z.string().trim().min(1, 'Note is required'),
  nextFollowDate: z.string().datetime().optional(),
});

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  sku: z.string().trim().min(1, 'SKU is required'),
  category: z.string().trim().min(1, 'Category is required'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').default(0),
  currentStock: z.number().int().nonnegative().default(0),
  minStockAlert: z.number().int().nonnegative().default(0),
  location: z.string().trim().default(''),
});

export const productUpdateSchema = productCreateSchema.partial();

export const stockMovementSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantityChanged: z
    .number()
    .int()
    .positive('Quantity must be positive'),
  movementType: z.enum(MOVEMENT_VALUES),
  reason: z.string().trim().min(1, 'Reason is required'),
});

export const challanItemSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export const challanCreateSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  items: z.array(challanItemSchema).min(1, 'At least one item is required'),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
