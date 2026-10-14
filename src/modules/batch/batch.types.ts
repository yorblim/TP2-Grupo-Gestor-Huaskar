export type BatchInput = {
    productId: string;
    code: string;
    quantity: number;
    unitCost?: number;
    expirationDate?: string;
};
export type BatchResponse = {
    id: string;
    productId: string;
    code: string;
    quantity: number;
    expirationDate: string | null;
    receivedAt: string;
};
