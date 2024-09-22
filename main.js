'use strict';

const firstDataRow = 7;
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function base64ToString(base64) {
    const binString = atob(base64);
    return decoder.decode(Uint8Array.from(binString, (m) => m.codePointAt(0)));
}
function stringToBase64(str) {
    const binString = Array.from(encoder.encode(str), (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString);
}

function daysInMonth(year, month) {
    // Month in JavaScript is 0-indexed (January is 0, February is 1, etc), but by using 0 as the day it will give us the last day of the prior
    // month. So passing in 1 as the month number will return the last day of January, not February
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

function column(startYear, year, month, day) {
    let days = 0;
    for (let y = startYear; y < year; y++) {
        days += daysInYear(y);
    }
    for (let m = 1; m < month; m++) {
        days += daysInMonth(year, m);
    }
    days += day;
    return days + 1;
}

function todayColumn(fromYear, toYear) {
    const today = new Date();
    if (today.getFullYear() >= fromYear && today.getFullYear() <= toYear) {
        return column(fromYear, today.getFullYear(), today.getMonth() + 1, today.getDate());
    } else if (today.getFullYear() < fromYear) {
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

$(document).on('alpine:init', function() {
  Alpine.store('grid', {
      sections: [ ],
      rowCount: firstDataRow,
      // reactivity isn't quite smart enough to always do the right thing here, so here's a
      // hacky trick to make sure that anything that depends on fromYear also depends on toYear
      // and vice versa
      get fromYear() { this._toYear;   return this._fromYear; },
      get toYear()   { this._fromYear; return this._toYear;   },
      set fromYear(value) { this._fromYear = value; },
      set toYear(value)   { this._toYear = value; },
      _fromYear: new Date().getFullYear() - 1,
      _toYear: new Date().getFullYear() + 1,
      gridShown: true
  });
});

$(function() {
    function updateGridHeaderStyles() {
        $('#grid-headers-dynamic-styles').html(`
            .sticky-against-row-headers {
                position: sticky;
                left: ${$('#row-headers-bg').outerWidth()}px;
            }
        `);
    }
    new ResizeObserver(updateGridHeaderStyles).observe($('#row-headers-bg')[0]);
    updateGridHeaderStyles();

    function updateUrl() {
        const url = new URL(window.location)
        url.searchParams.set("data", stringToBase64($('#textarea').val()));
        history.replaceState(null, '', url);
    }

    { // load state
        const savedDensity = localStorage.getItem('density');
        if (savedDensity !== null) {
            $('#density-range')[0].value = savedDensity;
        }
        const searchParam = new URL(window.location).searchParams.get('data');
        if (searchParam !== null) {
            $('#textarea').val(base64ToString(searchParam));
        } else {
            const savedData = localStorage.getItem('data');
            if (savedData !== null) {
                $('#textarea').val(savedData);
                updateUrl();
            }
        }
    }

    function updateDensityStyles() {
        const columnWidth = $('#density-range')[0].value;
        const oldScrollLeft = $('.grid')[0].scrollLeft;
        const oldGridWidth = $('#dummy-full-width-grid-row').width();

        const dayVisibilityBreakpoints = [
            [/* <= */  9 /* px */,    ['4n + 1', '4n + 3', '4n + 4']],
            [/* <= */ 12 /* px */,    ['3n + 1', '3n + 2']],
            [/* <= */ 19 /* px */,    ['2n + 1']],
        ];
        let rules = null;
        for (let i = 0; i < dayVisibilityBreakpoints.length; i++) {
            const [breakpoint, breakpointRules] = dayVisibilityBreakpoints[i];
            if (columnWidth <= breakpoint) {
                rules = breakpointRules;
                break;
            }
        }

        let html = `
            body {
              --column-width: ${columnWidth}px;
            }
        `;
        if (rules !== null) {
            html += `
                ${rules.map(r => `.day-column-header-container:nth-child(${r}) .day-column-header-text`).join(', ')} {
                  display: none;
                }
            `;
        }
        $('#density-dynamic-styles').html(html);

        const pos = (oldScrollLeft + ($(window).width() / 2)) / oldGridWidth;
        const newGridWidth = $('#dummy-full-width-grid-row').width();
        $('.grid')[0].scrollLeft = (pos * newGridWidth) - ($(window).width() / 2);
    }
    $('#density-range').on('input', function() {
        updateDensityStyles();
        localStorage.setItem('density', $('#density-range')[0].value);
    });
    updateDensityStyles();

    function onYearsChanged() {
        Alpine.store('grid').fromYear = parseInt($('#fromYear-select').val());
        Alpine.store('grid').toYear = parseInt($('#toYear-select').val());

        // toggling grid visibility when doing this seems to perform *much* better on Safari
        Alpine.store('grid').gridShown = false;
        Alpine.nextTick(function() {
            Alpine.store('grid').gridShown = true;
        });
    }
    $('#fromYear-select').on('change', onYearsChanged);
    $('#toYear-select').on('change', onYearsChanged);

    function renderData() {
        let result;
        try {
          const obj = yaml.load($('#textarea').val())
          let row = firstDataRow;
          let sections = [];
          for (const objSection of obj.sections) {
            if (objSection.pad) {
                row += objSection.pad;
                continue;
            }
            let items = [];
            for (const objItem of objSection.items) {
                if ('pad' in objItem) {
                    row += objItem.pad;
                    continue;
                }
                const item = {
                    id: String(objItem.id),
                    text: String(objItem.text),
                    index: row++
                };
                if ('header' in objItem) {
                    item.header = !!objItem.header;
                }
                items.push(item);
            }
            items[0]; // there should be at least one element, otherwise fail
            sections.push({
                id: String(objSection.id),
                items: items
            });
          }
          let title = null;
          if ('title' in obj) {
            title = String(obj.title);
          }
          result = {
            sections: sections,
            rowCount: row - 1,
            title: title
          };
        } catch (err) {
          console.info(err);
          $('#textarea').toggleClass('data-invalid', true);
          return;
        }
        $('#textarea').toggleClass('data-invalid', false);
        Alpine.store('grid').sections = result.sections;
        Alpine.store('grid').rowCount = result.rowCount;
        if (result.title) {
            document.title = result.title + ' - datum';
        }
    }
    $('#textarea').on('input', function() {
        updateUrl();
        localStorage.setItem('data', $('#textarea').val());
        renderData();
    });
    renderData();

    function scrollToToday() {
        $('.grid').animate({
            scrollLeft: $('.grid')[0].scrollLeft + $('#today-column-background').position().left - ($(window).width()) / 2  - $('#row-headers-bg').outerWidth() / 2
        }, 700);
    }
    $('#jump-to-today-button').on('click', scrollToToday);
    scrollToToday();
})
