import { cn } from '@/lib/helpers'

function Pulse({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-gray-200', className)} />
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Pulse className="h-3 w-14 mx-auto rounded-full" />
        <Pulse className="h-10 w-72 mx-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-3xl overflow-hidden shadow-lg border-2 border-white">
            <Pulse className="h-24 rounded-none" />
            <div className="p-4 space-y-3 bg-white/80">
              <Pulse className="h-3 w-20 rounded-full" />
              <Pulse className="h-14 rounded-xl" />
              <Pulse className="h-14 rounded-xl" />
              <Pulse className="h-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChildPageSkeleton() {
  return (
    <div className="space-y-6">
      <Pulse className="h-32 rounded-3xl" />
      <div className="flex gap-3 flex-wrap">
        {[0, 1, 2, 3, 4].map((i) => <Pulse key={i} className="h-7 w-28 rounded-full" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Pulse className="h-16 rounded-2xl" />
            <Pulse className="h-11 rounded-xl" />
            <Pulse className="h-11 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
