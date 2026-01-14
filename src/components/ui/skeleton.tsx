import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted/50", className)} {...props} />;
}

const EventCardSkeleton = () => {
  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Time & Location */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full" />
        ))}
        <Skeleton className="ml-auto h-4 w-10" />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

      {/* Price */}
      <div className="flex justify-end">
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
};

const BookingCardSkeleton = () => {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
};

export { Skeleton, EventCardSkeleton, BookingCardSkeleton };
