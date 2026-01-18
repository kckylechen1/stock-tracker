import { trpc } from "@/lib/trpc";

export interface UseWatchlistOptions {
  selectedStock: string | null;
  onSelectedStockCleared: () => void;
  onAddSuccess?: () => void;
  onAddError?: (message?: string) => void;
}

export function useWatchlist({
  selectedStock,
  onSelectedStockCleared,
  onAddSuccess,
  onAddError,
}: UseWatchlistOptions) {
  const { data: watchlist, isLoading, refetch } =
    trpc.watchlist.list.useQuery();

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: data => {
      if (data.success) {
        refetch();
        onAddSuccess?.();
      } else {
        onAddError?.(data.error);
      }
    },
  });

  const deleteMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      refetch();
      if (selectedStock) {
        const stillExists = watchlist?.some(
          item => item.stockCode === selectedStock
        );
        if (!stillExists) {
          onSelectedStockCleared();
        }
      }
    },
  });

  return { watchlist, isLoading, addMutation, deleteMutation };
}
