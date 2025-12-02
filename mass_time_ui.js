import * as logic from './mass_time_logic.js';
import * as db from './db.js';
import * as shareLogic from './share_logic.js';
import * as attendanceLogic from './attendance_logic.js';
import * as inspectionLogic from './inspection_logic.js';

// Edit Mass Time Modal elements
let editMassTimeModal, editMassTimeInput, editMassTypeSelect, deleteMassTimeBtn, saveEditMassTimeBtn, editMassTimeDate;
let currentEditingSlot = null; // { year, month, date, slotIndex }

// Add Mass Time Modal elements
let addMassTimeModal, addMassTimeInput, addMassTypeSelect, addMassTimeApplyAll, closeAddMassTimeModalBtn, saveAddMassTimeBtn, addMassTimeDate;
let currentAddingDate = null; // { year, month, date }

let yearInput, monthInput, viewExistingScheduleBtn, confirmScheduleBtn, calendarDisplay, messageDiv;
const SCHEDULE_YEAR_KEY = 'selectedMassTimeYear';
const SCHEDULE_MONTH_KEY = 'selectedMassTimeMonth';
const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function initMassTimeView(viewElementId) {
    const view = document.getElementById(viewElementId);
    if (!view) return;

    yearInput = view.querySelector('#mass-time-year');
    monthInput = view.querySelector('#mass-time-month');
    viewExistingScheduleBtn = view.querySelector('#view-existing-mass-time-btn');
    confirmScheduleBtn = view.querySelector('#confirm-schedule-btn');
    calendarDisplay = view.querySelector('#mass-time-calendar-display');
    messageDiv = view.querySelector('#mass-time-message');

    // Initialize Modal Elements
    editMassTimeModal = document.getElementById('editMassTimeModal');
    editMassTimeInput = document.getElementById('editMassTimeInput');
    editMassTypeSelect = document.getElementById('editMassTypeSelect');
    deleteMassTimeBtn = document.getElementById('deleteMassTimeBtn');
    saveEditMassTimeBtn = document.getElementById('saveEditMassTimeBtn');
    editMassTimeDate = document.getElementById('editMassTimeDate');

    // Initialize Add Modal Elements
    addMassTimeModal = document.getElementById('addMassTimeModal');
    addMassTimeInput = document.getElementById('addMassTimeInput');
    addMassTypeSelect = document.getElementById('addMassTypeSelect');
    addMassTimeApplyAll = document.getElementById('addMassTimeApplyAll');
    closeAddMassTimeModalBtn = document.getElementById('closeAddMassTimeModalBtn');
    saveAddMassTimeBtn = document.getElementById('saveAddMassTimeBtn');
    addMassTimeDate = document.getElementById('addMassTimeDate');

    if (deleteMassTimeBtn) {
        deleteMassTimeBtn.onclick = handleDeleteMassTime;
    }
    if (saveEditMassTimeBtn) {
        saveEditMassTimeBtn.onclick = handleSaveMassTime;
    }
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === editMassTimeModal) {
            closeEditMassTimeModal();
        }
        if (event.target === addMassTimeModal) {
            closeAddMassTimeModal();
        }
    });

    if (closeAddMassTimeModalBtn) {
        closeAddMassTimeModalBtn.onclick = closeAddMassTimeModal;
    }
    if (saveAddMassTimeBtn) {
        saveAddMassTimeBtn.onclick = handleSaveNewMassTime;
    }

    if (!yearInput || !monthInput || !calendarDisplay || !messageDiv || !viewExistingScheduleBtn) {
        console.error("One or more elements not found in massTimeView");
        return;
    }

    const storedYear = sessionStorage.getItem(SCHEDULE_YEAR_KEY);
    const storedMonth = sessionStorage.getItem(SCHEDULE_MONTH_KEY);

    if (storedYear && storedMonth) {
        yearInput.value = storedYear;
        monthInput.value = storedMonth;
        loadScheduleDataForInputs();
    } else {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        yearInput.value = currentYear;
        monthInput.value = currentMonth.toString();
        loadScheduleDataForInputs();
    }

    if (yearInput && monthInput) {
        yearInput.addEventListener('change', loadScheduleDataForInputs);
        monthInput.addEventListener('change', loadScheduleDataForInputs);
    }

    if (viewExistingScheduleBtn) {
        viewExistingScheduleBtn.addEventListener('click', handleViewExistingSchedule);
    }

    if (confirmScheduleBtn) {
        confirmScheduleBtn.addEventListener('click', handleToggleConfirmSchedule);
    }



    const sectionTitleH2 = view.querySelector('h2.text-xl.font-semibold');
    if (sectionTitleH2) {
        let titleWrapper = sectionTitleH2.parentNode;
        if (titleWrapper.id !== 'mass-time-title-container') {
            const newTitleWrapper = document.createElement('div');
            newTitleWrapper.id = 'mass-time-title-container';
            newTitleWrapper.className = 'flex justify-between items-center mb-4';
            sectionTitleH2.parentNode.insertBefore(newTitleWrapper, sectionTitleH2);
            newTitleWrapper.appendChild(sectionTitleH2);
            sectionTitleH2.classList.remove('mb-4');
            titleWrapper = newTitleWrapper;
        }

        let actionButtonsWrapper = titleWrapper.querySelector('.action-buttons-wrapper');
        if (!actionButtonsWrapper) {
            actionButtonsWrapper = document.createElement('div');
            actionButtonsWrapper.className = 'action-buttons-wrapper flex items-center space-x-2';
            titleWrapper.appendChild(actionButtonsWrapper);
        }

        let downloadExcelBtn = view.querySelector('#download-schedule-excel-btn');
        if (downloadExcelBtn && downloadExcelBtn.parentNode === actionButtonsWrapper) {
            actionButtonsWrapper.removeChild(downloadExcelBtn);
        }

        if (actionButtonsWrapper) {
            actionButtonsWrapper.innerHTML = '';
        }
    }

    lucide.createIcons();
}

