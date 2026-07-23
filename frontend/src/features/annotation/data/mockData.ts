import type { Primitive, ScanRecord } from '../types/types'

export const PRIMITIVES: Primitive[] = [
  { id: 1, name: 'Left lung', description: 'Left lung field' },
  { id: 2, name: 'Right lung', description: 'Right lung field' },
  { id: 3, name: 'Heart', description: 'Cardiac silhouette' },
  { id: 4, name: 'Trachea', description: 'Tracheal air column' },
]

const SCAN_COUNT = 10

export const MOCK_SCANS: ScanRecord[] = Array.from({ length: SCAN_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    metadata: {
      scanId: `scan-${number}`,
      patientId: `patient-${number}`,
      timestamp: new Date(Date.UTC(2026, 6, 10 + index, 9, 0)).toISOString(),
    },
    imageSrc: `/scans/scan_${number}.png`,
    comment: '',
    regions: [],
  }
})
