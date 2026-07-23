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
  return PRIMITIVES.every((primitive) => scan.regions.some((region) => region.primitiveId === primitive.id && region.closed))
}

export function AnnotationScreen() {
  const [scans, setScans] = useState<ScanRecord[]>(MOCK_SCANS)
  const [currentScanIndex, setCurrentScanIndex] = useState(0)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [activePrimitiveId, setActivePrimitiveId] = useState<number | null>(null)
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([])
  const [metadataOpen, setMetadataOpen] = useState(false)

  const currentScan = scans[currentScanIndex]

  const coveragePercent = useMemo(() => {
    const completeCount = scans.filter(isScanComplete).length
    return (completeCount / scans.length) * 100
  }, [scans])

  const updateCurrentScan = (updater: (scan: ScanRecord) => ScanRecord) => {
    setScans((prev) => prev.map((scan, index) => (index === currentScanIndex ? updater(scan) : scan)))
  }

  const handleRegionsChange = (regions: Region[]) => {
    updateCurrentScan((scan) => ({ ...scan, regions }))
  }

  const handleSelectPrimitive = (primitiveId: number) => {
    if (primitiveId === activePrimitiveId) {
      setActivePrimitiveId(null)
      setSelectedRegionIds([])
      return
    }

    if (selectedRegionIds.length > 0) {
      updateCurrentScan((scan) => ({
        ...scan,
        regions: scan.regions.map((r) => (selectedRegionIds.includes(r.id) ? { ...r, primitiveId } : r)),
      }))
      setActivePrimitiveId(primitiveId)
      return
    }

    setActivePrimitiveId(primitiveId)
    const regionsForPrimitive = currentScan.regions.filter((r) => r.primitiveId === primitiveId)
    setSelectedRegionIds(regionsForPrimitive.map((r) => r.id))
  }

  const handleDeleteSelectedRegions = () => {
    if (selectedRegionIds.length === 0) return
    updateCurrentScan((scan) => ({
      ...scan,
      regions: scan.regions.filter((region) => !selectedRegionIds.includes(region.id)),
    }))
    setSelectedRegionIds([])
  }

  const handleCommentChange = (comment: string) => {
    updateCurrentScan((scan) => ({ ...scan, comment }))
  }

  const goToScan = (index: number) => {
    setCurrentScanIndex(index)
    setSelectedRegionIds([])
    setMetadataOpen(false)
  }

  return (
    <div className="annotation-screen">
      <ProgressBar percent={coveragePercent} />

      <Toolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        canDeleteRegion={selectedRegionIds.length > 0}
        onDeleteRegion={handleDeleteSelectedRegions}
      />

      <div className="annotation-main">
        <div className="canvas-column">
          <CanvasViewer
            imageSrc={currentScan.imageSrc}
            primitives={PRIMITIVES}
            regions={currentScan.regions}
            selectedRegionIds={selectedRegionIds}
            activePrimitiveId={activePrimitiveId}
            activeTool={activeTool}
            onRegionsChange={handleRegionsChange}
            onSelectRegions={setSelectedRegionIds}
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
          regions={currentScan.regions}
          onSelectPrimitive={handleSelectPrimitive}
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
