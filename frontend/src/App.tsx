import { HealthStatus } from '@/components/health-status'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Triagem de Tickets de Suporte
        </h1>
        <p className="text-sm text-muted-foreground">
          POC — ambiente base (frontend + backend + banco)
        </p>
      </header>
      <HealthStatus />
      <Toaster richColors />
    </main>
  )
}

export default App