function openEditMassTimeModal(year, month, date, slotIndex, currentTime, currentType) {
    currentEditingSlot = { year, month, date, slotIndex };
    editMassTimeInput.value = currentTime;
    editMassTypeSelect.value = currentType;
    if (editMassTimeDate) {
        editMassTimeDate.textContent = `(${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')})`;
    }
    editMassTimeModal.classList.add('active');
}

function closeEditMassTimeModal() {
    editMassTimeModal.classList.remove('active');
    currentEditingSlot = null;
}

async function handleSaveMassTime() {
    if (!currentEditingSlot) return;

    const newTime = editMassTimeInput.value;
    const newType = editMassTypeSelect.value;

    if (!newTime) {
        alert("시간을 입력해주세요.");
        return;
    }

    try {
        const { year, month, date, slotIndex } = currentEditingSlot;
        const scheduleObject = await db.getSchedule(year, month);

        if (scheduleObject && scheduleObject.data) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const daySchedule = scheduleObject.data.find(d => d.date === dateStr);

            if (daySchedule && daySchedule.timeSlots && daySchedule.timeSlots[slotIndex]) {
                daySchedule.timeSlots[slotIndex].time = newTime;
                daySchedule.timeSlots[slotIndex].type = newType;

                await db.saveSchedule(year, month, scheduleObject.data);
                await loadScheduleDataForInputs(); // Refresh calendar
                closeEditMassTimeModal();
                displayMessage('미사 시간이 수정되었습니다.', 'success');
            }
        }
    } catch (error) {
        console.error("Failed to save mass time:", error);
        alert("저장 중 오류가 발생했습니다.");
    }
}

async function handleDeleteMassTime() {
    if (!currentEditingSlot) return;

    if (!confirm("정말로 이 미사 시간을 삭제하시겠습니까?")) {
        return;
    }

    try {
        const { year, month, date, slotIndex } = currentEditingSlot;
        const scheduleObject = await db.getSchedule(year, month);

        if (scheduleObject && scheduleObject.data) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const daySchedule = scheduleObject.data.find(d => d.date === dateStr);

            if (daySchedule && daySchedule.timeSlots) {
                daySchedule.timeSlots.splice(slotIndex, 1); // Remove the slot

                // If no slots left for the day, maybe remove the day entry? 
                // Logic usually keeps the day entry if it has other data, but here it's fine.

                await db.saveSchedule(year, month, scheduleObject.data);
                await loadScheduleDataForInputs(); // Refresh calendar
                closeEditMassTimeModal();
                displayMessage('미사 시간이 삭제되었습니다.', 'success');
            }
        }
    } catch (error) {
        console.error("Failed to delete mass time:", error);
        alert("삭제 중 오류가 발생했습니다.");
    }
}

