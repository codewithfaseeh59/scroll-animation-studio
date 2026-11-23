import { vi } from 'vitest'
import { downloadText } from './download'

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(new Error('could not read the blob'))
    }
    reader.readAsText(blob)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('downloadText', () => {
  it('clicks a temporary link with the file name and the content, then cleans up', async () => {
    const blobs: Blob[] = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:test-url'
    })
    const revokeObjectURL = vi.fn()
    URL.revokeObjectURL = revokeObjectURL
    const clicked: { href: string; download: string; attached: boolean }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({
        href: this.href,
        download: this.download,
        attached: document.body.contains(this),
      })
    })

    downloadText('scene.css', '.a { color: red; }', 'text/css')

    expect(clicked).toEqual([{ href: 'blob:test-url', download: 'scene.css', attached: true }])
    expect(blobs).toHaveLength(1)
    expect(blobs[0]?.type).toBe('text/css')
    expect(await readBlob(blobs[0] as Blob)).toBe('.a { color: red; }')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
