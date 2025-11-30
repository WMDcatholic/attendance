import { initMasterDataModule } from './master_data_logic.js';
import { initMassTimeView } from './mass_time_ui.js';
import { initScheduleGenerationView } from './schedule_generation_ui.js';
import { initAttendanceView } from './attendance_ui.js';
import { initShareView } from './share_ui.js';
import { initSettingsView } from './settings_ui.js';

document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    }

    lucide.createIcons();

    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.app-view');
    const mainContent = document.getElementById('main-content');

    function switchView(viewId) {
        views.forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        navLinks.forEach(link => {
            if (link.dataset.view === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        mainContent.scrollTop = 0;
        window.scrollTo(0, 0);

        if (viewId === 'masterDataView') {
            initMasterDataModule('masterDataView');
        } else if (viewId === 'massTimeView') {
            initMassTimeView('massTimeView');
        } else if (viewId === 'scheduleGenerationView') {
            initScheduleGenerationView('scheduleGenerationView');
        } else if (viewId === 'attendanceView') {
            initAttendanceView('attendanceView');
        } else if (viewId === 'shareView') {
            initShareView('shareView');
        } else if (viewId === 'settingsView') {
            initSettingsView('settingsView');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const viewId = link.dataset.view;
            const currentHash = window.location.hash;
            const targetHash = link.getAttribute('href');

            switchView(viewId);

            if (currentHash !== targetHash) {
                history.pushState({ view: viewId }, '', targetHash);
            }
        });
    });

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            switchView(event.state.view);
        } else {
            const hash = window.location.hash.substring(1);
            let viewToLoad = 'masterDataView';
            navLinks.forEach(navLink => {
                if (navLink.getAttribute('href') === `#${hash}`) {
                    viewToLoad = navLink.dataset.view;
                }
            });
            switchView(viewToLoad);
        }
    });

    const initialHash = window.location.hash.substring(1);
    let initialViewId = 'masterDataView';
    let initialHref = '#master-data';

    if (initialHash) {
        const activeLink = document.querySelector(`.nav-link[href="#${initialHash}"]`);
        if (activeLink) {
            initialViewId = activeLink.dataset.view;
            initialHref = activeLink.getAttribute('href');
        } else {
            const defaultLink = document.querySelector('.nav-link[data-view="masterDataView"]');
            if (defaultLink) initialHref = defaultLink.getAttribute('href');
        }
    } else {
        const defaultLink = document.querySelector('.nav-link[data-view="masterDataView"]');
        if (defaultLink) initialHref = defaultLink.getAttribute('href');
    }

    switchView(initialViewId);
    history.replaceState({ view: initialViewId }, '', initialHref);

    // --- Data Safety Features ---

    // Notification System
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        if (type === 'warning') icon = '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-500 mr-3"></i>';
        else if (type === 'success') icon = '<i data-lucide="check-circle" class="w-5 h-5 text-emerald-500 mr-3"></i>';
        else icon = '<i data-lucide="info" class="w-5 h-5 text-sky-500 mr-3"></i>';

        toast.innerHTML = `
            <div class="flex items-center">
                ${icon}
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close"><i data-lucide="x" class="w-4 h-4"></i></button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        });

        container.appendChild(toast);
        lucide.createIcons();

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // 1. Request Persistent Storage
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
            if (granted) {
                console.log("Persistent storage granted.");
            } else {
                console.log("Persistent storage denied.");
            }
        });
    }

    // 2. Check Backup Status
    const lastBackup = localStorage.getItem('lastBackupDate');
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackup) {
        // Check if there is any data to backup (e.g., participants exist)
        const participants = localStorage.getItem('participants');
        if (participants && JSON.parse(participants).length > 0) {
            setTimeout(() => showNotification("데이터 백업 이력이 없습니다. 설정 탭에서 백업을 진행해주세요.", "warning"), 1500);
        }
    } else if (now - new Date(lastBackup) > sevenDays) {
        setTimeout(() => showNotification("최근 백업한 지 7일이 지났습니다. 데이터 보호를 위해 백업해주세요.", "warning"), 1500);
    }

});
