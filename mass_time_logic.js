import * as db from './db.js';
import { isScheduleConfirmed } from './share_logic.js';

const TIME_SLOT_CONFIG = {
    'Mon': [{ time: '06:00', type: 'elementary', sequential: true, categoryKey: 'elementary_6am' }],
    'Tue': [{ time: '19:30', type: 'elementary', random: true, categoryKey: 'elementary_random' }],
    'Wed': [{ time: '06:00', type: 'elementary', sequential: true, categoryKey: 'elementary_6am' }],
    'Thu': [{ time: '19:30', type: 'elementary', random: true, categoryKey: 'elementary_random' }],
    'Fri': [{ time: '06:00', type: 'elementary', sequential: true, categoryKey: 'elementary_6am' }],
    'Sat': [{ time: '10:00', type: 'elementary', random: true, categoryKey: 'elementary_random' }, { time: '16:00', type: 'elementary', random: true, categoryKey: 'elementary_random' }, { time: '18:00', type: 'middle', random: true, categoryKey: 'middle_random' }],
    'Sun': [{ time: '07:00', type: 'middle', sequential: true, categoryKey: 'middle_7am' }, { time: '09:00', type: 'middle', random: true, categoryKey: 'middle_random' }, { time: '11:00', type: 'middle', random: true, categoryKey: 'middle_random' }, { time: '18:00', type: 'middle', random: true, categoryKey: 'middle_random' }]
};
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekOfMonth(date) {
    return Math.floor((date.getDate() - 1) / 7);
}

export function getPatternFromSchedule(scheduleData) {
    const pattern = {};
    DAYS_OF_WEEK.forEach(day => pattern[day] = []);

    if (!scheduleData || !Array.isArray(scheduleData)) return pattern;

    scheduleData.forEach(dayEntry => {
        const dayOfWeek = dayEntry.dayOfWeek; // 'Mon', 'Tue', etc.
        if (!pattern[dayOfWeek]) return;

        dayEntry.timeSlots.forEach(slot => {
            // Check if this slot (time + type) is already in the pattern for this day
            const exists = pattern[dayOfWeek].some(pSlot =>
                pSlot.time === slot.time && pSlot.type === slot.type
            );

            if (!exists) {
                pattern[dayOfWeek].push({
                    time: slot.time,
                    type: slot.type,
                    categoryKey: slot.categoryKey
                });
            }
        });
    });

    // Sort slots for each day
    Object.keys(pattern).forEach(day => {
        pattern[day].sort((a, b) => a.time.localeCompare(b.time));
    });

    return pattern;
}

export function createScheduleFromPattern(year, month, pattern) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let scheduleData = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeekShort = DAYS_OF_WEEK[currentDate.getDay()];

        const slotsForDay = pattern[dayOfWeekShort] || [];

        if (slotsForDay.length > 0) {
            let dayScheduleEntry = { date: dateStr, dayOfWeek: dayOfWeekShort, timeSlots: [] };

            slotsForDay.forEach(slotInfo => {
                dayScheduleEntry.timeSlots.push({
                    time: slotInfo.time,
                    type: slotInfo.type,
                    assigned: [],
                    assignedNames: ['미배정'],
                    isFixedStatus: [false, false],
                    categoryKey: slotInfo.categoryKey
                });
            });

            scheduleData.push(dayScheduleEntry);
        }
    }

    return scheduleData;
}

export async function generateSchedule(year, month) {
    const scheduleIsConfirmed = await isScheduleConfirmed(year, month);
    console.log(`[mass_time_logic.js] generateSchedule: isScheduleConfirmed returned: ${scheduleIsConfirmed} for ${year}-${month}`);
    if (scheduleIsConfirmed) {
        console.log(`[mass_time_logic.js] Schedule generation for ${year}-${month} BLOCKED because it is confirmed.`);
        throw new Error(`SCHEDULE_CONFIRMED: ${year}년 ${month}월의 일정은 이미 확정되었습니다. 재생성할 수 없습니다.`);
    }
    console.log(`[mass_time_logic.js] Schedule generation for ${year}-${month} PROCEEDING (Structure Only).`);

    const vacationStartDateStr = sessionStorage.getItem('vacationStartDate');
    const vacationEndDateStr = sessionStorage.getItem('vacationEndDate');
    let vacationStartDate = null;
    let vacationEndDate = null;

    if (vacationStartDateStr && vacationEndDateStr) {
        vacationStartDate = new Date(vacationStartDateStr);
        vacationEndDate = new Date(vacationEndDateStr);
        if (vacationStartDate) vacationStartDate.setHours(0, 0, 0, 0);
        if (vacationEndDate) vacationEndDate.setHours(0, 0, 0, 0);
        const firstDayOfCurrentMonth = new Date(year, month - 1, 1);
        const lastDayOfCurrentMonth = new Date(year, month, 0);
        if (vacationEndDate < firstDayOfCurrentMonth || vacationStartDate > lastDayOfCurrentMonth) {
            vacationStartDate = null;
            vacationEndDate = null;
        }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    let scheduleData = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeekShort = DAYS_OF_WEEK[currentDate.getDay()];
        const dayOfWeekNumeric = currentDate.getDay();

        let dayScheduleEntry = { date: dateStr, dayOfWeek: dayOfWeekShort, timeSlots: [] };

        const slotsForDayConfig = [...(TIME_SLOT_CONFIG[dayOfWeekShort] || [])];

        if (vacationStartDate && vacationEndDate &&
            currentDate >= vacationStartDate && currentDate <= vacationEndDate &&
            dayOfWeekNumeric >= 1 && dayOfWeekNumeric <= 5) {
            slotsForDayConfig.push({
                time: '10:00',
                type: 'elementary',
                random: true,
                categoryKey: 'elementary_vacation_10am',
                isVacationSlot: true
            });
        }

        // Sort slots by time
        slotsForDayConfig.sort((a, b) => {
            if (a.time < b.time) return -1;
            if (a.time > b.time) return 1;
            return 0;
        });

        for (const slotInfo of slotsForDayConfig) {
            dayScheduleEntry.timeSlots.push({
                time: slotInfo.time,
                type: slotInfo.type,
                assigned: [], // Empty assignment
                assignedNames: ['미배정'], // Explicitly mark as Unassigned
                isFixedStatus: [false, false],
                categoryKey: slotInfo.categoryKey
            });
        }

        if (dayScheduleEntry.timeSlots.length > 0) {
            scheduleData.push(dayScheduleEntry);
        }
    }

    // Sort schedule data by date (though loop order guarantees it, good for safety)
    scheduleData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Save empty schedule to DB
    await db.saveSchedule(year, month, scheduleData);

    return { schedule: scheduleData };
}
