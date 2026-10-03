import { Skeleton } from '@/components/ui/skeleton'

const CLASSIFICATION_CARD_COUNT = 3

export function TriageResultSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="mr-auto h-6 w-28" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: CLASSIFICATION_CARD_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </section>
  )
}
