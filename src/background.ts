import * as DAO from '@shared/dao'
import { IIFE } from '@blackglory/code-tags'
import { isMatch } from 'micromatch'

browser.webNavigation.onCommitted.addListener(async details => {
  const matchedScripts = await DAO.filterEnabledUserScripts(x => matchAnyOfUrlPatterns(details.url, x.urlPatterns))
  console.log(matchedScripts)

  if (matchedScripts.length > 0) {
    injectContentScript(
      details.tabId
    , details.frameId
    , createESMContentScript(...matchedScripts.map(x => x.code))
    )
  }
})

function createESMContentScript(...scripts: string[]): string {
  const loaders = scripts.map(script => IIFE`loadESMScript(${script})`).join('\n')

  return `
    ${loaders}

    async function loadESMScript(script) {
      const blob = new Blob([script], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      await import(url)
      URL.revokeObjectURL(url)
    }
  `
}

async function injectContentScript(tabId: number, frameId: number, script: string): Promise<void> {
  await browser.tabs.executeScript(tabId, { frameId, code: script, runAt: 'document_start' })
}

function matchAnyOfUrlPatterns(url: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchUrlPattern(url, pattern))
}

function matchUrlPattern(url: string, pattern: string): boolean {
  return isMatch(url, pattern)
}
