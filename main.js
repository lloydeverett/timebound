'use strict';

// breakpoints w.r.t. column width based on density slider
const abbreviateSprintsBreakpoint = /* <= */ 9 /* px */;
const dayVisibilityBreakpoints = [
    [/* <= */  7 /* px */,    ['5n + 2', '5n + 3', '5n + 4', '5n + 5']],
    [/* <= */  9 /* px */,    ['4n + 1', '4n + 3', '4n + 4']],
    [/* <= */ 12 /* px */,    ['3n + 1', '3n + 2']],
    [/* <= */ 20 /* px */,    ['2n + 1']],
];
const narrowColumnDensityBreakpoint = /* <= */ 9 /* px */; // hide elements like sprint borders on this condition

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
      lastItemEndIndex: firstDataRow,
      sections: [],
      entries: [],
      egSprintStart: '2024-01-01',
      egSprintIndex: 1,
      sprintLength: 14,
      rowHeight: 32,
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
    Split(['#split-top', '#source-panel'], {
        minSize: 0,
        direction: 'vertical',
        sizes: [70, 30],
        elementStyle: function (dimension, size, gutterSize) {
            return {
                'min-height': `calc(${size}vh - ${gutterSize}px - var(--scrollbar-width))`,
                'height': `calc(${size}vh - ${gutterSize}px - var(--scrollbar-width))`,
                'max-height': `calc(${size}vh - ${gutterSize}px - var(--scrollbar-width))`,
                'position': 'relative'
            };
        },
        onDragStart: function () {
            $('#split-top')[0].style.display = 'block';
        },
        onDragEnd: function () {
            $('#split-top')[0].style.display = 'none';
        }
    })

    function getSelectedColumnWidth() {
        return densitySliderValueToColumnWidth($('#density-range')[0].value);
    }
    function setSelectedColumnWidth(newValue) {
        $('#density-range')[0].value = columnWidthToDensitySliderValue(newValue);
    }

    function updateRowHeadersColumnWidth() {
        document.body.style.setProperty('--row-headers-column-width', `${$('#row-headers-bg').outerWidth()}px`);
    }
    new ResizeObserver(updateRowHeadersColumnWidth).observe($('#row-headers-bg')[0]);
    updateRowHeadersColumnWidth();

    function updateUrl(document) {
        const url = new URL(window.location)
        url.searchParams.set("data", stringToBase64(document));
        history.replaceState(null, '', url);
    }

    let editor;
    let vimModeEnabled;
    { // load state
        const savedDensity = localStorage.getItem('density');
        if (savedDensity !== null) {
            setSelectedColumnWidth(savedDensity);
        }
        vimModeEnabled = localStorage.getItem('vimModeEnabled') === 'true';
        $(document.body).toggleClass('vim-mode', vimModeEnabled);
        const savedRowHeight = localStorage.getItem('rowHeight');
        if (savedRowHeight !== null) {
            $('#row-height-range')[0].value = savedRowHeight;
        }
        const searchParam = new URL(window.location).searchParams.get('data');

        let src = '';
        if (searchParam !== null) {
            src = base64ToString(searchParam);
        } else {
            const savedData = localStorage.getItem('data');
            if (savedData !== null) {
                src = savedData;
                updateUrl(src);
            }
        }
        editor = editing.createEditor(src, $('#codemirror-host')[0], { enableVimMode: vimModeEnabled }, function() {
            const src = getSrc();
            updateUrl(src);
            localStorage.setItem('data', src);
            renderData();
        });
    }

    function getSrc() {
        return editor.state.doc.toString();
    }

    $('#vim-toggle-button').on('click', function() {
        vimModeEnabled = !vimModeEnabled;
        localStorage.setItem('vimModeEnabled', vimModeEnabled ? 'true' : 'false');
        editing.setVimModeEnabled(editor, vimModeEnabled);
        $(document.body).toggleClass('vim-mode', vimModeEnabled);
    });

    function measureScrollbarWidth() {
        const scrollDiv = $('#dummy-scrollbar-measurement-div')[0];
        const scrollbarWidth = scrollDiv.offsetHeight - scrollDiv.clientHeight;
        document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    }
    new ResizeObserver(measureScrollbarWidth).observe($('#dummy-scrollbar-measurement-div')[0]);
    measureScrollbarWidth();

    let gridScrollLeft = $('.grid')[0].scrollLeft;
    let lastGridScrollLeftSampleMs = +new Date();
    function updateDensityStyles() {
        const oldGridWidth = $('#dummy-full-width-grid-row').width();
        const columnWidth = getSelectedColumnWidth();

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
        $('#column-density-dynamic-styles').html(html);

        const pos = (gridScrollLeft + ($(window).width() / 2)) / oldGridWidth;
        const newGridWidth = $('#dummy-full-width-grid-row').width();
        gridScrollLeft = (pos * newGridWidth) - ($(window).width() / 2);
        $('.grid')[0].scrollLeft = gridScrollLeft;

        Alpine.store('grid').abbreviateSprints = columnWidth <= abbreviateSprintsBreakpoint;

        $(document.body).toggleClass('narrow-column-density', columnWidth <= narrowColumnDensityBreakpoint);
    }
    $('#density-range').on('input', function() {
        updateDensityStyles();
        localStorage.setItem('density', getSelectedColumnWidth());
    });
    updateDensityStyles();

    function updateRowHeight() {
        const rowHeight = $('#row-height-range')[0].value;
        Alpine.store('grid').rowHeight = rowHeight;
        document.body.style.setProperty('--row-height', `${rowHeight}px`);
    }
    $('#row-height-range').on('input', function() {
        updateRowHeight();
        localStorage.setItem('rowHeight', $('#row-height-range')[0].value);
    });
    updateRowHeight();

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
        const readTags = function(str) {
            return str.split(' ').filter(s => s.length > 0).flatMap(s => {
                let match = s.match(/^(.+)\*(\d+)$/);
                if (match) {
                    let count = Number(match[2]);
                    let tag = match[1];
                    return Array(Number(count)).fill(tag);
                }
                match = s.match(/^(\d+)\*(.+)$/);
                if (match) {
                    let count = Number(match[1]);
                    let tag = match[2];
                    return Array(count).fill(tag);
                }
                return [s];
            });
        };
        const store = Alpine.store('grid');

        let result;
        try {
          const obj = yaml.load(getSrc());
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
                    header: 'header' in objItem ? !!objItem.header : null,
                    includeTags: 'includeTags' in objItem ? readTags(String(objItem.includeTags)) : [],
                    defaults: 'defaults' in objItem ? { bg: String(objItem.defaults.bg) } : {},
                    height: 'height' in objItem ? Number(objItem.height) : null,
                    slots: 'slots' in objItem && Number(objItem.slots) >= 1 ? Number(objItem.slots) : null,
                    bg: 'bg' in objItem ? String(objItem.bg) : null,
                    compact: 'compact' in objItem ? !!objItem.compact : null,
                    index: row++
                };
                if (item.slots !== null) {
                    row += item.slots - 1;
                    item.endIndex = item.index + item.slots - 1;
                } else {
                    item.endIndex = item.index;
                }
                items.push(item);
            }
            sections.push({
                id: String(objSection.id),
                items: items
            });
          }

          const title = 'title' in obj ? String(obj.title) : null;

          let egSprintStart = null;
          let egSprintIndex = null;
          let sprintLength = null;
          if ('sprints' in obj) {
            egSprintStart = String(obj.sprints.egSprintStart);
            egSprintIndex = Number(obj.sprints.egSprintIndex);
            sprintLength = Number(obj.sprints.sprintLength);
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
                  tags: 'tags' in objEntry ? readTags(String(objEntry.tags)) : [],
                  text: String(objEntry.text)
                });
            }
          }

          calculateSlotOccupancy(store.fromYear, store.toYear, sections, entries);

          let lastItemEndIndex = updateItemIndicesToAccountForOverflowSlots(store.fromYear, store.toYear, sections);

          result = {
            sections: sections,
            entries: entries,
            lastItemEndIndex: lastItemEndIndex,
            title: title,
            egSprintStart: egSprintStart,
            egSprintIndex: egSprintIndex,
            sprintLength: sprintLength
          };
        } catch (err) {
          console.info('Error while processing input:', err);
          $('#codemirror-host').toggleClass('data-invalid', true);
          return;
        }
        $('#codemirror-host').toggleClass('data-invalid', false);

        if (result.egSprintStart !== null && result.egSprintIndex !== null && result.sprintLength !== null) {
            store.egSprintStart = result.egSprintStart;
            store.egSprintIndex = result.egSprintIndex;
            store.sprintLength = result.sprintLength;
        }
        // nb: order we set these is important; beware reactivity bugs
        store.entries = result.entries;
        store.sections = result.sections;
        store.lastItemEndIndex = result.lastItemEndIndex;

        if (result.title) {
            document.title = result.title;
        }
    }
    renderData();

    let animating = false;
    function scrollToToday() {
        if (animating) { return; }

        const animationDurationMs = 700;
        const todayOffset = $('#today-column-background').position().left + (getSelectedColumnWidth() / 2);

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
