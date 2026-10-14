export type SaleItem = {
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
};
export type CreateSaleItemInput = {
    productId: string;
    quantity: number;
};
export type PaymentMethod = "cash" | "card" | "yape" | "plin";
export type DocumentType = "dni" | "ruc" | "ce" | "passport";
export type ReceiptType = "boleta" | "factura";
export type PaymentSplit = {
    method: PaymentMethod;
    amount: number;
};
export type CreateSaleInput = {
    requestId?: string;
    receiptType: ReceiptType;
    customerDocType?: DocumentType;
    customerDocNumber?: string;
    customerName?: string;
    customerId?: string;
    items: CreateSaleItemInput[];
    paymentMethod: PaymentMethod;
    discount?: number;
    payments?: PaymentSplit[];
    batchCodes?: Record<string, string>;
};
export type SaleResponse = {
    cashierId?: number | null;
    cashSessionId?: string | null;
    receiptSeries?: string | null;
    receiptNumber?: number | null;
    id: string;
    receiptType: ReceiptType;
    customerDocType?: DocumentType;
    customerDocNumber?: string;
    customerName?: string;
    customerId?: string;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: PaymentMethod;
    payments: PaymentSplit[];
    status: "active" | "cancelled";
    createdAt: string;
    cancelledAt?: string;
};
