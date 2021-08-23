import { PreviewParams } from './_types';
import { fetchLangIso } from './apiService';

interface StringMap { [key: number]: string; }
let langIsoPageCache: StringMap = {};

export default async function getProjectParams(): Promise<PreviewParams> {
    const params: PreviewParams = {
        projectId: '',
        filename: '',
        fileformat: '',
        langIso: ''
    };

    const { langId, ...paramsFromUrl} = loadParamsFromUrl();
    Object.assign(params, paramsFromUrl);

    Object.assign(params, loadParamsFromPage());

    if (!langIsoPageCache[langId]) {
        langIsoPageCache[langId] = await fetchLangIso(params.projectId, langId);
    }
    Object.assign(params, { langIso: langIsoPageCache[langId] });

    return params;
}

function loadParamsFromUrl() {
    const url = new URL(window.location.href);
    
    const projectIdRegex = new RegExp(/\/project\/(?<projectId>[0-9a-z]+\.[0-9]+)\//);
    const projectId = url.pathname.match(projectIdRegex)?.groups?.projectId ?? '';

    const langId = parseInt(url.searchParams.get('single_lang_id') ?? '');

    return {
        projectId,
        langId
    };
}

function loadParamsFromPage() {
    const filename = document.querySelector('.key-task-filename')?.textContent ?? '';
    const fileformat = filename.substr(filename.lastIndexOf('.') + 1);

    return {
        filename,
        fileformat
    }
}
