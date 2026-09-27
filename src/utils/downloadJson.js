import { plural } from './plural.js'

/**
 * Downloads a whole collection as one file, but only if every item is valid: game engines
 * should never receive a broken file. `problems(item)` returns how many problems it has.
 * Reports what happened (or why it refused) through the toast passed in.
 */
export function downloadCollection({ toast, noun, filename, items, problems, toExport }) {
  let brokenCount = 0
  for (const item of items) {
    if (problems(item) > 0) {
      brokenCount++
    }
  }

  if (brokenCount > 0) {
    let verb = 'have'
    if (brokenCount === 1) {
      verb = 'has'
    }
    toast.show({
      status: 'error',
      message: `${plural(brokenCount, noun)} ${verb} problems. Fix them before downloading.`,
    })
    return
  }

  const exported = []
  for (const item of items) {
    exported.push(toExport(item))
  }
  downloadJson(filename, exported)
  toast.show({ status: 'success', message: `${plural(items.length, noun)} downloaded` })
}

// Saves `data` as a formatted .json file through the browser's normal download flow
export function downloadJson(filename, data) {
  const text = JSON.stringify(data, null, 2) + '\n'
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
