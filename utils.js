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
    if (fromYear <= year) {
        for (let y = fromYear; y < year; y++) {
            days += daysInYear(y);
        }
        for (let m = 1; m < month; m++) {
            days += daysInMonth(year, m);
        }
        days += day;
        return days + 1;
    } else {
        for (let y = year + 1; y < fromYear; y++) {
            days += daysInYear(y);
        }
        for (let m = 12; m > month; m--) {
            days += daysInMonth(year, m);
        }
        days += daysInMonth(year, month);
        days -= day;
        return -days + 1;
    }
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
    const egStartColumn = column(fromYear, egSprintStart[0], egSprintStart[1], egSprintStart[2]);
    const egEndColumn = egStartColumn + sprintLength - 1;

    let results = []

    // find the sprint overlapping fromYear Jan 1
    let div = Math.trunc((egEndColumn - firstColumn + 1) / sprintLength);
    let mod = (egEndColumn + (10000 * sprintLength) - firstColumn + 1) % sprintLength;
    console.log(mod);
    if (mod === 0) {
        mod = sprintLength;
    }
    let end = firstColumn + mod - 1;
    /*
    // ok, so the first sprint that starts in fromYear starts at Jan 1 + mod - 1
    // unless mod == 1, in which case it starts at Jan 1
    // let end;
    // if (mod === 1) {
    //     end = firstColumn + sprintLength - 1;
    // } else {
    //     end = firstColumn + mod - 2;
    // }
    */
    let start = firstColumn;
    let index = egSprintIndex - div;

    // loop from there
    for (;
         end < lastColumn;
         start = end + 1, end += sprintLength, index++) {
        results.push({ start: start, end: end, index: index });
    }
    results.push({ start: start, end: lastColumn, index: index });

    return results;
}