function openAddMassTimeModal(year, month, date) {
    currentAddingDate = { year, month, date };
    addMassTimeInput.value = ''; // Reset input
    addMassTypeSelect.value = 'elementary'; // Default
    if (addMassTimeApplyAll) addMassTimeApplyAll.checked = false; // Reset checkbox
    if (addMassTimeDate) {
        addMassTimeDate.textContent = `(${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')})`;
    }
    addMassTimeModal.classList.add('active');
}

function closeAddMassTimeModal() {
    addMassTimeModal.classList.remove('active');
    currentAddingDate = null;
}

async function handleSaveNewMassTime() {
    if (!currentAddingDate) return;

    const newTime = addMassTimeInput.value;
    const newType = addMassTypeSelect.value;
    const applyAll = addMassTimeApplyAll ? addMassTimeApplyAll.checked : false;

    if (!newTime) {
        alert("시간을 입력해주세요.");
        return;
    }

    try {
        const { year, month, date } = currentAddingDate;
        const scheduleObject = await db.getSchedule(year, month);
        let currentScheduleData = (scheduleObject && scheduleObject.data) ? scheduleObject.data : [];

        const targetDateObj = new Date(year, month - 1, date);
        const targetDayOfWeek = targetDateObj.getDay(); // 0 (Sun) - 6 (Sat)
        const daysInMonth = new Date(year, month, 0).getDate();

        let datesToProcess = [];

        if (applyAll) {
            for (let d = 1; d <= daysInMonth; d++) {
                const dObj = new Date(year, month - 1, d);
                if (dObj.getDay() === targetDayOfWeek) {
                    datesToProcess.push(d);
                }
            }
        } else {
            datesToProcess.push(date);
        }

        let addedCount = 0;

        datesToProcess.forEach(d => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let daySchedule = currentScheduleData.find(entry => entry.date === dateStr);

            if (!daySchedule) {
                daySchedule = { date: dateStr, timeSlots: [] };
                currentScheduleData.push(daySchedule);
            }

            if (!daySchedule.timeSlots) {
                daySchedule.timeSlots = [];
            }

            // Check for duplicate (same time and type)
            const exists = daySchedule.timeSlots.some(slot => slot.time === newTime && slot.type === newType);
            if (!exists) {
                daySchedule.timeSlots.push({ time: newTime, type: newType });
                // Optional: Sort time slots by time
                daySchedule.timeSlots.sort((a, b) => a.time.localeCompare(b.time));
                addedCount++;
            }
        });

        // Sort schedule data by date
        currentScheduleData.sort((a, b) => new Date(a.date) - new Date(b.date));

        await db.saveSchedule(year, month, currentScheduleData);
        await loadScheduleDataForInputs(); // Refresh calendar
        closeAddMassTimeModal();

        if (applyAll) {
            displayMessage(`${addedCount}개의 미사 시간이 추가되었습니다. (동일 요일 적용)`, 'success');
        } else {
            displayMessage('새 미사 시간이 추가되었습니다.', 'success');
        }

    } catch (error) {
        console.error("Failed to add mass time:", error);
        alert("추가 중 오류가 발생했습니다.");
    }
}

function formatDateInputString(inputStr) {
    if (!inputStr) return null;
    const trimmedInput = inputStr.replace(/\s+/g, '');

    const ymdRegex = /^\d{4}-\d{2}-(\d{2})$/;
    if (ymdRegex.test(trimmedInput)) {
        return trimmedInput;
    }

    const eightDigitRegex = /^(\d{4})(\d{2})(\d{2})$/;
    const match = trimmedInput.match(eightDigitRegex);
    if (match) {
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
            return trimmedInput;
        }
    }
    return trimmedInput;
}

async function handleSetVacationPeriod() {
    const startDateInput = prompt("방학 시작일을 입력하세요 (YYYY-MM-DD 또는 YYYYMMDD 형식):");
    if (startDateInput === null) return;

    const endDateInput = prompt("방학 종료일을 입력하세요 (YYYY-MM-DD 또는 YYYYMMDD 형식):");
    if (endDateInput === null) return;

    let processedStartDateStr = formatDateInputString(startDateInput);
    let processedEndDateStr = formatDateInputString(endDateInput);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!processedStartDateStr || !processedEndDateStr || !dateRegex.test(processedStartDateStr) || !dateRegex.test(processedEndDateStr)) {
        alert("날짜 형식이 올바르지 않습니다. YYYY-MM-DD 또는 YYYYMMDD 형식으로 입력해주세요.\n예: 2025-08-01 또는 20250801");
        return;
    }

    const startDate = new Date(processedStartDateStr);
    const endDate = new Date(processedEndDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("유효하지 않은 날짜입니다. 입력한 날짜를 확인해주세요.\n(예: 2025년 2월 30일은 유효하지 않음)");
        return;
    }

    if (endDate < startDate) {
        alert("종료일은 시작일보다 빠를 수 없습니다.");
        return;
    }

    sessionStorage.setItem('vacationStartDate', processedStartDateStr);
    sessionStorage.setItem('vacationEndDate', processedEndDateStr);
    alert(`방학 기간이 ${processedStartDateStr}부터 ${processedEndDateStr}까지로 설정되었습니다. 다음 일정 생성 시 적용됩니다.`);
}

