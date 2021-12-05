import browser from 'webextension-polyfill'
import { PreviewParams } from './types'

const apiUrl = 'https://my-app.lokalise-document-experience-extension.workers.dev/'
const apiTimeoutMs = 5000
const apiTokenStorageKey = 'apiToken'

export async function fetchHtmlDocumentPreview (params: PreviewParams): Promise<string> {
  const response = await fetchFromApi('fetch-preview-html', params)
  return await response.text()
}

export async function fetchLangIso (projectId: string, langId: number): Promise<string> {
  const response = await fetchFromApi('get-lang-iso', { projectId, langId })
  const data = await response.json()
  return data.langIso ?? ''
}

export async function isApiTokenAvailable (): Promise<boolean> {
  return Boolean(await getApiToken())
}

export async function setApiToken (token: string): Promise<void> {
  return await browser.storage.local.set({
    [apiTokenStorageKey]: token
  })
}

class CantReachExtensionApiError extends Error {}

class ReceivedApiError extends Error {}

async function fetchFromApi (path: string, additionalParams: any): Promise<Response> {
  const apiToken = await getApiToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), apiTimeoutMs)

  return await fetch(apiUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign(additionalParams, { apiToken })),
    signal: controller.signal
  }).then(async response => {
    clearTimeout(timeoutId)

    if (response.ok) {
      return response
    }

    if (response.status === 401) {
      await setApiToken('')
    }

    throw new ReceivedApiError(response.status.toString())
  }).catch(error => {
    if (error instanceof ReceivedApiError) {
      throw error
    } else {
      throw new CantReachExtensionApiError('Can\'t reach the extension API due to some network error.')
    }
  })
}

async function getApiToken (): Promise<string> {
  const key = await browser.storage.local.get(apiTokenStorageKey)
  return key[apiTokenStorageKey]
}
