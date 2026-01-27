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
  const utils = trpc.useUtils();
  const { data: watchlist, isLoading } = trpc.watchlist.list.useQuery();

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: async data => {
      if (data.success) {
        await utils.watchlist.list.invalidate();
        onAddSuccess?.();
      } else {
        onAddError?.(data.error);
      }
    },
  });

  const deleteMutation = trpc.watchlist.remove.useMutation({
    onSuccess: async () => {
      await utils.watchlist.list.invalidate();
      if (selectedStock) {
        const freshList = utils.watchlist.list.getData();
        const stillExists = freshList?.some(
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
