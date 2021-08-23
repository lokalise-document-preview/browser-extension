import { PreviewParams } from './_types';

const apiUrl = 'https://my-app.lokalise-document-experience-extension.workers.dev/'
const apiTimeoutMs = 5000;
const apiTokenStorageKey = 'apiToken';

export async function fetchDocumentPreview(params: PreviewParams) {
    const response = await fetchFromApi('fetch-preview', params);
    return response.text();
}

export async function fetchLangIso(projectId: string, langId: number) {
    const response = await fetchFromApi('get-lang-iso', { projectId, langId });
    const data = await response.json();
    return data.langIso ?? '';
}

export async function isApiTokenAvailable() {
    return Boolean(await getApiToken());
}

export async function setApiToken(token: string) {
    return browser.storage.local.set({
        [apiTokenStorageKey]: token
    });
}

export class CantReachExtensionApiError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

async function fetchFromApi(path: string, additionalParams: any) {
    const apiToken = await getApiToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiTimeoutMs);

    return await fetch(apiUrl + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign(additionalParams, { apiToken })),
        signal: controller.signal
    }).then(response => {
        clearTimeout(timeoutId);
        return response;
    }).catch(error => {
        throw new CantReachExtensionApiError(error);
    });
}

async function getApiToken() {
    const key = await browser.storage.local.get(apiTokenStorageKey);
    return key[apiTokenStorageKey];
}