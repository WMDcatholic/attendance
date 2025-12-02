// IndexedDB 관련 상수 및 변수 (참조용으로 주석 처리)
// const DB_NAME = 'SchedulePWA_DB';
// const DB_VERSION = 7;
const PARTICIPANTS_STORE_NAME = 'participants';
const SCHEDULES_STORE_NAME = 'schedules';
const SCHEDULE_CONFIRMATIONS_STORE_NAME = 'scheduleConfirmations';
const ATTENDANCE_LOG_STORE_NAME = 'attendanceLog';
const SCHEDULE_STATE_STORE_NAME = 'scheduleState';
const MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME = 'monthlyAssignmentCounts';

// 테스트용 목 데이터
let MOCK_PARTICIPANTS = null;
let MOCK_PREV_ASSIGNMENTS = null;
let MOCK_PREV_ABSENTEES = null;

export function __setMockData(participants, prevAssignments, prevAbsentees) {
    console.log("Setting mock DB data for test.");
    MOCK_PARTICIPANTS = participants ? JSON.parse(JSON.stringify(participants)) : null;
    if (prevAssignments) {
        MOCK_PREV_ASSIGNMENTS = new Map();
        for (const [pId, catMapData] of prevAssignments.entries()) {
            MOCK_PREV_ASSIGNMENTS.set(pId, new Map(catMapData));
        }
    } else {
        MOCK_PREV_ASSIGNMENTS = null;
    }
    MOCK_PREV_ABSENTEES = prevAbsentees ? JSON.parse(JSON.stringify(prevAbsentees)) : null;
}

export function __clearMockData() {
    console.log("Clearing mock DB data.");
    MOCK_PARTICIPANTS = null;
    MOCK_PREV_ASSIGNMENTS = null;
    MOCK_PREV_ABSENTEES = null;
}

// localStorage 유틸리티 함수들
function getStoreData(storeName) {
    try {
        const data = localStorage.getItem(storeName);
        return (data ? JSON.parse(data) : []) || [];
    } catch (e) {
        console.error(`Error reading from localStorage (${storeName}):`, e);
        return [];
    }
}

