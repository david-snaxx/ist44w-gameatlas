import { plural } from './plural.js'

/**
 * Downloads a whole collection as one file, but only if every item is valid: game engines
 * should never receive a broken file. `problems(item)` returns how many problems it has.
 * Reports what happened (or why it refused) through the toast passed in.
 */
export function downloadCollection({ toast, noun, filename, items, problems, toExport }) {
  const broken = items.filter((item) => problems(item) > 0).length
  if (broken > 0) {
    toast.show({
      status: 'error',
      message: `${plural(broken, noun)} ${broken === 1 ? 'has' : 'have'} problems. Fix them before downloading.`,
    })
    return
  }
  downloadJson(filename, items.map(toExport))
  toast.show({ status: 'success', message: `${plural(items.length, noun)} downloaded` })
}

// Saves `data` as a formatted .json file through the browser's normal download flow
export function downloadJson(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
