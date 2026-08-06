import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('./services/api/BannedKeywordApi', () => ({
  getBannedKeywordsApi: vi.fn().mockResolvedValue({ data: [] }),
}))
