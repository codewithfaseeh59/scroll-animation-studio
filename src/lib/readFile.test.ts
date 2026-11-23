import { vi } from 'vitest'
import { readFileText } from './readFile'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readFileText', () => {
  it('reads the text of a file', async () => {
    const file = new File(['{"a": 1}'], 'project.json', { type: 'application/json' })
    expect(await readFileText(file)).toBe('{"a": 1}')
  })

  it('reads non-ASCII text correctly', async () => {
    expect(await readFileText(new File(['Ünï 日本語'], 'a.txt'))).toBe('Ünï 日本語')
  })

  it('reads an empty file as an empty string', async () => {
    expect(await readFileText(new File([], 'empty.json'))).toBe('')
  })

  it('rejects when the browser cannot read the file', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>)
    })
    await expect(readFileText(new File(['x'], 'a.txt'))).rejects.toThrow('could not be read')
  })
})