async function handleViewExistingSchedule() {
    await loadScheduleDataForInputs();
    displayMessage('일정을 조회했습니다.', 'success');
}

async function handleToggleConfirmSchedule() {
    const year = parseInt(yearInput.value);
    const month = parseInt(monthInput.value);
    if (!year || !month) return;

    const isConfirmed = await db.getMassTimeConfirmation(year, month);

    if (isConfirmed) {
        if (confirm('확정을 해제하시겠습니까? 다시 수정이 가능해집니다.')) {
            await db.setMassTimeConfirmation(year, month, false);
            loadScheduleDataForInputs();
        }
    } else {
        if (confirm('일정을 확정하시겠습니까? 수정/삭제/추가가 불가능해집니다.')) {
            await db.setMassTimeConfirmation(year, month, true);
            loadScheduleDataForInputs();
        }
    }
}

async function loadScheduleDataForInputs() {
    const year = parseInt(yearInput.value);
    const month = parseInt(monthInput.value);
    let prevMonthAbsentees = [];

    if (!year || year < 2000 || year > 2100 || !month || month < 1 || month > 12) {
        calendarDisplay.innerHTML = '';
        return;
    }

    calendarDisplay.innerHTML = '';

    const isConfirmed = await db.getMassTimeConfirmation(year, month);

    if (confirmScheduleBtn) {
        if (isConfirmed) {
            confirmScheduleBtn.innerHTML = '<i data-lucide="unlock" class="mr-2 h-4 w-4"></i>미사시간 확정해제';
            confirmScheduleBtn.classList.remove('btn-primary');
            confirmScheduleBtn.classList.add('btn-warning');
        } else {
            confirmScheduleBtn.innerHTML = '<i data-lucide="check-circle" class="mr-2 h-4 w-4"></i>미사시간 확정';
            confirmScheduleBtn.classList.remove('btn-warning');
            confirmScheduleBtn.classList.add('btn-primary');
        }
    }

    try {
        let scheduleObject = await db.getSchedule(year, month);

        // Auto-fill from previous month if no schedule exists
        if (!scheduleObject) {
            console.log(`No schedule found for ${year}-${month}. Attempting to auto-fill from previous month.`);
            let prevYear = year;
            let prevMonth = month - 1;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear--;
            }

            const prevScheduleObject = await db.getSchedule(prevYear, prevMonth);

            if (prevScheduleObject && prevScheduleObject.data && prevScheduleObject.data.length > 0) {
                console.log(`Found previous schedule for ${prevYear}-${prevMonth}. Extracting pattern.`);
                const pattern = logic.getPatternFromSchedule(prevScheduleObject.data);
                const newScheduleData = logic.createScheduleFromPattern(year, month, pattern);

                if (newScheduleData.length > 0) {
                    await db.saveSchedule(year, month, newScheduleData);
                    scheduleObject = { year, month, data: newScheduleData };
                    displayMessage(`${prevMonth}월의 미사 시간을 바탕으로 ${month}월 일정이 자동 생성되었습니다.`, 'info');
                }
            } else {
                console.log(`No previous schedule found for ${prevYear}-${prevMonth}.`);
            }
        }

        let prevScheduleYear = year;
        let prevScheduleMonth = month - 1;
        if (prevScheduleMonth === 0) {
            prevScheduleMonth = 12;
            prevScheduleYear--;
        }
        try {
            prevMonthAbsentees = await db.getAbsenteesForMonth(prevScheduleYear, prevScheduleMonth);
        } catch (e) {
            console.error("Failed to fetch prev month absentees in loadScheduleDataForInputs", e);
        }

        const allParticipants = await db.getAllParticipants();
        const participantsMap = new Map();
        allParticipants.forEach(p => participantsMap.set(p.id, p));

        if (scheduleObject && scheduleObject.data && scheduleObject.data.length > 0) {
            renderCalendar(year, month, scheduleObject.data, participantsMap, prevMonthAbsentees, isConfirmed);
        } else {
            renderCalendar(year, month, null, participantsMap, prevMonthAbsentees, isConfirmed);
        }
    } catch (error) {
        console.error("Failed to load schedule for inputs:", error);
        renderCalendar(year, month, null, new Map(), prevMonthAbsentees, isConfirmed);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderCalendar(year, month, scheduleData, participantsMap = new Map(), prevMonthAbsentees = [], isConfirmed = false) {
    calendarDisplay.innerHTML = '';
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const table = document.createElement('table');
    table.className = 'divide-y divide-slate-200 border border-slate-200';
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-50';

    const headerRow = document.createElement('tr');
    KOREAN_DAYS.forEach(day => {
        const th = document.createElement('th');
        th.className = 'px-2 py-1 text-center text-xs font-medium text-slate-500 uppercase tracking-wider';
        th.style.width = `${100 / 7}%`;
        th.textContent = day;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-slate-200';
    let date = 1;
    for (let i = 0; i < 6; i++) {
        const weekRow = document.createElement('tr');
        let cellsInWeek = 0;
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');
            cell.className = 'px-2 py-2 align-top h-24 sm:h-32 text-xs';
            if (i === 0 && j < firstDayOfMonth) {
                cell.classList.add('other-month');
            } else if (date > daysInMonth) {
                cell.classList.add('other-month');
            } else {
                if (j === 0 || j === 6) cell.classList.add('weekend');
                const currentDate = date;
                const dayNumber = document.createElement('div');
                dayNumber.className = 'calendar-day-number font-semibold text-slate-700';
                dayNumber.textContent = currentDate;
                cell.appendChild(dayNumber);
                const assignmentsForDate = scheduleData?.find(d => d.date === `${year}-${String(month).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`);
                if (assignmentsForDate && assignmentsForDate.timeSlots) {
                    assignmentsForDate.timeSlots.forEach((slot, index) => {
                        const entryDiv = document.createElement('div');
                        entryDiv.className = 'schedule-entry p-1 my-0.5 rounded bg-sky-100 border border-sky-200 text-sky-800 cursor-pointer hover:bg-sky-200';
                        if (!isConfirmed) {
                            entryDiv.onclick = () => openEditMassTimeModal(year, month, currentDate, index, slot.time, slot.type);
                        } else {
                            entryDiv.classList.remove('cursor-pointer', 'hover:bg-sky-200');
                            entryDiv.classList.add('cursor-default', 'opacity-75');
                        }

                        const timeStrong = document.createElement('strong');
                        timeStrong.textContent = `${slot.time} (${slot.type === 'elementary' ? '초' : '중'})`;
                        entryDiv.appendChild(timeStrong);

                        cell.appendChild(entryDiv);
                    });
                }

                if (!isConfirmed) {
                    const addScheduleBtn = document.createElement('button');
                    addScheduleBtn.className = 'mt-1 w-full flex items-center justify-center p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors';
                    addScheduleBtn.innerHTML = '<i data-lucide="plus" class="h-4 w-4"></i>';
                    addScheduleBtn.title = '일정 추가';
                    addScheduleBtn.onclick = () => {
                        openAddMassTimeModal(year, month, currentDate);
                    };
                    cell.appendChild(addScheduleBtn);
                }

                date++;
                cellsInWeek++;
            }
            weekRow.appendChild(cell);
        }
        if (cellsInWeek > 0 || i === 0) {
            tbody.appendChild(weekRow);
        }
        if (date > daysInMonth && cellsInWeek === 0) break;
    }
    table.appendChild(tbody);
    calendarDisplay.appendChild(table);
}

function displayMessage(message, type = 'info') {
    messageDiv.textContent = message;
    messageDiv.className = 'p-3 rounded-md text-sm ';
    switch (type) {
        case 'success': messageDiv.classList.add('bg-green-100', 'text-green-700'); break;
        case 'error': messageDiv.classList.add('bg-red-100', 'text-red-700'); break;
        case 'warning': messageDiv.classList.add('bg-yellow-100', 'text-yellow-700'); break;
        case 'info': default: messageDiv.classList.add('bg-sky-100', 'text-sky-700'); break;
    }
}


