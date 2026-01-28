import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InfiniteScrollTriggerProps {
  onTrigger: () => void;
  loading?: boolean;
  hasMore?: boolean;
  threshold?: number;
}

const InfiniteScrollTrigger = ({
  onTrigger,
  loading = false,
  hasMore = true,
  threshold = 100,
}: InfiniteScrollTriggerProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          onTrigger();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [onTrigger, loading, hasMore, threshold]);

  if (!hasMore) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        You've reached the end
      </div>
    );
  }

  return (
    <div ref={triggerRef} className="py-6 flex justify-center">
      {loading && (
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};

export default InfiniteScrollTrigger;
