declare module '@tanstack/react-query' {
  import type { ReactNode } from 'react';

  export class QueryClient {
    constructor(options?: unknown);
    getQueryData<T = unknown>(queryKey: readonly unknown[]): T | undefined;
    setQueryData<T = unknown>(queryKey: readonly unknown[], updater: T | ((oldData: T | undefined) => T | undefined)): void;
    invalidateQueries(filters: { queryKey: readonly unknown[] }): Promise<void>;
  }

  export function QueryClientProvider(props: { client: QueryClient; children: ReactNode }): ReactNode;
  export function useQueryClient(): QueryClient;
  export function useQuery<TData = unknown>(options: { queryKey: readonly unknown[]; queryFn: () => Promise<TData>; staleTime?: number }): { data?: TData };
  export function useInfiniteQuery<TData = unknown>(options: {
    queryKey: readonly unknown[];
    queryFn: (context: { pageParam: number }) => Promise<TData>;
    initialPageParam: number;
    getNextPageParam: (lastPage: TData, allPages: TData[]) => number | undefined;
  }): { data?: { pages: TData[] }; isLoading: boolean; fetchNextPage: () => void; hasNextPage: boolean; isFetchingNextPage: boolean };
}

declare module 'zustand' {
  export function create<T>(initializer: (set: (partial: Partial<T>) => void) => T): () => T;
}
