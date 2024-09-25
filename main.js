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
      sections: [ ],
      rowCount: firstDataRow,
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
        if (nowMs - lastGridScrollLeftSampleMs > 70) {
            // re-sampling the scroll left value introduces rounding errors, so if we just set the value,
            // favour the value we set
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
        const todayOffset = $('#today-column-background').position().left + ($('#density-range')[0].value / 2);
        $('.grid').animate({
            scrollLeft: $('.grid')[0].scrollLeft + todayOffset - ($(window).width() - $('#row-headers-bg').outerWidth()) / 2 - $('#row-headers-bg').outerWidth()
        }, 700);
    }
    $('#jump-to-today-button').on('click', scrollToToday);
    scrollToToday();
})
