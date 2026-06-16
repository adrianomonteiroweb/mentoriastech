import { SelectionProcessView } from "@/components/shared/selection-process-view"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function SharedSelectionProcessPage({ params }: PageProps) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <h1 className="text-lg font-semibold">MentoriasTech</h1>
          <span className="text-sm text-muted-foreground">Processo Seletivo</span>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl">
        <SelectionProcessView token={token} />
      </main>
    </div>
  )
}
