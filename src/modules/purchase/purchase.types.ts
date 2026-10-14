export type PurchaseOrderStatus = "pending" | "received" | "cancelled";
export type PurchaseOrderItem = {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    expirationDate?: string;
    subtotal: number;
};
export type CreatePurchaseOrderInput = {
    supplierId: string;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        expirationDate?: string;
    }[];
};
export type PurchaseOrderResponse = {
    id: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseOrderItem[];
    total: number;
    status: PurchaseOrderStatus;
    createdAt: string;
    receivedAt?: string;
};
