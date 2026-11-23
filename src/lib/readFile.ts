/** Reads a file the user picked as text. Rejects when the browser cannot read it. */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(new Error('The file could not be read.'))
    }
    reader.readAsText(file)
  })
}
