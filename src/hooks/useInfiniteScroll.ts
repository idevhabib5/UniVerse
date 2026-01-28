import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>;
  pageSize?: number;
  initialData?: T[];
}

interface UseInfiniteScrollResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 10,
  initialData = [],
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (pageNum: number, isInitial: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const result = await fetchFn(pageNum, pageSize);
      
      if (isInitial) {
        setData(result.data);
      } else {
        setData((prev) => [...prev, ...result.data]);
      }
      
      setHasMore(result.hasMore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [fetchFn, pageSize]);

  useEffect(() => {
    fetchData(0, true);
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  }, [loadingMore, loading, hasMore, page, fetchData]);

  const reset = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [fetchData]);

  return {
    data,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reset,
    setData,
  };
}
