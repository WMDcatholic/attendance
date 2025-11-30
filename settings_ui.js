// settings_ui.js
import * as settingsLogic from './settings_logic.js';

async function handleExportAllData_UI_Wrapper() {
    const exportButton = document.getElementById('export-all-data-btn');
    const messageArea = document.getElementById('settings-message-area');

    if (exportButton) exportButton.disabled = true;
    if (messageArea) {
        messageArea.textContent = '데이터 내보내는 중...';
        messageArea.className = 'mt-2 text-sm text-blue-600';
    }

    try {
        const result = await settingsLogic.handleExportAllData();
        if (result.success) {
            if (messageArea) messageArea.textContent = '데이터 내보내기 완료! 다운로드가 시작됩니다.';
        } else {
            throw new Error(result.error || '알 수 없는 내보내기 오류');
        }
    } catch (error) {
        console.error("UI: Data export failed:", error);
        if (messageArea) messageArea.textContent = `오류: 데이터 내보내기 실패 (${error.message})`;
        alert(`데이터 내보내기 실패: ${error.message}`);
    } finally {
        if (exportButton) exportButton.disabled = false;
    }
}

export function initSettingsView(containerId) {
    console.log(`initSettingsView called with ${containerId}`);
    try {
        const viewElement = document.getElementById(containerId);
        if (!viewElement) {
            console.error(`Settings view container #${containerId} not found.`);
            return;
        }

        // 1. Force remove hidden class and ensure visibility
        viewElement.classList.remove('hidden');
        viewElement.style.display = 'block'; // Ensure block display

        // 2. Setup MutationObserver to prevent re-hiding
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (viewElement.classList.contains('hidden')) {
                        console.warn('Settings view was hidden by external script. Forcing visible.');
                        viewElement.classList.remove('hidden');
                    }
                }
            });
        });
        observer.observe(viewElement, { attributes: true });

        // 3. Clear existing content to ensure a clean state
        viewElement.innerHTML = '';

        // 4. Rebuild DOM
        // Title
        const h2Title = document.createElement('h2');
        h2Title.className = 'text-xl font-semibold mb-4 text-sky-700';
        h2Title.textContent = '설정';
        viewElement.appendChild(h2Title);

        // Description
        const descPara = document.createElement('p');
        descPara.textContent = '애플리케이션 설정을 관리합니다.';
        descPara.className = 'mb-6 text-slate-600';
        viewElement.appendChild(descPara);

        // Data Management Section
        const dataManagementSection = document.createElement('div');
        dataManagementSection.id = 'data-management-section';
        dataManagementSection.className = 'mt-6';
        dataManagementSection.innerHTML = `
            <h3 class="text-lg font-medium mb-3 text-sky-600">데이터 관리</h3>
            <div class="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                <div>
                    <p class="text-sm font-medium text-slate-700 mb-1">데이터 내보내기</p>
                    <button id="export-all-data-btn" class="btn btn-primary">
                        <i data-lucide="download-cloud" class="mr-2 h-5 w-5"></i>데이터 전체 내보내기 (백업)
                    </button>
                    <p class="text-xs text-slate-500 mt-1">모든 애플리케이션 데이터(기준정보, 일정, 출석기록, 월별 통계 등)를 하나의 JSON 파일로 다운로드합니다.</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-700 mt-4 mb-1">데이터 가져오기 (복원)</p>
                    <input type="file" id="import-file-input" accept=".json" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer">
                    <div id="selected-import-file-info" class="text-xs text-slate-500 mt-1"></div>
                    <button id="import-all-data-btn" class="btn btn-danger mt-2 w-full sm:w-auto" disabled>
                        <i data-lucide="upload-cloud" class="mr-2 h-5 w-5"></i>선택한 파일로 전체 데이터 복원
                    </button>
                    <p class="text-xs text-slate-500 mt-1">주의: 현재 모든 데이터가 선택한 파일의 내용으로 대체됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                </div>
                <div id="settings-message-area" class="mt-2 text-sm"></div>
            </div>
        `;
        viewElement.appendChild(dataManagementSection);

        // Storage Management Section
        const storageSection = document.createElement('div');
        storageSection.id = 'storage-management-section';
        storageSection.className = 'mt-6';
        storageSection.innerHTML = `
            <h3 class="text-lg font-medium mb-3 text-sky-600">저장소 용량 관리</h3>
            <div class="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                <div>
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium text-slate-700">저장소 사용량</span>
                        <span id="storage-usage-text" class="text-sm font-medium text-slate-700">계산 중...</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-2.5">
                        <div id="storage-usage-bar" class="bg-sky-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">브라우저의 LocalStorage 용량 한도는 약 5MB입니다.</p>
                </div>
                
                <div class="pt-4 border-t border-slate-200">
                    <p class="text-sm font-medium text-slate-700 mb-1">오래된 데이터 정리</p>
                    <div class="flex items-center space-x-2">
                        <select id="prune-years-select" class="block w-32 py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                            <option value="1">1년 이상</option>
                            <option value="2">2년 이상</option>
                            <option value="3" selected>3년 이상</option>
                            <option value="5">5년 이상</option>
                        </select>
                        <button id="prune-data-btn" class="btn btn-secondary py-2 px-4 inline-flex items-center">
                            <i data-lucide="trash-2" class="mr-2 h-4 w-4"></i>정리하기
                        </button>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">선택한 기간보다 오래된 일정, 출석기록, 통계 데이터를 삭제하여 용량을 확보합니다. (참가자 정보는 유지됨)</p>
                </div>
                <div id="storage-message-area" class="mt-2 text-sm"></div>
            </div>
        `;
        viewElement.appendChild(storageSection);

        // Event Listeners
        const pruneBtn = viewElement.querySelector('#prune-data-btn');
        if (pruneBtn) {
            pruneBtn.addEventListener('click', handlePruneData);
        }

        const exportButton = viewElement.querySelector('#export-all-data-btn');
        if (exportButton) {
            exportButton.addEventListener('click', handleExportAllData_UI_Wrapper);
        }

        const importFileInput = viewElement.querySelector('#import-file-input');
        const importButton = viewElement.querySelector('#import-all-data-btn');

        if (importFileInput && importButton) {
            importFileInput.addEventListener('change', handleImportFileSelect);
            importButton.addEventListener('click', handleImportAllData_UI_Wrapper);
        }

        // Initial update
        updateStorageMeter();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        console.log("initSettingsView completed successfully (rebuilt DOM).");

    } catch (error) {
        console.error("Error in initSettingsView:", error);
        document.body.innerHTML = `<div style="color:red; font-size:2em; padding:20px;">CRITICAL ERROR: ${error.message}</div>`;
    }
}

