'use strict';

/*
 * define stateless helper functions defined before the first render
*/

const firstDataRow = 7;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function daysInMonth(year, month) {
    // month in JavaScript is 0-indexed (January is 0, February is 1, etc), but by using 0 as the day it will give us the last day of the prior month
    // so passing in 1 as the month number will return the last day of January, not February
    return new Date(year, month, 0).getDate();
}

function daysInYear(year) {
    return 337 + daysInMonth(year, 2);
}

function daysInYears(fromYear, toYear) {
    let days = 0;
    for (let y = fromYear; y <= toYear; y++) {
        days += daysInYear(y);
    }
    return days;
}

function weekday(year, month, day) {
    return weekdays[new Date(year, month - 1, day).getDay()];
}

function isWeekend(year, month, day) {
    const date = new Date(year, month - 1, day).getDay();
    return date === 0 || date === 6;
}

function column(fromYear, year, month, day) {
    let days = 0;
    for (let y = fromYear; y < year; y++) {
        days += daysInYear(y);
    }
    for (let m = 1; m < month; m++) {
        days += daysInMonth(year, m);
    }
    days += day;
    return days + 1;
}

function clampedColumn(fromYear, toYear, dateValue) {
    if (dateValue.getFullYear() >= fromYear && dateValue.getFullYear() <= toYear) {
        return column(fromYear, dateValue.getFullYear(), dateValue.getMonth() + 1, dateValue.getDate());
    } else if (dateValue.getFullYear() < fromYear) {
        return 2;
    } else {
        return column(fromYear, toYear, 12, 31);
    }
}

function range(start, end) {
    const length = end - start + 1;
    const result = Array(length);
    for (let i = 0; i < length; i++) {
        result[i] = start + i;
    }
    return result;
}

function sprints(fromYear, toYear, egSprintStart, egSprintIndex, sprintLength) {
    const firstColumn = column(fromYear, fromYear, 1, 1);
    const lastColumn = column(fromYear, toYear, 12, 31);
    const egColumn = column(fromYear, egSprintStart[0], egSprintStart[1], egSprintStart[2]);

    let results = []
    let index;
    let start;
    let end;

    for (index = egSprintIndex, start = egColumn, end = start + sprintLength - 1;
         end < lastColumn;
         start += sprintLength, end += sprintLength, index++) {
        results.push({ start: start, end: end, index: index });
    }
    results.push({ start: start, end: lastColumn, index: index });

    for (index = egSprintIndex - 1, end = egColumn - 1, start = end - sprintLength + 1;
         start > firstColumn;
         start -= sprintLength, end -= sprintLength, index--) {
        results.unshift({ start: start, end: end, index: index });
    }
    results.unshift({ start: firstColumn, end: end, index: index });

    return results;
}
