import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { saleService } from "../features/sales/services/saleService";
import type { CreateSaleInput } from "../features/sales/types/sale";
const SALES_KEY = "sales";
export function useSales(page = 1) {
    return useQuery({
        queryKey: [SALES_KEY, page],
        queryFn: () => saleService.getPage(page),
    });
}
export function useCreateSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateSaleInput) => saleService.create(input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [SALES_KEY] }),
    });
}
export function useCancelSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => saleService.cancel(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [SALES_KEY] }),
    });
}
export function useDeleteSale() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => saleService.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [SALES_KEY] }),
    });
}
