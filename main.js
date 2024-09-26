'use strict';

// breakpoints w.r.t. column width based on density slider
const abbreviateSprintsBreakpoint = /* <= */ 9 /* px */;
const dayVisibilityBreakpoints = [
    [/* <= */  7 /* px */,    ['5n + 2', '5n + 3', '5n + 4', '5n + 5']],
    [/* <= */  9 /* px */,    ['4n + 1', '4n + 3', '4n + 4']],
    [/* <= */ 12 /* px */,    ['3n + 1', '3n + 2']],
    [/* <= */ 20 /* px */,    ['2n + 1']],
];

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

$(document).on('alpine:init', function() {
  const today = new Date();
  const weAreHalfwayThroughTheYear = today.getMonth() + 1 >= 6;
  const thisYear = today.getFullYear();
  Alpine.store('grid', {
      firstDataRow: firstDataRow,
      rowCount: firstDataRow,
      sections: [],
      entries: [],
      egSprintStart: [2024, 1, 1],
      egSprintIndex: 1,
      // reactivity isn't quite smart enough to always do the right thing here, so here's a
      // hacky trick to make sure that anything that depends on fromYear also depends on toYear
      // and vice versa
      get fromYear() { this._toYear;   return this._fromYear; },
      get toYear()   { this._fromYear; return this._toYear;   },
      set fromYear(value) { this._fromYear = value; },
      set toYear(value)   { this._toYear = value; },
      _fromYear: weAreHalfwayThroughTheYear ? thisYear : thisYear - 1,
      _toYear: weAreHalfwayThroughTheYear ? thisYear + 1 : thisYear,
      abbreviateSprints: false
  });
});

$(function() {
    function updateGridHeaderStyles() {
        $('#grid-headers-dynamic-styles').html(`
            .sticky-against-row-headers {
                position: sticky;
                left: calc(${$('#row-headers-bg').outerWidth()}px + var(--sticky-against-row-headers-extra-padding));
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

    let gridScrollLeft = $('.grid')[0].scrollLeft;
    let lastGridScrollLeftSampleMs = +new Date();
    function updateDensityStyles() {
        const oldGridWidth = $('#dummy-full-width-grid-row').width();
        const columnWidth = $('#density-range')[0].value;

        const nowMs = +new Date();
        // re-sampling the scroll left value introduces rounding errors, so if we just set the value,
        // favour the value we set
        if (nowMs - lastGridScrollLeftSampleMs > 70) {
            gridScrollLeft = $('.grid')[0].scrollLeft;
        }
        lastGridScrollLeftSampleMs = nowMs;

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

        const pos = (gridScrollLeft + ($(window).width() / 2)) / oldGridWidth;
        const newGridWidth = $('#dummy-full-width-grid-row').width();
        gridScrollLeft = (pos * newGridWidth) - ($(window).width() / 2);
        $('.grid')[0].scrollLeft = gridScrollLeft;

        Alpine.store('grid').abbreviateSprints = columnWidth <= abbreviateSprintsBreakpoint;
    }
    $('#density-range').on('input', function() {
        updateDensityStyles();
        localStorage.setItem('density', $('#density-range')[0].value);
    });
    updateDensityStyles();

    function onYearsChanged() {
        Alpine.store('grid').fromYear = parseInt($('#fromYear-select').val());
        Alpine.store('grid').toYear = parseInt($('#toYear-select').val());

        // detach and reattach all the children of the grid
        // no real rationale for doing this, it just seems to perform much better on Safari
        const stuff = $('.grid > *').detach();
        stuff.appendTo('.grid');
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
            sections.push({
                id: String(objSection.id),
                items: items
            });
          }
          let title = null;
          if ('title' in obj) {
            title = String(obj.title);
          }

          let egSprintStart = null;
          let egSprintIndex = null;
          if ('sprints' in obj) {
            egSprintStart = [Number(obj.sprints.egSprintStart[0]), Number(obj.sprints.egSprintStart[1]), Number(obj.sprints.egSprintStart[2])];
            egSprintIndex = Number(obj.sprints.egSprintIndex);
          }

          let entries = []
          if ('entries' in obj) {
            for (const objEntry of obj.entries) {
                entries.push({
                  row: (Array.isArray(objEntry.row) && objEntry.row.length >= 1) ? String(objEntry.row[0]) : String(objEntry.row),
                  col: (Array.isArray(objEntry.col) && objEntry.col.length >= 1) ? String(objEntry.col[0]) : String(objEntry.col),
                  toRow: (Array.isArray(objEntry.row) && objEntry.row.length >= 2) ? String(objEntry.row[1]) : null,
                  toCol: (Array.isArray(objEntry.col) && objEntry.col.length >= 2) ? String(objEntry.col[1]) : null,
                  bg: 'bg' in objEntry ? String(objEntry.bg) : null,
                  style: 'style' in objEntry ? String(objEntry.style) : null,
                  text: String(objEntry.text)
                });
            }
          }
          result = {
            sections: sections,
            entries: entries,
            rowCount: row - 1,
            title: title,
            egSprintStart: egSprintStart,
            egSprintIndex: egSprintIndex
          };
        } catch (err) {
          console.info('Error while processing input:', err);
          $('#textarea').toggleClass('data-invalid', true);
          return;
        }
        $('#textarea').toggleClass('data-invalid', false);
        const store = Alpine.store('grid');
        if (result.egSprintStart !== null && result.egSprintIndex !== null) {
            store.egSprintStart = result.egSprintStart;
            store.egSprintIndex = result.egSprintIndex;
        }

        // nb: order we set these is important; beware reactivity bugs
        store.entries = result.entries;
        store.sections = result.sections;
        store.rowCount = result.rowCount;

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

    let animating = false;
    function scrollToToday() {
        if (animating) { return; }

        const animationDurationMs = 700;
        const todayOffset = $('#today-column-background').position().left + ($('#density-range')[0].value / 2);

        animating = true;
        $('.grid').animate({
            scrollLeft: $('.grid')[0].scrollLeft + todayOffset - ($(window).width() - $('#row-headers-bg').outerWidth()) / 2 - $('#row-headers-bg').outerWidth()
        }, animationDurationMs, 'swing', function() {
            animating = false;
        });
    }
    $('#jump-to-today-button').on('click', scrollToToday);
    scrollToToday();
})
