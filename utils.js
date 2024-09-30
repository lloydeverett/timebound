'use strict';

/*
 * stateless helper functions defined before the first render
*/

const autoCompactRowBreakpoint = 20 /* px */;
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
        days += daysInMonth(year, month) - day;
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

function continguousRanges(values) {
    const sorted = [...values];
    sorted.sort((a, b) => a - b);
    let results = []
    for (let i = 0; i < sorted.length; ) {
        const start = i;
        for (i++; i < sorted.length && sorted[i] === sorted[i - 1] + 1; i++) {}
        const end = i - 1;
        results.push([sorted[start], sorted[end]]);
    }
    return results;
}

function sprints(fromYear, toYear, egSprintStart, egSprintIndex, sprintLength) {
    const firstColumn = column(fromYear, fromYear, 1, 1);
    const lastColumn = column(fromYear, toYear, 12, 31);
    const egStartColumn = column(fromYear, egSprintStart[0], egSprintStart[1], egSprintStart[2]);
    const egEndColumn = egStartColumn + sprintLength - 1;

    let results = []

    // find the sprint overlapping fromYear Jan 1
    let div = Math.trunc((egEndColumn - firstColumn + 1) / sprintLength);
    let mod = (egEndColumn - firstColumn + 1) % sprintLength;
    if (mod <= 0) {
        div--;
        mod += sprintLength;
    }
    let start = firstColumn;
    let end = firstColumn + mod - 1;
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

function resolveRowRef(sections, ref) {
    for (const section of sections) {
        if (section.id === ref && section.items.length > 0) {
            return section.items[0];
        }
        for (const item of section.items) {
            if (item.id === ref) {
                return item;
            }
        }
    }
    return null;
}

function resolveRowRefWithPossibleSubdivision(sections, ref) {
    const match = ref.match(/^(.*)\.(\d+)$/);
    let id;
    let subdivision;
    if (match) {
        id = match[1];
        subdivision = Number(match[2]);
    } else {
        id = ref;
        subdivision = null;
    }
    const resolutionResult = resolveRowRef(sections, id);
    if (resolutionResult === null) {
        return null;
    }
    return { item: resolutionResult, subdivision: subdivision }
}

function includesOfEntry(sections, entry) {
    let results = [];
    for (const section of sections) {
        for (const item of section.items) {
            for (const includedTag of item.includeTags) {
                for (const entryTag of entry.tags) {
                    if (includedTag === entryTag) { results.push(item); }
                }
            }
        }
    }
    return results;
}

function entriesIncludedByItem(item, entries) {
    let results = [];
    for (const entry of entries) {
        for (const includedTag of item.includeTags) {
            for (const entryTag of entry.tags) {
                if (includedTag === entryTag) { results.push(entry); }
            }
        }
    }
    return results;
}

function readUserSpecifiedSprintStart(sprintStart) {
    const date = new Date(sprintStart);
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

function readUserSpecifiedStartColumn(fromYear, toYear, col) {
    if (col === '-1') { return column(fromYear, fromYear, 1, 1); }
    const date = new Date(col);
    return column(fromYear, date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function readUserSpecifiedEndColumn(fromYear, toYear, col) {
    if (col === '-1') { return column(fromYear, toYear, 12, 31) + 1; }
    const date = new Date(col);
    return column(fromYear, date.getFullYear(), date.getMonth() + 1, date.getDate()) + 1;
}

function readUserSpecifiedStartRow(sections, firstDataRow, rowCount, row) {
    if (row.match(/^[A-Za-z]/)) {
        const resolvedItem = resolveRowRefWithPossibleSubdivision(sections, row);
        if (resolvedItem !== null) {
            return resolvedItem.item.index + (resolvedItem.subdivision === null ? 0 : (resolvedItem.subdivision - 1));
        }
    }
    if (isNaN(Number(row))) {
        return firstDataRow - 1;
    }
    return firstDataRow + Number(row) - 1;
}

function readUserSpecifiedEndRow(sections, firstDataRow, rowCount, row) {
    if (row === '-1') { return rowCount + 2; }
    if (row.match(/^[A-Za-z]/)) {
        const resolvedItem = resolveRowRefWithPossibleSubdivision(sections, row);
        if (resolvedItem !== null) {
            return resolvedItem.subdivision === null ? (resolvedItem.item.endIndex + 1) : (resolvedItem.item.index + resolvedItem.subdivision);
        }
    }
    if (isNaN(Number(row))) {
        return firstDataRow - 1;
    }
    return firstDataRow + Number(row);
}

function expandDefaults(sections, entry) {
    if (!entry.row.match(/^[A-Za-z]/)) {
        return entry;
    }
    const resolvedItem = resolveRowRef(sections, entry.row);
    if (resolvedItem === null || resolvedItem.defaults === null) {
        return entry;
    }
    let additions = {};
    for (const key in entry) {
        if (entry[key] === null && key in resolvedItem.defaults) {
            additions[key] = resolvedItem.defaults[key];
        }
    }
    return {...entry, ...additions};
}

function densitySliderValueToColumnWidth(value) {
    return Math.pow(value, 2);
}

function columnWidthToDensitySliderValue(columnWidth) {
    return Math.sqrt(columnWidth);
}

function sectionRowHeightMultipliers(sections, rowCount) {
    let result = [];
    for (let i = firstDataRow; i < rowCount; i++) { result.push(1); }
    for (const section of sections) {
        for (const item of section.items) {
            if (item.height === null) { continue; }
            for (let i = item.index; i <= item.endIndex; i++) {
                result[i - firstDataRow] = item.height / (item.slots === null ? 1 : item.slots);
            }
        }
    }
    return result;
}

function isCompact(sections, rowCount, rowHeight, item) {
    if (item.compact !== null) {
        return item.compact;
    }
    const slots = item.slots === null ? 1 : item.slots;
    const actualHeight = ((item.height === null) ? slots : item.height) * rowHeight;
    return actualHeight / slots <= autoCompactRowBreakpoint;
}

// nb: unlike the others, this function isn't pure in that it mutates its input paramaters by adding occupancy info
//     it should otherwise be stateless / have no side effects though
function calculateSlotOccupancy(fromYear, toYear, sections, entries) {
    for (const entry of entries) {
        entry.occupiedSlots = new Map();
        entry.currentOccupiedSlots = new Map(); // used for calculation
    }
    for (const section of sections) {
        for (const item of section.items) {
            const deltas = entriesIncludedByItem(item, entries).flatMap(entry => {
                const c1 = readUserSpecifiedStartColumn(fromYear, toYear, entry.col);
                const c2 = readUserSpecifiedEndColumn(fromYear, toYear, entry.toCol === null ? entry.col : entry.toCol);
                if (isNaN(c1) || isNaN(c2)) {
                    return [];
                }
                return [
                    { delta: -1, col: Math.min(c1, c2), entry: entry },
                    { delta: 1, col: Math.max(c1, c2), entry: entry }
                ];
            }).sort((a, b) => {
                // sort by column
                if (a.col != b.col) {
                    return a.col - b.col;
                }
                // and then -delta (process freeing of slots (1) before consumption of slots (-1))
                return b.delta - a.delta;
            });

            let totalSlots = item.slots === null ? 1 : item.slots;
            const slots = range(0, totalSlots - 1);
            const negativeSlots = [];
            let minSlot = 0;
            let usageCurve = [];
            let usage = 0;
            for (let i = 0; i < deltas.length; ) {
                const col = deltas[i].col;
                let columnDelta = 0;
                for (; i < deltas.length && deltas[i].col === col; i++) {
                    columnDelta += deltas[i].delta;

                    let currentOccupiedSlots;
                    if (deltas[i].entry.currentOccupiedSlots.has(item.index)) {
                        currentOccupiedSlots = deltas[i].entry.currentOccupiedSlots.get(item.index);
                    } else {
                        currentOccupiedSlots = [];
                        deltas[i].entry.currentOccupiedSlots.set(item.index, currentOccupiedSlots);
                    }
                    let occupiedSlots;
                    if (deltas[i].entry.occupiedSlots.has(item.index)) {
                        occupiedSlots = deltas[i].entry.occupiedSlots.get(item.index);
                    } else {
                        occupiedSlots = [];
                        deltas[i].entry.occupiedSlots.set(item.index, occupiedSlots);
                    }

                    if (deltas[i].delta < 0) { // consume slot
                        let slot;
                        if (slots.length > 0) {
                            slot = slots.shift();
                        } else if (negativeSlots.length > 0) {
                            slot = negativeSlots.shift();
                        } else {
                            slot = --minSlot;
                        }
                        occupiedSlots.push(slot);
                        currentOccupiedSlots.push(slot);
                    } else if (deltas[i].delta > 0) { // free slot
                        if (currentOccupiedSlots.length === 0) {
                            console.error('uh oh, algorithm wanted to free a slot that was never consumed by  ' + deltas[i].entry.text);
                            continue;
                        }
                        const occupiedSlot = currentOccupiedSlots.pop();
                        if (occupiedSlot >= 0) {
                            slots.unshift(occupiedSlot);
                        } else {
                            negativeSlots.unshift(occupiedSlot);
                        }
                    }
                }
                usage -= columnDelta;
                usageCurve.push({ col: col, usage: usage });
            }
            item.usageCurve = usageCurve;
        }
    }
    for (const entry of entries) {
        delete entry.currentOccupiedSlots;
    }
}
