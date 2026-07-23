import { useMemo, useState } from 'react'
import '../styles/AnnotationScreen.css'
import { MOCK_SCANS, PRIMITIVES } from '../data/mockData'
import type { Region, ScanRecord, Tool } from '../types/types'
import { CanvasViewer } from './CanvasViewer'
import { NavigationControls } from './NavigationControls'
import { PrimitivesPanel } from './PrimitivesPanel'
import { ProgressBar } from './ProgressBar'
import { ScanMetadataPanel } from './ScanMetadataPanel'
import { Toolbar } from './Toolbar'

function isScanComplete(scan: ScanRecord) {
  return PRIMITIVES.every((primitive) => scan.regionsByPrimitiveId[primitive.id]?.closed)
}

export function AnnotationScreen() {
  const [scans, setScans] = useState<ScanRecord[]>(MOCK_SCANS)
  const [currentScanIndex, setCurrentScanIndex] = useState(0)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [activePrimitiveId, setActivePrimitiveId] = useState<number | null>(null)
  const [metadataOpen, setMetadataOpen] = useState(false)

  const currentScan = scans[currentScanIndex]

  const coveragePercent = useMemo(() => {
    const completeCount = scans.filter(isScanComplete).length
    return (completeCount / scans.length) * 100
  }, [scans])

  const updateCurrentScan = (updater: (scan: ScanRecord) => ScanRecord) => {
    setScans((prev) => prev.map((scan, index) => (index === currentScanIndex ? updater(scan) : scan)))
  }

  const handleRegionChange = (primitiveId: number, region: Region) => {
    updateCurrentScan((scan) => ({
      ...scan,
      regionsByPrimitiveId: { ...scan.regionsByPrimitiveId, [primitiveId]: region },
    }))
  }

  const handleClearPrimitive = (primitiveId: number) => {
    updateCurrentScan((scan) => {
      const regionsByPrimitiveId = { ...scan.regionsByPrimitiveId }
      delete regionsByPrimitiveId[primitiveId]
      return { ...scan, regionsByPrimitiveId }
    })
  }

  const handleCommentChange = (comment: string) => {
    updateCurrentScan((scan) => ({ ...scan, comment }))
  }

  const goToScan = (index: number) => {
    setCurrentScanIndex(index)
    setMetadataOpen(false)
  }

  return (
    <div className="annotation-screen">
      <ProgressBar percent={coveragePercent} />

      <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />

      <div className="annotation-main">
        <div className="canvas-column">
          <CanvasViewer
            imageSrc={currentScan.imageSrc}
            primitives={PRIMITIVES}
            regionsByPrimitiveId={currentScan.regionsByPrimitiveId}
            activePrimitiveId={activePrimitiveId}
            activeTool={activeTool}
            onRegionChange={handleRegionChange}
            onToggleMetadata={() => setMetadataOpen((open) => !open)}
          />
          {metadataOpen && (
            <ScanMetadataPanel
              metadata={currentScan.metadata}
              comment={currentScan.comment}
              onCommentChange={handleCommentChange}
              onClose={() => setMetadataOpen(false)}
            />
          )}
        </div>

        <PrimitivesPanel
          primitives={PRIMITIVES}
          activePrimitiveId={activePrimitiveId}
          regionsByPrimitiveId={currentScan.regionsByPrimitiveId}
          onSelectPrimitive={setActivePrimitiveId}
          onClearPrimitive={handleClearPrimitive}
        />
      </div>

      <NavigationControls
        onPrev={() => goToScan(currentScanIndex - 1)}
        onNext={() => goToScan(currentScanIndex + 1)}
        canPrev={currentScanIndex > 0}
        canNext={currentScanIndex < scans.length - 1}
      />
    </div>
  )
}
