import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateTicketInput } from '@/lib/api'
import {
  DESCRICAO_MAX_LENGTH,
  DESCRICAO_MIN_LENGTH,
  EXAMPLE_TICKETS,
  TITULO_MAX_LENGTH,
} from '@/lib/ticket'
import { cn } from '@/lib/utils'

type TriageFormProps = {
  isSubmitting: boolean
  onSubmit: (input: CreateTicketInput) => Promise<void>
}

export function TriageForm({ isSubmitting, onSubmit }: TriageFormProps) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [nextExampleIndex, setNextExampleIndex] = useState(0)

  const descricaoLength = descricao.trim().length
  const isTooShort = descricaoLength < DESCRICAO_MIN_LENGTH

  function fillExample() {
    setDescricao(EXAMPLE_TICKETS[nextExampleIndex] ?? '')
    setNextExampleIndex((index) => (index + 1) % EXAMPLE_TICKETS.length)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitulo = titulo.trim()
    await onSubmit({
      titulo: trimmedTitulo || undefined,
      descricao: descricao.trim(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova triagem</CardTitle>
        <CardDescription>
          Cole o texto do ticket. O resumo é gerado pelo Gemini e a
          classificação pelo JEV.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título (opcional)</Label>
            <Input
              id="titulo"
              value={titulo}
              maxLength={TITULO_MAX_LENGTH}
              onChange={(event) => setTitulo(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              className="min-h-32"
              value={descricao}
              maxLength={DESCRICAO_MAX_LENGTH}
              onChange={(event) => setDescricao(event.target.value)}
              disabled={isSubmitting}
            />
            <p
              className={cn(
                'text-xs text-muted-foreground',
                isTooShort && descricaoLength > 0 && 'text-destructive',
              )}
            >
              {descricaoLength} / {DESCRICAO_MAX_LENGTH} caracteres
              {isTooShort && ` (mínimo ${DESCRICAO_MIN_LENGTH})`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isTooShort || isSubmitting}>
              {isSubmitting ? 'Triando...' : 'Triar ticket'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={fillExample}
              disabled={isSubmitting}
            >
              Usar exemplo
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