function handleImportFileSelect(event) {
    const importButton = document.getElementById('import-all-data-btn');
    const selectedFileInfoDiv = document.getElementById('selected-import-file-info');

    if (!importButton || !selectedFileInfoDiv) return;

    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        selectedFileInfoDiv.textContent = `선택된 파일: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        importButton.disabled = false;
    } else {
        selectedFileInfoDiv.textContent = '';
        importButton.disabled = true;
    }
}

async function handleImportAllData_UI_Wrapper() {
    const importFileInput = document.getElementById('import-file-input');
    const importButton = document.getElementById('import-all-data-btn');
    const messageArea = document.getElementById('settings-message-area');
    const selectedFileInfoDiv = document.getElementById('selected-import-file-info');

    if (importFileInput.files.length === 0) {
        if (messageArea) messageArea.textContent = '복원할 파일을 먼저 선택해주세요.';
        if (messageArea) messageArea.className = 'mt-2 text-sm text-red-600';
        return;
    }
    const file = importFileInput.files[0];

    if (importButton) importButton.disabled = true;
    if (messageArea) {
        messageArea.textContent = `'${file.name}' 파일 데이터 복원 중...`;
        messageArea.className = 'mt-2 text-sm text-blue-600';
    }

    try {
        const result = await settingsLogic.handleImportAllData(file);

        if (result.success) {
            if (messageArea) messageArea.textContent = '데이터 복원 완료! 앱을 새로고침하여 변경사항을 확인하세요.';
            if (messageArea) messageArea.className = 'mt-2 text-sm text-green-600';
            alert('데이터 복원이 완료되었습니다. 애플리케이션을 새로고침합니다.');
            window.location.reload();
        } else {
            if (result.userCancelled) {
                if (messageArea) messageArea.textContent = '데이터 복원이 사용자에 의해 취소되었습니다.';
                if (messageArea) messageArea.className = 'mt-2 text-sm text-slate-600';
            } else {
                throw new Error(result.error || '알 수 없는 가져오기 오류');
            }
        }
    } catch (error) {
        console.error("UI: Data import failed:", error);
        if (messageArea) messageArea.textContent = `오류: 데이터 가져오기 실패 (${error.message})`;
        if (messageArea) messageArea.className = 'mt-2 text-sm text-red-600';
        alert(`데이터 가져오기 실패: ${error.message}`);
    } finally {
        if (importButton) importButton.disabled = false;
        importFileInput.value = '';
        if (selectedFileInfoDiv) selectedFileInfoDiv.textContent = '';
    }
}

function updateStorageMeter() {
    const usage = settingsLogic.getStorageUsage();
    const bar = document.getElementById('storage-usage-bar');
    const text = document.getElementById('storage-usage-text');

    if (bar && text) {
        bar.style.width = `${usage.percent}%`;
        if (usage.percent > 90) bar.className = 'bg-red-600 h-2.5 rounded-full';
        else if (usage.percent > 70) bar.className = 'bg-amber-500 h-2.5 rounded-full';
        else bar.className = 'bg-sky-600 h-2.5 rounded-full';

        text.textContent = `${usage.usedKB} KB / ${usage.maxMB} MB (${usage.percent}%)`;
    }
}

async function handlePruneData() {
    const select = document.getElementById('prune-years-select');
    const years = parseInt(select.value);
    const messageArea = document.getElementById('storage-message-area');
    const btn = document.getElementById('prune-data-btn');

    if (!confirm(`${years}년 이상 된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    if (btn) btn.disabled = true;
    if (messageArea) {
        messageArea.textContent = '데이터 정리 중...';
        messageArea.className = 'mt-2 text-sm text-blue-600';
    }

    try {
        const result = await settingsLogic.pruneOldData(years);
        if (result.success) {
            const msg = `정리 완료: 일정 ${result.deleted.schedules}건, 출석 ${result.deleted.logs}건, 통계 ${result.deleted.counts}건 삭제됨`;
            if (messageArea) {
                messageArea.textContent = msg;
                messageArea.className = 'mt-2 text-sm text-green-600';
            }
            alert(msg);
            updateStorageMeter();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("Pruning failed:", error);
        if (messageArea) {
            messageArea.textContent = `오류: ${error.message}`;
            messageArea.className = 'mt-2 text-sm text-red-600';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}
