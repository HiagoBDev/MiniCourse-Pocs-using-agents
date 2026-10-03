import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SummaryCardProps = {
  resumo: string | null
  error: string | null
}

export function SummaryCard({ resumo, error }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm leading-relaxed">{resumo}</p>
        )}
      </CardContent>
    </Card>
  )
}
