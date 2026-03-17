import type { PdfStatus } from '@/types'
import { Cracker } from './cracker'

interface CrackerSectionProps {
  pdfData: ArrayBuffer | null
  status: PdfStatus
}

export function CrackerSection({ pdfData, status }: CrackerSectionProps) {
  if (status !== 'protected' || !pdfData) return null

  return (
    <div className="mt-4 border-t border-border pt-4">
      <Cracker pdfData={pdfData} />
    </div>
  )
}
