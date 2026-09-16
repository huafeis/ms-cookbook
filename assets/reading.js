(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const chapters = new Map(window.BOOK_DATA.chapters.map(c => [c.id, c]));
  const storageKey = 'ms-cookbook.reading.v1';
  let preferences = {};
  try { preferences = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) preferences = {};
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {} }
  function showResume() {
    const saved = preferences.last;
    const chapter = chapters.get(saved?.chapter);
    $('#resumeReading').hidden = !chapter;
    if (!chapter) return;
    const heading = chapter.headings.find(h => h.id === saved.heading);
    $('#resumeReading').href = '#' + chapter.id + (heading ? '/' + heading.id : '');
    $('#resumeTitle').textContent = `第 ${chapter.number} 章 · ${chapter.title}`;
    $('#resumePosition').textContent = heading ? `接着读：${heading.text} →` : '从本章开头继续 →';
  }
  $('#homeTopics').innerHTML = window.BOOK_DATA.parts.map((part, index) => {
    const link = document.createElement('a');
    link.href = '#' + part.chapters[0];
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    link.append(number, document.createTextNode(part.shortTitle || part.title));
    return link.outerHTML;
  }).join('');
  $('#homeSearchForm').addEventListener('submit', event => {
    event.preventDefault();
    $('#chapterSearch').value = $('#homeSearch').value.trim();
    location.hash = 'contents';
    requestAnimationFrame(() => $('#chapterSearch').focus());
  });
  function search() { $('#readerSearchButton').click(); }
  document.querySelectorAll('[data-reader-search]').forEach(button => button.addEventListener('click', search));
  const size = [17, 19, 21].includes(Number(preferences.size)) ? Number(preferences.size) : 19;
  $('#readingSize').value = String(size);
  document.documentElement.style.setProperty('--reading-size', size + 'px');
  $('#readingSize').addEventListener('change', event => {
    preferences.size = Number(event.target.value);
    document.documentElement.style.setProperty('--reading-size', preferences.size + 'px');
    persist();
  });
  function setFocus(enabled) {
    document.body.dataset.focus = String(enabled);
    $('#focusReading').setAttribute('aria-pressed', String(enabled));
    $('#focusReading').textContent = enabled ? '退出专注' : '专注阅读';
  }
  setFocus(preferences.focus === true);
  $('#focusReading').addEventListener('click', () => {
    preferences.focus = document.body.dataset.focus !== 'true';
    setFocus(preferences.focus); persist();
  });
  function savePosition() {
    if (document.body.dataset.view !== 'reader') return;
    const chapter = chapters.get(location.hash.slice(1).split('?')[0].split('/')[0]);
    if (!chapter || chapter.status === 'pending') return;
    let heading = '';
    chapter.headings.forEach(item => {
      const el = document.getElementById(item.id);
      if (el && el.getBoundingClientRect().top <= window.innerHeight * .24) heading = item.id;
    });
    preferences.last = { chapter: chapter.id, heading };
    persist();
    const percent = Math.round(parseFloat($('#readingProgress').style.width) || 0);
    $('#readingPercent').textContent = percent + '%';
  }
  let timer;
  window.addEventListener('scroll', () => {
    clearTimeout(timer); timer = setTimeout(savePosition, 180);
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    clearTimeout(timer);
    showResume();
    requestAnimationFrame(savePosition);
  });
  window.addEventListener('pagehide', savePosition);
  showResume();
  requestAnimationFrame(savePosition);
})();
