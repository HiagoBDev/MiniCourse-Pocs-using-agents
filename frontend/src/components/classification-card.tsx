import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatPercent, REVIEW_CONFIDENCE_THRESHOLD } from '@/lib/ticket'
import { cn } from '@/lib/utils'

type ClassificationCardProps = {
  title: string
  label: string | null
  confidence: number | null
  error: string | null
}

export function ClassificationCard({
  title,
  label,
  confidence,
  error,
}: ClassificationCardProps) {
  const isLowConfidence =
    confidence !== null && confidence < REVIEW_CONFIDENCE_THRESHOLD

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error || label === null || confidence === null ? (
          <p className="text-sm text-destructive">
            {error ?? 'Classificação indisponível.'}
          </p>
        ) : (
          <>
            <Badge>{label}</Badge>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confiança</span>
                <span className={cn(isLowConfidence && 'text-destructive')}>
                  {formatPercent(confidence)}
                </span>
              </div>
              <Progress
                value={confidence * 100}
                className={cn(
                  'h-2',
                  isLowConfidence &&
                    '*:data-[slot=progress-indicator]:bg-destructive',
                )}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