function setStoreData(storeName, data) {
    try {
        localStorage.setItem(storeName, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error writing to localStorage (${storeName}):`, e);
        return false;
    }
}

function getNextId(storeName) {
    const idKey = `${storeName}_nextId`;
    let nextId = parseInt(localStorage.getItem(idKey) || '1');
    localStorage.setItem(idKey, (nextId + 1).toString());
    return nextId;
}

// 원래 IndexedDB 열기 함수 (더 이상 사용하지 않음)
export function openDB() {
    // localStorage는 열 필요가 없으므로 빈 객체를 반환
    return Promise.resolve({});
}

// 일정 확정 관련 함수
export async function setScheduleConfirmation(year, month, status) {
    try {
        const id = `${year}_${month}`;
        const recordToStore = {
            id: id,
            year: year,
            month: month,
            confirmed: status,
            timestamp: new Date().getTime()
        };

        console.log(`[db.js] setScheduleConfirmation for ${year}-${month}: Attempting to store record:`, JSON.stringify(recordToStore));

        // localStorage에 저장
        localStorage.setItem(`schedule_confirmed_${id}`, JSON.stringify(recordToStore));
        console.log(`[db.js] setScheduleConfirmation for ${year}-${month}: Successfully stored in localStorage.`);

        return { success: true };
    } catch (error) {
        console.error(`[db.js] Error in setScheduleConfirmation for ${year}-${month}:`, error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function getScheduleConfirmation(year, month) {
    try {
        const id = `${year}_${month}`;

        // localStorage에서 확인
        const backupStr = localStorage.getItem(`schedule_confirmed_${id}`);
        if (backupStr) {
            const backup = JSON.parse(backupStr);
            console.log(`[db.js] getScheduleConfirmation for ${year}-${month} from localStorage:`, JSON.stringify(backup));

            if (backup && typeof backup.confirmed === 'boolean') {
                return backup.confirmed;
            }
        }

        // 없으면 기본값 반환
        console.log(`[db.js] getScheduleConfirmation for ${year}-${month}: No valid record found. Defaulting to false.`);
        return false;
    } catch (error) {
        console.error(`[db.js] Error in getScheduleConfirmation for ${year}-${month}:`, error);
        return false; // 오류 발생 시 기본값 반환
    }
}

export async function removeScheduleConfirmation(year, month) {
    try {
        const id = `${year}_${month}`;

        // localStorage에서 삭제
        localStorage.removeItem(`schedule_confirmed_${id}`);

        console.log(`[db.js] Schedule confirmation for ${year}-${month} removed successfully.`);
        return { success: true };
    } catch (error) {
        console.error(`[db.js] Error removing schedule confirmation for ${year}-${month}:`, error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

// 미사시간 확정 관련 함수 (Share 확정과 분리)
export async function setMassTimeConfirmation(year, month, status) {
    try {
        const id = `${year}_${month}`;
        const recordToStore = {
            id: id,
            year: year,
            month: month,
            confirmed: status,
            timestamp: new Date().getTime()
        };

        console.log(`[db.js] setMassTimeConfirmation for ${year}-${month}: Attempting to store record:`, JSON.stringify(recordToStore));

        // localStorage에 저장 (새로운 키 사용)
        localStorage.setItem(`mass_time_confirmed_${id}`, JSON.stringify(recordToStore));
        console.log(`[db.js] setMassTimeConfirmation for ${year}-${month}: Successfully stored in localStorage.`);

        return { success: true };
    } catch (error) {
        console.error(`[db.js] Error in setMassTimeConfirmation for ${year}-${month}:`, error);
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function getMassTimeConfirmation(year, month) {
    try {
        const id = `${year}_${month}`;

        // localStorage에서 확인 (새로운 키 사용)
        const storedData = localStorage.getItem(`mass_time_confirmed_${id}`);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log(`[db.js] getMassTimeConfirmation for ${year}-${month}: Found in localStorage:`, parsedData);
            return parsedData.confirmed === true;
        }

        console.log(`[db.js] getMassTimeConfirmation for ${year}-${month}: Not found in localStorage.`);
        return false;
    } catch (error) {
        console.error(`[db.js] Error in getMassTimeConfirmation for ${year}-${month}:`, error);
        return false;
    }
}

// 참가자 관련 함수
export async function addParticipant(participant) {
    try {
        const participants = getStoreData(PARTICIPANTS_STORE_NAME);
        const newId = getNextId(PARTICIPANTS_STORE_NAME);
        const newParticipant = { ...participant, id: newId };
        participants.push(newParticipant);
        setStoreData(PARTICIPANTS_STORE_NAME, participants);
        return newId;
    } catch (error) {
        console.error("Error adding participant:", error);
        throw error;
    }
}

export async function getAllParticipants() {
    if (MOCK_PARTICIPANTS) {
        console.log("DB MOCK: getAllParticipants called");
        return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PARTICIPANTS)));
    }
    try {
        return getStoreData(PARTICIPANTS_STORE_NAME);
    } catch (error) {
        console.error("Error getting all participants:", error);
        throw error;
    }
}

export async function getParticipant(id) {
    try {
        const participants = getStoreData(PARTICIPANTS_STORE_NAME);
        return participants.find(p => p.id === id) || null;
    } catch (error) {
        console.error(`Error getting participant ${id}:`, error);
        throw error;
    }
}

export async function updateParticipant(participant) {
    try {
        const participants = getStoreData(PARTICIPANTS_STORE_NAME);
        const index = participants.findIndex(p => p.id === participant.id);
        if (index !== -1) {
            participants[index] = participant;
            setStoreData(PARTICIPANTS_STORE_NAME, participants);
        }
        return participant.id;
    } catch (error) {
        console.error(`Error updating participant ${participant.id}:`, error);
        throw error;
    }
}

export async function deleteParticipant(id) {
    try {
        const participants = getStoreData(PARTICIPANTS_STORE_NAME);
        const filteredParticipants = participants.filter(p => p.id !== id);
        setStoreData(PARTICIPANTS_STORE_NAME, filteredParticipants);
    } catch (error) {
        console.error(`Error deleting participant ${id}:`, error);
        throw error;
    }
}

export async function deleteMultipleParticipants(ids) {
    try {
        const participants = getStoreData(PARTICIPANTS_STORE_NAME);
        const filteredParticipants = participants.filter(p => !ids.includes(p.id));
        setStoreData(PARTICIPANTS_STORE_NAME, filteredParticipants);
    } catch (error) {
        console.error("Error deleting multiple participants:", error);
        throw error;
    }
}

export async function deleteAllParticipants() {
    try {
        setStoreData(PARTICIPANTS_STORE_NAME, []);
        console.log('All participants deleted successfully.');
    } catch (error) {
        console.error('Error deleting all participants:', error);
        throw error;
    }
}

// 일정 관련 함수
export async function saveSchedule(year, month, scheduleData) {
    if (MOCK_PARTICIPANTS) {
        console.log("DB MOCK: saveSchedule called with", year, month, JSON.parse(JSON.stringify(scheduleData)).length, "days");
        return Promise.resolve();
    }
    try {
        const schedules = getStoreData(SCHEDULES_STORE_NAME);
        const index = schedules.findIndex(s => s.year === year && s.month === month);
        const schedule = { year, month, data: scheduleData };

        if (index !== -1) {
            schedules[index] = schedule;
        } else {
            schedules.push(schedule);
        }

        setStoreData(SCHEDULES_STORE_NAME, schedules);
    } catch (error) {
        console.error(`Error saving schedule for ${year}-${month}:`, error);
        throw error;
    }
}

export async function getAllSchedules() {
    try {
        return getStoreData(SCHEDULES_STORE_NAME);
    } catch (error) {
        console.error("Error getting all schedules:", error);
        throw error;
    }
}

export async function clearAllSchedules() {
    try {
        setStoreData(SCHEDULES_STORE_NAME, []);
        console.log('All schedules cleared.');
    } catch (error) {
        console.error('Error clearing schedules:', error);
        throw error;
    }
}

export async function getSchedule(year, month) {
    try {
        const schedules = getStoreData(SCHEDULES_STORE_NAME);
        return schedules.find(s => s.year === year && s.month === month) || null;
    } catch (error) {
        console.error(`Error getting schedule for ${year}-${month}:`, error);
        throw error;
    }
}

// 출석 로그 관련 함수
export async function addAttendanceLogEntry(entry) {
    try {
        const logs = getStoreData(ATTENDANCE_LOG_STORE_NAME);
        const newId = getNextId(ATTENDANCE_LOG_STORE_NAME);
        const newEntry = { ...entry, id: newId };
        logs.push(newEntry);
        setStoreData(ATTENDANCE_LOG_STORE_NAME, logs);
        return newId;
    } catch (error) {
        console.error("Error adding attendance log entry:", error);
        throw error;
    }
}

export async function getAllAttendanceLogs() {
    try {
        return getStoreData(ATTENDANCE_LOG_STORE_NAME);
    } catch (error) {
        console.error("Error getting all attendance logs:", error);
        throw error;
    }
}

export async function clearAllAttendanceLogs() {
    try {
        setStoreData(ATTENDANCE_LOG_STORE_NAME, []);
        console.log('All attendance logs cleared.');
    } catch (error) {
        console.error('Error clearing attendance logs:', error);
        throw error;
    }
}

export async function getAbsenteesForMonth(year, month) {
    if (MOCK_PREV_ABSENTEES) {
        console.log("DB MOCK: getAbsenteesForMonth called for", year, month);
        return Promise.resolve(JSON.parse(JSON.stringify(MOCK_PREV_ABSENTEES)));
    }
    try {
        const logs = getStoreData(ATTENDANCE_LOG_STORE_NAME);
        const absentLogs = logs.filter(log =>
            log.year === year &&
            log.month === month &&
            log.status === 'absent'
        );

        const absenteesMap = new Map();
        absentLogs.forEach(record => {
            absenteesMap.set(record.participantId, (absenteesMap.get(record.participantId) || 0) + 1);
        });

        return Array.from(absenteesMap.keys());
    } catch (error) {
        console.error(`Error getting absentees for ${year}-${month}:`, error);
        throw error;
    }
}

export async function getAttendanceLogForParticipantDate(participantId, dateString) {
    try {
        const logs = getStoreData(ATTENDANCE_LOG_STORE_NAME);
        return logs.find(r =>
            r.participantId === participantId &&
            r.date === dateString &&
            r.status === 'absent'
        ) || null;
    } catch (error) {
        console.error(`Error getting attendance log for participant ${participantId} on ${dateString}:`, error);
        throw error;
    }
}

export async function deleteAttendanceLogEntry(id) {
    try {
        const logs = getStoreData(ATTENDANCE_LOG_STORE_NAME);
        const filteredLogs = logs.filter(log => log.id !== id);
        setStoreData(ATTENDANCE_LOG_STORE_NAME, filteredLogs);
    } catch (error) {
        console.error(`Error deleting attendance log entry ${id}:`, error);
        throw error;
    }
}

export async function clearAbsencesForPeriod(year, month, day = null) {
    try {
        const logs = getStoreData(ATTENDANCE_LOG_STORE_NAME);
        let deleteCount = 0;
        let filteredLogs;

        if (day) {
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            filteredLogs = logs.filter(log => {
                if (log.date === dateString && log.status === 'absent') {
                    deleteCount++;
                    return false;
                }
                return true;
            });
        } else {
            filteredLogs = logs.filter(log => {
                if (log.year === year && log.month === month && log.status === 'absent') {
                    deleteCount++;
                    return false;
                }
                return true;
            });
        }

        setStoreData(ATTENDANCE_LOG_STORE_NAME, filteredLogs);
        console.log(`Cleared ${deleteCount} absence logs for ${year}-${month}${day ? '-' + String(day).padStart(2, '0') : ''}.`);
        return deleteCount;
    } catch (error) {
        console.error('Error clearing absences:', error);
        throw error;
    }
}

// 일정 상태 관련 함수
export async function getAllScheduleStates() {
    try {
        return getStoreData(SCHEDULE_STATE_STORE_NAME);
    } catch (error) {
        console.error("Error getting all schedule states:", error);
        throw error;
    }
}

export async function getScheduleState(category) {
    try {
        const states = getStoreData(SCHEDULE_STATE_STORE_NAME);
        const state = states.find(s => s.category === category);
        return state ? state.value : undefined;
    } catch (error) {
        console.error(`Error getting schedule state for ${category}:`, error);
        throw error;
    }
}

export async function saveScheduleState(category, value) {
    try {
        const states = getStoreData(SCHEDULE_STATE_STORE_NAME);
        const index = states.findIndex(s => s.category === category);

        if (index !== -1) {
            states[index].value = value;
        } else {
            states.push({ category, value });
        }

        setStoreData(SCHEDULE_STATE_STORE_NAME, states);
    } catch (error) {
        console.error(`Error saving schedule state for ${category}:`, error);
        throw error;
    }
}

export async function resetAllScheduleState() {
    try {
        setStoreData(SCHEDULE_STATE_STORE_NAME, []);
        console.log('All schedule states have been reset.');
    } catch (error) {
        console.error('Error resetting schedule states:', error);
        throw error;
    }
}

// 월별 배정 수 관련 함수
export async function getAllMonthlyAssignmentCounts() {
    try {
        return getStoreData(MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME);
    } catch (error) {
        console.error("Error getting all monthly assignment counts:", error);
        throw error;
    }
}

export async function clearAllMonthlyAssignmentCounts() {
    try {
        setStoreData(MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME, []);
        console.log('All monthly assignment counts cleared.');
    } catch (error) {
        console.error('Error clearing monthly assignment counts:', error);
        throw error;
    }
}

export async function saveMonthlyAssignmentCounts(year, month, assignmentData) {
    if (MOCK_PARTICIPANTS) {
        console.log("DB MOCK: saveMonthlyAssignmentCounts called with", year, month, JSON.parse(JSON.stringify(assignmentData)));
        return Promise.resolve();
    }
    try {
        const counts = getStoreData(MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME);

        // 해당 월의 기존 데이터 제거
        const filteredCounts = counts.filter(c => !(c.year === year && c.month === month));

        // 새 데이터 추가
        const newCounts = assignmentData.map(item => ({
            year,
            month,
            participantId: item.participantId,
            categoryKey: item.categoryKey,
            count: item.count
        }));

        setStoreData(MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME, [...filteredCounts, ...newCounts]);
        console.log(`Deleted ${counts.length - filteredCounts.length} old assignment count entries for ${year}-${month}.`);
    } catch (error) {
        console.error(`Error saving monthly assignment counts for ${year}-${month}:`, error);
        throw error;
    }
}

export async function getPreviousMonthAssignmentCounts(currentYear, currentMonth) {
    if (MOCK_PREV_ASSIGNMENTS) {
        console.log("DB MOCK: getPreviousMonthAssignmentCounts called for", currentYear, currentMonth);
        const clonedMap = new Map();
        for (const [pId, catMap] of MOCK_PREV_ASSIGNMENTS.entries()) {
            clonedMap.set(pId, new Map(catMap));
        }
        return Promise.resolve(clonedMap);
    }

    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
    }

    try {
        const counts = getStoreData(MONTHLY_ASSIGNMENT_COUNTS_STORE_NAME);
        const prevMonthCounts = counts.filter(c => c.year === prevYear && c.month === prevMonth);

        const countsMap = new Map();
        prevMonthCounts.forEach(record => {
            if (!countsMap.has(record.participantId)) {
                countsMap.set(record.participantId, new Map());
            }
            countsMap.get(record.participantId).set(record.categoryKey, record.count);
        });

        return countsMap;
    } catch (error) {
        console.error(`Error getting previous month assignment counts for ${prevYear}-${prevMonth}:`, error);
        throw error;
    }
}

export async function bulkPutStoreData(storeName, itemsArray) {
    if (!itemsArray || itemsArray.length === 0) {
        return Promise.resolve();
    }

    try {
        const existingData = getStoreData(storeName);
        const updatedData = [...existingData];

        // 각 항목에 대해 ID가 있으면 업데이트, 없으면 추가
        itemsArray.forEach(item => {
            if (item.id) {
                const index = updatedData.findIndex(d => d.id === item.id);
                if (index !== -1) {
                    updatedData[index] = item;
                } else {
                    updatedData.push(item);
                }
            } else {
                const newId = getNextId(storeName);
                updatedData.push({ ...item, id: newId });
            }
        });

        setStoreData(storeName, updatedData);
        console.log(`Successfully put ${itemsArray.length} items into ${storeName}.`);
    } catch (error) {
        console.error(`Error bulk putting data into ${storeName}:`, error);
        throw error;
    }
}
