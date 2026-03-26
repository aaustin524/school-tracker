import { redirect } from 'next/navigation'

export default function ReviewPage({
  searchParams,
}: {
  searchParams?: { data?: string }
}) {
  const data = searchParams?.data
  redirect(data ? `/import/review?data=${data}` : '/import/review')
}
