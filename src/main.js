import { schemes, streetPlans, schemeForReference, streetChoices } from './scene.js'
import { references as referenceCatalog, profiles, referenceByNumber } from './architecture.js'
import { compositionNames, facadeNames, referenceRecipe, roofNames } from './reference-architecture.js'
import { referenceLayout } from './reference-layouts.js'
import { build, colors, editVariant, generationRequest, inventory, newArchitecturalModel, newOwnedModel, normalize,
  resolveGenerationOptions, styles, types } from './generator.js'
import {buildingTypes} from './building-types.js'
import { createViewer } from './viewer.js'
import { catalog, inventoryColor } from './catalog.js'
import availability from './availability.json' with {type:'json'}
import './style.css'
import './studio-layout.css'
import {download,exportLDraw,exportInventory} from './export.js'
import {compareStock,lookupSet,ownedStock,parseOwnedInventory,parseSetLink,tuneToStock} from './collection.js'
import {modelSnapshot,readProject,splitInstructions,statusNames} from './projects.js'
import {openSiteEditor} from './site-editor.js'
import {validateSitePlan} from './site-plan.js'
import {analyzePhoto} from './photo.js'
import {fitsRoomPlan} from './interiors.js'
import {buildingForm,buildingForms,facadeStyle,facadeStyles} from './architecture-options.js'
import {architectureDirection,architectureDirections} from './architecture-directions.js'

const paths = {
  cube: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v9"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  library: '<path d="M4 4h4v16H4zM10 4h4v16h-4zm6 1 3-1 4 15-3 1z"/>',
  sliders: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
  sparkle: '<path d="M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10Z"/>',
  building: '<path d="M3 21h18M5 21V7l7-4v18m0-12h7v12M8 9h1m-1 4h1m-1 4h1m6-4h1m-1 4h1"/>',
  ruler: '<path d="m3 16 13-13 5 5L8 21l-5-5Zm4-4 2 2m2-6 2 2m2-6 2 2"/>',
  rotate: '<path d="M3 12a9 9 0 1 1 3 7m-3-7V5m0 7h7"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4V4Zm16 0h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5V4Z"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H5l1-4a8 8 0 1 1 15-4Z"/><path d="M9 11h6"/>',
  send: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  dots: '<circle cx="5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="19" cy="12" r="1.1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 5-6m3-3c1-2 2-3 4-3h3m-4-4 4 4-4 4"/>',
}
const icon = (name, size = 18) => '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + paths[name] + '</svg>'
const select = values => Object.entries(values).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('')
function groupedOptions(catalog) {
  const groups=Object.groupBy(Object.entries(catalog),([,item])=>item.group)
  return Object.entries(groups).map(([name,entries])=>
    '<optgroup label="'+name+'">'+select(Object.fromEntries(entries.map(([id,item])=>[id,item.label])))+'</optgroup>'
  ).join('')
}
function floorLabel(plans,floor,short=false) {
  const atLevel=plans.filter(plan=>plan.floor===floor)
  if(atLevel.length&&atLevel.every(plan=>plan.attic)) return 'Чердак'
  const label=(floor+1)+'-й'+(short?'':' этаж')
  return atLevel.some(plan=>plan.attic)?label+' / чердак':label
}
const initial = { width: 24, depth: 24, floors: 2, type: 'bakery', style: 'old', mode: 'city', architecture: '' }

document.querySelector('#app').innerHTML = `
<header class="site-header">
  <div class="header-inner">
    <button class="brand" data-page="studio" aria-label="Кирпичик — студия"><span class="brand-icon">${icon('cube',22)}</span><span>кирпичик<span class="brand-dot">.</span></span></button>
    <nav aria-label="Разделы">
      <button data-page="studio" aria-current="page">${icon('grid',16)} Студия</button>
      <button data-page="references">${icon('image',16)} Референсы</button>
      <button data-page="library">${icon('library',16)} Библиотека</button>
    </nav>
    <span class="header-note"><a href="./ldraw/LICENSE.txt" target="_blank" rel="noopener">Геометрия LDraw</a></span>
  </div>
</header>
<main>
<section id="studio">
  <header class="studio-bar">
    <h1>Студия</h1>
    <div class="studio-tools" aria-label="Панели студии">
      <button id="show-settings" class="subtle" type="button" aria-controls="settings" aria-expanded="false">${icon('sliders',16)} Настройки</button>
      <button id="show-workshop" class="subtle" type="button" aria-controls="workshop" aria-expanded="false">${icon('chat',16)} Мастерская</button>
    </div>
    <div class="studio-actions">
      <details class="studio-menu" id="studio-menu">
        <summary aria-label="Другие действия" title="Другие действия">${icon('dots',19)}</summary>
        <div class="studio-menu-items">
          <button type="button" id="new-unlocked" hidden>Новый проект</button>
          <button type="button" id="compare-options">Сравнить 3 варианта</button>
          <button type="button" id="shuffle">Вариация этой постройки</button>
          <button type="button" id="different-architecture">Другая архитектура</button>
          <button type="button" id="open-lot">Редактор участка</button>
          <button type="button" id="open-photo">По фото</button>
        </div>
      </details>
      <button class="primary" id="generate-model" type="submit" form="generate-form">${icon('sparkle',17)} Сгенерировать</button>
    </div>
  </header>
  <div class="workspace" id="workspace">
    <div class="inspector card" id="inspector">
    <aside class="settings" id="settings" aria-label="Настройки генерации" hidden>
      <div class="panel-heading"><h2>Настройки</h2><button class="bare" type="button" data-close-panel aria-label="Закрыть настройки">${icon('close',17)}</button></div>
      <div class="settings-tabs" role="tablist" aria-label="Категории настроек">
        <button id="settings-build-tab" type="button" role="tab" data-settings-tab="build" aria-controls="settings-build" aria-selected="true">Постройка</button>
        <button id="settings-style-tab" type="button" role="tab" data-settings-tab="style" aria-controls="settings-style" aria-selected="false" tabindex="-1">Стиль</button>
        <button id="settings-parts-tab" type="button" role="tab" data-settings-tab="parts" aria-controls="settings-parts" aria-selected="false" tabindex="-1">Детали</button>
      </div>
      <form id="generate-form">
        <div class="settings-fields" id="settings-build" role="tabpanel" aria-labelledby="settings-build-tab">
        <label class="field">Пресет<select id="project-preset"><option value="">Свои настройки</option><option value="auto">Автоматически</option><option value="quick">Быстрая сборка</option><option value="detail">Детальный дом</option><option value="street">Улица</option></select></label>
        <fieldset class="mode-group"><legend>Режим</legend><div class="segments">
          <label><input type="radio" name="mode" value="auto">${icon('sparkle',16)} Автоматически</label>
          <label><input type="radio" name="mode" value="city" checked>${icon('building',16)} Участок</label>
          <label><input type="radio" name="mode" value="solo">${icon('cube',16)} Дом</label>
          <label><input type="radio" name="mode" value="street">${icon('grid',16)} Улица</label>
        </div></fieldset>
        <fieldset class="lot-dimensions"><legend>${icon('ruler',16)} Размер участка <small>в пинах</small></legend><div class="dimensions">
          <label>Ширина <input type="number" name="width" min="12" max="48" value="24" placeholder="Автоматически"></label>
          <span>×</span>
          <label>Длина <input type="number" name="depth" min="12" max="48" value="24" placeholder="Автоматически"></label>
        </div><small class="field-hint">Пустое поле — автоматически.</small></fieldset>
        <label class="field">${icon('building',16)} Тип постройки<select name="type"><option value="auto">Автоматически</option>${groupedOptions(buildingTypes)}</select></label>
        <label class="field">Этажность<select name="floors"><option value="auto">Автоматически</option><option value="1">1 этаж</option><option value="2" selected>2 этажа</option><option value="3">3 этажа</option><option value="4">4 этажа</option><option value="5">5 этажей</option></select></label>
        </div>
        <div class="settings-fields" id="settings-style" role="tabpanel" aria-labelledby="settings-style-tab" hidden>
        <input type="hidden" name="style" value="old">
        <label class="field">${icon('layers',16)} Архитектурное направление<select name="direction"><option value="auto">Автоматически</option>
          <optgroup label="Общие направления">${select(styles)}</optgroup>${groupedOptions(architectureDirections)}</select></label>
        <label class="field">Стиль фасада<select name="facadeStyle"><option value="">Автоматически</option>${groupedOptions(facadeStyles)}</select></label>
        <label class="field">Форма постройки<select name="buildingForm"><option value="">Автоматически</option>${groupedOptions(buildingForms)}</select></label>
        <label class="field">Покрытие пола<select name="flooring"><option value="auto">Автоматически</option><option value="studs">Открытые шипы</option><option value="mixed">Плитка и шипы</option><option value="tiled">Плитка</option></select></label><label class="field" id="architecture-field">Архитектура<select name="architecture"><option value="">Автоматически</option></select></label><label class="field" id="street-layout-field" hidden>План улицы<select name="streetLayout"><option value="">Автоматически</option>${select(streetPlans)}</select></label>
        </div>
        <div class="settings-fields" id="settings-parts" role="tabpanel" aria-labelledby="settings-parts-tab" hidden>
          <label class="field">Лимит деталей<input type="number" name="partLimit" min="200" max="15000" placeholder="Автоматически"></label>
          <label class="field">Учитывать мои детали<select id="from-stock"><option value="auto">Автоматически</option><option value="off">Нет</option><option value="on">Да</option></select></label>
          <label class="field" id="stock-priority-field" hidden>Приоритет коллекции
            <select id="stock-priority"><option value="auto">Автоматически</option><option value="strict">Только мои детали</option><option value="size">Сохранить размер участка</option></select>
            <small class="field-hint" id="stock-priority-hint"></small>
          </label>
        </div>
      </form>
      <div class="settings-status">
        <p class="hint" id="design-extras" hidden></p>
        <button class="subtle" type="button" id="clear-reference" hidden>Сбросить референс</button>
        <p class="hint" id="history-info"></p>
      </div>
    </aside>
    <aside class="chat" id="workshop" aria-label="Мастерская" hidden>
      <div class="panel-heading"><h2>Мастерская</h2><button class="bare" type="button" data-close-panel aria-label="Закрыть мастерскую">${icon('close',17)}</button></div>
      <div class="workshop-options">
      <label class="field" id="edit-house-field" hidden>Дом для правки<select id="edit-house"></select></label>
      <label class="field">Часть постройки<select id="region"><option value="facade">Фасад</option><option value="interior">Интерьер</option><option value="roof">Крыша</option></select></label>
      <label class="field" id="edit-floor-field" hidden>Этаж для правки<select id="edit-floor"></select></label>
      </div>
      <details class="workshop-locks" id="lock-actions">
        <summary>Управление модулями</summary>
        <div class="feature-actions">
          <button id="lock-region" class="subtle" type="button" aria-pressed="false">Закрепить часть</button>
          <button id="lock-building" class="subtle" type="button" aria-pressed="false">Закрепить дом</button>
          <button id="revise-building" class="subtle" type="button">Пересобрать дом</button>
          <button id="save-module" class="subtle" type="button">Сохранить модуль</button>
        </div>
      </details>
      <p id="lock-summary" class="muted" hidden></p>
      <div id="messages" class="messages" aria-live="polite"></div>
      <div id="edit-preview" class="edit-preview" hidden><p id="edit-delta"></p><div class="feature-actions"><button id="apply-edit" class="primary">Применить</button><button id="discard-edit" class="subtle">Отмена</button></div></div>
      <div class="chat-tools">
        <button type="button" id="undo" class="subtle" hidden>${icon('rotate',14)} Отменить</button>
        <button type="button" id="suggestion" class="suggestion"></button>
      </div>
      <form id="chat-form">
        <label class="sr" for="message">Что изменить</label><input id="message" maxlength="180" placeholder="Что изменить?" required>
        <button type="submit" aria-label="Отправить правку">${icon('send',19)}</button>
      </form>
    </aside>
    <aside id="interior-details" class="interior-details" aria-label="Что внутри" hidden>
      <div class="panel-heading"><h2>Что внутри</h2><button class="bare" type="button" data-close-panel aria-label="Закрыть интерьер">${icon('close',17)}</button></div>
      <ul id="interior-list"></ul>
    </aside>
    <aside id="instruction-panel" class="instruction-panel" aria-label="Инструкция сборки" hidden>
      <div class="instruction-title"><div><div class="mini" id="step-counter"></div><h3 id="step-title"></h3></div><button id="close-instructions" class="bare" aria-label="Закрыть инструкцию">${icon('close',18)}</button></div>
      <div class="instruction-selects">
        <label class="sr" for="stage-select">Перейти к узлу</label><select id="stage-select" class="step-select" aria-label="Перейти к узлу"></select>
        <label class="sr" for="step-select">Перейти к шагу</label><select id="step-select" class="step-select" aria-label="Перейти к шагу"></select>
      </div>
      <div class="step-progress"><div id="step-progress"></div></div><p id="step-repeat" class="muted" hidden></p><p id="step-parts"></p><div id="step-part-cards" class="step-part-cards"></div><div id="step-parts-pager" class="pager" hidden></div>
      <div class="instruction-actions"><button class="subtle" id="step-prev">Назад</button><button class="dark" id="step-next">Дальше</button></div>
    </aside>
    </div>
    <article class="preview card" aria-label="Просмотр постройки">
      <header class="preview-title">
        <div class="model-heading"><h2 id="model-title"></h2><p id="model-meta"></p><p id="model-techniques" hidden></p><a id="model-reference" target="_blank" rel="noopener" hidden></a></div>
        <span class="pill" id="model-parts"></span>
      </header>
      <div class="viewer-tools">
        <div class="view-controls" aria-label="Вид модели">
          <button type="button" data-view="all" aria-pressed="true">3D</button>
          <button type="button" data-view="plan" aria-pressed="false">План</button>
          <button type="button" data-view="ground" aria-pressed="false">1-й этаж</button>
          <button type="button" data-view="upper" aria-pressed="false">Этажи</button>
          <button type="button" data-view="exploded" aria-pressed="false">По модулям</button>
        </div>
        <button type="button" id="reset-camera" class="reset" aria-label="Сбросить камеру" title="Сбросить камеру">${icon('rotate',18)}</button>
      </div>
      <div id="viewer">
        <p id="viewer-error" hidden></p>
        <div id="loading" class="viewer-loading">Загружаем геометрию деталей…</div>
        <div class="viewport-controls">
          <div class="floor-fields"><label id="house-field" class="house-field" hidden>Дом <select id="house-view"></select></label><label id="floor-field" class="house-field" hidden>Этаж <select id="floor-view"></select></label></div>
          <div id="interior-toolbar" class="interior-toolbar" hidden><button id="cutaway" type="button" aria-pressed="true">Разрез</button><button id="show-interior" type="button" aria-controls="interior-details" aria-expanded="false">Что внутри</button></div>
        </div>
        <p class="generation-notice" id="generation-feedback" role="status" hidden></p>
      </div>
      <footer class="preview-footer">
        <p id="model-work"></p>
        <div class="model-actions">
          <button id="save-project" class="subtle">Сохранить</button>
          <button id="open-parts" class="subtle">${icon('layers',16)} Детали</button>
          <button id="download-model" class="subtle" title="Скачать LDraw-модель для Studio или LeoCAD">.ldr</button>
          <button id="open-instructions" class="dark">${icon('book',16)} Сборка</button>
        </div>
      </footer>
    </article>
  </div>
</section>
<section id="references" class="catalog-page" hidden>
  <header class="catalog-heading"><h1>Референсы</h1><p id="reference-count" class="reference-count" aria-live="polite"></p></header>
  <div class="filters reference-filters">
    <label><span class="sr">Поиск набора</span><input id="filter-query" type="search" placeholder="Название или номер набора"></label>
    <label><span class="sr">Линейка</span><select id="filter-series"><option value="">Все линейки</option><option>Ideas</option><option>City</option><option>Harry Potter</option></select></label>
    <label><span class="sr">Архитектурный приём</span><select id="filter-profile"><option value="">Все приёмы</option></select></label>
  </div>
  <div id="reference-list" class="gallery"></div>
  <div id="reference-pager" class="pager" hidden></div>
</section>
<section id="library" class="catalog-page" hidden>
  <header class="catalog-heading"><h1>Библиотека</h1></header>
  <div class="library-tabs feature-actions" aria-label="Раздел библиотеки">
    <button class="subtle" data-library="projects" aria-pressed="true">Проекты</button>
    <button class="subtle" data-library="sets" aria-pressed="false">Мои наборы</button>
    <button class="subtle" data-library="modules" aria-pressed="false">Модули</button>
  </div>
  <div id="library-project-controls" class="feature-actions">
    <button id="import-project" class="subtle">Импорт проекта</button><input type="file" id="project-file" accept=".json,application/json" hidden>
  </div>
  <div id="library-set-controls" hidden>
    <div class="feature-actions"><button id="open-owned-set" class="primary">Добавить набор</button><button id="build-from-owned" class="dark">Собрать из коллекции</button><button id="check-owned" class="subtle">Сравнить с проектом</button><button id="add-loose-parts" class="subtle">Детали CSV</button><input id="loose-parts-file" type="file" accept=".csv,text/csv" hidden></div>
  </div>
  <div id="library-list" class="gallery"></div>
  <div id="library-pager" class="pager" hidden></div>
</section>
</main>
<dialog id="owned-set-dialog" aria-labelledby="owned-set-heading"><div class="dialog-title"><h2 id="owned-set-heading">Добавить набор</h2><form method="dialog"><button class="bare" aria-label="Закрыть">${icon('close')}</button></form></div>
    <form id="owned-set-form" class="collection-form">
      <label class="field">Ссылка LEGO или номер набора<input name="link" required placeholder="https://www.lego.com/… или 21325"></label>
      <label class="field">Количество<input name="quantity" type="number" min="1" max="999" value="1" required></label>
      <label class="field">Свой состав CSV <input name="inventory" type="file" accept=".csv,text/csv"></label>
      <button class="primary" type="submit">Добавить набор</button>
      <p id="owned-status" role="status" class="muted"></p>
    </form>
</dialog>
<dialog id="parts-dialog"><div class="dialog-title"><div><h2>Детали</h2><p id="parts-summary"></p></div><form method="dialog"><button class="bare" aria-label="Закрыть">${icon('close')}</button></form></div><div class="parts-actions"><button id="model-inventory" class="subtle" aria-pressed="true">В модели</button><button id="shape-catalog" class="subtle" aria-pressed="false">Каталог форм</button><button id="owned-comparison" class="subtle" aria-pressed="false">Из моей коллекции</button><button id="download-parts" class="subtle">Скачать список CSV</button><button id="download-shortage" class="subtle" hidden>Скачать недостающее</button></div><div id="parts-list"></div><div id="parts-pager" class="pager" hidden></div></dialog>
<dialog id="feature-dialog" class="feature-dialog"></dialog>
<div id="status" class="toast" role="status" hidden></div>`

const $ = id => document.getElementById(id)
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}
let histories = read('brick-history-v1', {})
const oldLibrary=read('brick-library-v1',[]).map(item=>({...item,name:types[item.options.type]??'Постройка',status:'built',nextPart:0,locks:{}}))
let library=read('brick-projects-v2',oldLibrary)
let owned=read('brick-owned-v1',[])
let savedModules=read('brick-modules-v1',[])
let model, previous = [], view = 'all', houseView='', floorView=1, cutaway = true, step = null, toastTimer
let activeProject='',locks={},libraryTab='projects',instructions=[],pending=null,settingsExtras={}
const form = $('generate-form')
const stockSettings=read('brick-stock-settings-v1',{})
$('from-stock').value=stockSettings.mode??(stockSettings.enabled===true?'on':'off')
$('stock-priority').value=['auto','size','strict'].includes(stockSettings.priority)?stockSettings.priority:'auto'
function usesCollection() {
  const mode=$('from-stock').value
  return mode==='on'||mode==='auto'&&owned.length>0
}
function updateStockFields() {
  $('stock-priority-field').hidden=!usesCollection()
  const priority=$('stock-priority').value
  $('stock-priority-hint').textContent=priority==='strict'
    ?'Размер, архитектура и палитра зависят от вашей коллекции. При малом запасе можно получить компактную сцену.'
    :priority==='size'?'Сохраняем план участка и показываем, каких деталей не хватает.'
    :'Сначала подбираем модель из вашей коллекции. Если подходящей сборки нет, покажем недостающие детали.'
}
function saveStockSettings() {
  updateStockFields()
  save('brick-stock-settings-v1',{mode:$('from-stock').value,priority:$('stock-priority').value})
}
$('from-stock').onchange=$('stock-priority').onchange=saveStockSettings
updateStockFields()
for(const [key,label] of Object.entries(schemes)) form.elements.architecture.append(new Option(label,key))
for (const [id,profile] of Object.entries(profiles)) $('filter-profile').append(new Option(profile.label,id))
const viewer = createViewer($('viewer'), message => {
  $('viewer-error').textContent = message
  $('viewer-error').hidden = false
},pickPart)
viewer.ready.then(() => { $('loading').hidden=true }).catch(() => { $('loading').hidden=true })
const suggestions = { facade: 'Перенеси вход', interior: 'Переставь прилавок', roof: 'Смени крышу' }

function toast(message) {
  clearTimeout(toastTimer)
  $('status').textContent = message
  $('status').hidden = false
  toastTimer = setTimeout(() => { $('status').hidden = true }, 3600)
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch { toast('Память браузера недоступна. Изменения сохранены до закрытия страницы.') }
}
function formValues() {
  const values=Object.fromEntries(new FormData(form))
  for(const name of ['width','depth']) if(values[name]==='') values[name]='auto'
  return generationRequest({...settingsExtras,...values})
}
function setForm(options) {
  const {sitePlan,photoPalette,photoRoof,photoRhythm,reference}=options
  settingsExtras={sitePlan,photoPalette,photoRoof,photoRhythm,reference}
  form.elements.flooring.value=options.flooring??'auto'
  form.elements.direction.value=options.direction??options.style??'old'
  form.elements.architecture.value=options.architecture??''
  form.elements.facadeStyle.value=options.facadeStyle??''
  form.elements.buildingForm.value=options.buildingForm??''
  form.elements.partLimit.value=options.partLimit??''
  for (const [key, value] of Object.entries(options)) {
    const field=form.elements.namedItem(key)
    if(field) field.value=field.type==='number'&&value==='auto'?'':value
  }
  const preset=$('project-preset')
  const allAutomatic=['width','depth','mode','type','floors','direction'].every(name=>options[name]==='auto')&&
    !options.architecture&&!options.buildingForm&&!options.facadeStyle&&!options.streetLayout&&!options.partLimit&&options.flooring==='auto'
  if(allAutomatic||preset.value==='auto') preset.value=allAutomatic?'auto':''
  updateModeFields()
}
function updateModeFields() {
  const streetMode=form.elements.mode.value==='street'
  const autoMode=form.elements.mode.value==='auto'
  const street=streetMode||form.elements.architecture.value==='street'
  const shape=buildingForm(form.elements.buildingForm.value)
  $('architecture-field').hidden=streetMode||Boolean(shape)
  $('street-layout-field').hidden=Boolean(shape)||!street&&!(autoMode&&!form.elements.architecture.value)
  const possible=streetChoices({width:Number(form.elements.width.value)||48,depth:Number(form.elements.depth.value)||48})
  if(settingsExtras.sitePlan) possible.push('custom')
  for(const option of form.elements.streetLayout.options) option.disabled=!!option.value&&!possible.includes(option.value)
  if(form.elements.streetLayout.selectedOptions[0]?.disabled) form.elements.streetLayout.value=''
  const reference=referenceByNumber.get(settingsExtras.reference)
  const extras=[reference?'Референс · '+reference.title:null,settingsExtras.sitePlan?'Свой план':null,
    settingsExtras.photoRoof?'Подсказки по фото':null].filter(Boolean)
  $('design-extras').hidden=!extras.length
  $('design-extras').textContent=extras.join(' · ')
  $('clear-reference').hidden=!reference
}
$('clear-reference').onclick=()=>{
  settingsExtras.reference=''
  updateModeFields()
}
function historyKey(options) {
  const base=[options.width,options.depth,options.type,options.style,options.mode,options.floors??1,options.flooring??'auto',options.reference??'']
  if(options.direction) base.push(options.direction)
  if(options.buildingForm||options.facadeStyle) base.push(options.buildingForm??'',options.facadeStyle??'')
  if(options.sitePlan||options.photoRoof||options.partLimit) base.push(JSON.stringify([options.sitePlan,options.photoRoof,options.photoPalette,options.photoRhythm,options.partLimit]))
  return base.join('/')
}
function rememberVariant(key,variant) {
  const plan=variant.design.blueprint
  let item=variant
  if(plan) {
    const {key,fingerprint,layout,outline,phase,band}=plan
    item={version:variant.version,signature:variant.signature,silhouette:variant.silhouette,
      stockOnly:variant.stockOnly,design:{palette:variant.design.palette,blueprint:{key,fingerprint,layout,outline,phase,band}}}
  } else if(variant.stockOnly) item={version:variant.version,signature:variant.signature,stockOnly:true,
    stockFamily:variant.stockFamily,stockOutline:variant.stockOutline}
  histories[key]=[...(histories[key]??[]),item].slice(-160)
  save('brick-history-v1',histories)
}
function showPage(name) {
  for (const id of ['studio','references','library']) $(id).hidden = name !== id
  for (const button of document.querySelectorAll('nav [data-page]')) {
    if (button.dataset.page === name) button.setAttribute('aria-current', 'page')
    else button.removeAttribute('aria-current')
  }
  if (name === 'references') references()
  if (name === 'library') showLibrary()
}

const wideStudio=matchMedia('(min-width: 850px)')
const compactStudio=matchMedia('(max-width: 619px)')
let studioPanel=wideStudio.matches?'settings':''
let panelBeforeInstruction=''
let referencePage=0, libraryPage=0, stepPartPage=0, lastPartsStep
const studioPanels={settings:'settings',workshop:'workshop',interior:'interior-details',instructions:'instruction-panel'}
const panelTriggers={settings:'show-settings',workshop:'show-workshop',interior:'show-interior'}

function showStudioPanel(panel) {
  studioPanel=panel
  $('workspace').dataset.panel=panel
  $('inspector').hidden=!panel
  document.querySelector('#studio .preview').inert=compactStudio.matches&&Boolean(panel)&&panel!=='instructions'
  for(const [key,id] of Object.entries(studioPanels)) $(id).hidden=key!==panel
  for(const [key,id] of Object.entries(panelTriggers)) $(id).setAttribute('aria-expanded',String(key===panel))
}
compactStudio.addEventListener('change',()=>showStudioPanel(studioPanel))

function selectSettingsTab(next) {
  for(const button of document.querySelectorAll('[data-settings-tab]')) {
    const active=button.dataset.settingsTab===next
    button.tabIndex=active?0:-1
    button.setAttribute('aria-selected',String(active))
    $(button.getAttribute('aria-controls')).hidden=!active
  }
}

for(const button of document.querySelectorAll('[data-settings-tab]')) {
  button.onclick=()=>selectSettingsTab(button.dataset.settingsTab)
  button.onkeydown=event=>{
    const tabs=[...document.querySelectorAll('[data-settings-tab]')]
    const from=tabs.indexOf(button)
    const index={ArrowLeft:(from+tabs.length-1)%tabs.length,ArrowRight:(from+1)%tabs.length,Home:0,End:tabs.length-1}[event.key]
    if(index===undefined) return
    event.preventDefault()
    selectSettingsTab(tabs[index].dataset.settingsTab)
    tabs[index].focus()
  }
}

for(const [key,id] of Object.entries(panelTriggers)) $(id).onclick=()=>showStudioPanel(studioPanel===key?'':key)
for(const button of document.querySelectorAll('[data-close-panel]')) button.onclick=()=>{
  const trigger=panelTriggers[studioPanel]
  showStudioPanel('')
  if(trigger) $(trigger).focus()
}
const studioMenu=$('studio-menu')
studioMenu.addEventListener('click',event=>{if(event.target.closest('button')) studioMenu.open=false})
document.addEventListener('pointerdown',event=>{if(studioMenu.open&&!studioMenu.contains(event.target)) studioMenu.open=false})
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||document.querySelector('dialog[open]')||$('studio').hidden) return
  if(studioMenu.open) {studioMenu.open=false;studioMenu.querySelector('summary').focus();return}
  if(studioPanel==='instructions') $('close-instructions').click()
  else if(studioPanel) $(studioPanels[studioPanel]).querySelector('[data-close-panel]')?.click()
})

function pager(id,page,count,change) {
  const panel=$(id)
  panel.hidden=count<=1
  if(panel.hidden) return
  if(!panel.childElementCount) {
    const label=document.createElement('span')
    label.setAttribute('aria-live','polite')
    panel.append(action('Назад',()=>{}),label,action('Дальше',()=>{}))
  }
  const [previous,label,next]=panel.children
  label.textContent=(page+1)+' / '+count
  previous.disabled=page===0
  next.disabled=page>=count-1
  previous.onclick=()=>change(page-1)
  next.onclick=()=>change(page+1)
}

function galleryPage(id,items,render) {
  const reference=id==='reference'
  const size=innerWidth>=1440?4:innerWidth>=1000?3:innerWidth>=620?2:1
  const count=Math.ceil(items.length/size)
  const page=Math.max(0,Math.min(reference?referencePage:libraryPage,count-1))
  if(reference) referencePage=page
  else libraryPage=page
  const start=page*size
  $(id+'-list').replaceChildren(...items.slice(start,start+size).map(render))
  pager(id+'-pager',page,count,next=>{
    if(reference) {referencePage=next;references()}
    else {libraryPage=next;showLibrary()}
  })
  return {start,end:Math.min(items.length,start+size)}
}
function message(text, user = false) {
  const item = document.createElement('p')
  item.className = user ? 'user-message' : 'assistant-message'
  item.textContent = text
  $('messages').append(item)
  $('messages').scrollTop = $('messages').scrollHeight
}
function sync() {
  const { options, parts } = model
  const street=model.scheme==='street'
  const architecture=model.scheme?schemes[model.scheme]:''
  $('model-title').textContent=model.blueprint||model.ownedFootprint||model.form||model.referenceLayout||model.variant.design.massing?model.title:
    street?streetPlans[model.streetPlan]:architecture||types[options.type]
  const dimensions=(model.ownedFootprint??[options.width,options.depth]).join(' × ')+' пинов'
  const floorCount=model.houses?.[0]?.floors??options.floors??1
  const houseCount=model.houses?.length??1
  const composition=street?houseCount+(houseCount===1?' дом':houseCount<5?' дома':' домов')
    :floorCount+(floorCount===1?' этаж':floorCount===5?' этажей':' этажа')
  const attics=model.houses?.filter(house=>house.attic).length??0
  $('model-meta').textContent=[model.ownedFootprint?'Размер модели':street?'Участок улицы':types[options.type],
    model.ownedFootprint?null:model.direction?.label??model.finish?.label??styles[options.style],
    dimensions,model.stockFamily?null:composition,attics?attics===1?'Чердак':'Чердаки: '+attics:null].filter(Boolean).join(' · ')
  const modelReference=$('model-reference')
  modelReference.hidden=!model.reference||Boolean(model.direction&&!options.reference)
  if(model.reference) {
    modelReference.textContent=model.reference.series+' · '+model.reference.title+' '+model.reference.number
    modelReference.href='https://rebrickable.com/sets/'+model.reference.id+'/'
  }
  const built=(house)=>[house.shape==='chamfer'?'Стены со скосами':facadeNames[house.recipe?.facade],roofNames[house.roof]].filter(Boolean)
  const techniques=[...new Set([model.direction&&model.finish?.label,...(model.houses??[]).flatMap(built)].filter(Boolean))]
  if(model.parts.some(part=>part.role==='roof'&&part.id==='22385')) techniques.push('Пятиугольная черепица')
  if(model.skybridge) techniques.push('Остеклённый переход')
  if(model.houses?.some(house=>house.cabin)) techniques.push('Скаты 65°', 'Деревянное крыльцо')
  if(model.referenceFit&&!model.referenceFit.wing) techniques.push('Крыло помещается на более широком участке')
  if(model.referenceFit&&model.referenceFit.floors<options.floors) techniques.push('Этажность уменьшена под участок')
  if(model.referenceFit&&!model.referenceFit.bridge) techniques.push('Для перехода нужен более просторный участок')
  $('model-techniques').hidden=!techniques.length
  $('model-techniques').textContent=techniques.join(' · ')
  for(const id of ['model-title','model-meta','model-techniques']) $(id).title=$(id).textContent
  $('model-work').textContent=instructions.length+' шагов'+(owned.length?' · '+stockSummary(model):'')
  const request=model.variant.request??(model.ownedFootprint?formValues():options)
  $('history-info').textContent = 'Вариантов для этих настроек: ' + (histories[historyKey(request)]?.length ?? 0)
  updateStockFields()
  $('undo').hidden = previous.length === 0
  showStudioPanel(step!==null?'instructions':studioPanel)
  $('show-settings').disabled=$('show-workshop').disabled=$('generate-model').disabled=step!==null
  studioMenu.hidden=step!==null
  $('open-instructions').hidden = step !== null
  const project=library.find(item=>item.id===activeProject)
  $('open-instructions').innerHTML=icon('book',16)+(project?.status==='building'?' Продолжить':' Сборка')
  $('edit-preview').hidden=!pending
  const housePlans=model.interiors?.filter(plan=>!houseView||!street||plan.building===houseView)??[]
  const upperFloors=[...new Set(housePlans.filter(plan=>plan.floor>0).map(plan=>plan.floor))].sort((a,b)=>a-b)
  if(view==='upper'&&!upperFloors.length) view='ground'
  const floorChoices=view==='plan'?[0,...upperFloors]:upperFloors
  if(!floorChoices.includes(floorView)) floorView=floorChoices[0]??1
  for (const button of document.querySelectorAll('[data-view]')) {
    button.disabled = step !== null || (button.dataset.view==='upper' && !upperFloors.length)
    button.setAttribute('aria-pressed', String(button.dataset.view === view))
  }
  if (step !== null) {
    const { title,start,section,repeatFrom,repeatCount } = instructions[step]
    const parts = model.parts.slice(start, instructions[step + 1]?.start ?? model.parts.length)
    const stages=instructions.flatMap((s,i)=>i===0||s.section!==instructions[i-1].section||s.module!==instructions[i-1].module
      ? [{name:s.section||s.title,index:i}]:[])
    $('stage-select').replaceChildren(...stages.map(stage=>new Option(stage.name,stage.index)))
    $('stage-select').value=stages.findLast(stage=>stage.index<=step).index
    $('step-repeat').hidden=!repeatFrom&&!repeatCount
    $('step-repeat').textContent=repeatFrom?'Повтор схемы шага '+repeatFrom+' на новом месте.'
      :repeatCount?'Эта раскладка повторяется '+repeatCount+' раза.':''
    $('step-select').replaceChildren(...instructions.map((s,i)=>new Option((i+1)+'. '+(s.section?s.section+' · ':'')+s.title,i)))
    $('step-select').value=step
    $('step-counter').textContent = 'Шаг ' + (step + 1) + ' из ' + instructions.length + (section?' · '+section:'')
    $('step-title').textContent = title
    $('step-progress').style.width=((step+1)/instructions.length*100)+'%'
    if(lastPartsStep!==step) {lastPartsStep=step;stepPartPage=0}
    renderStepParts(inventory(parts))
    $('step-prev').disabled = step === 0
    $('step-next').textContent = step === instructions.length - 1 ? 'Собрано ✓' : 'Дальше'
  }
  const inspecting=step===null&&['ground','upper','plan'].includes(view)
  $('house-field').hidden=!inspecting||!street
  $('floor-field').hidden=!inspecting||view==='ground'||(view==='plan'&&floorChoices.length===1)
  $('floor-view').replaceChildren(...floorChoices.map(floor=>new Option(floorLabel(housePlans,floor,true),floor)))
  $('floor-view').value=String(floorView)
  viewer.show(pending?.model??(step!==null?{...model,steps:instructions}:model),
    { view, step,cutaway,house:inspecting?houseView:'',floor:floorView })
  const plans=housePlans.filter(p=>p.floor===(view==='ground'?0:floorView))
  const objects=plans.flatMap(plan=>plan.objects)
  const plan=plans.length>0
  $('interior-toolbar').hidden=!inspecting||!plan
  if(studioPanel==='interior'&&(!inspecting||!plan)) showStudioPanel(wideStudio.matches?'settings':'')
  $('cutaway').hidden=view==='plan'||plans.every(plan=>plan.attic)
  $('cutaway').setAttribute('aria-pressed',String(cutaway))
  if(plan) {
    const level=view==='ground'?0:floorView
    const stairs=(model.houses??[]).filter(house=>!houseView||house.id===houseView)
      .flatMap(house=>[...(house.stairs??[]),...(house.attic?[house.attic.stair]:[])]
        .filter(stair=>stair.floor===level||stair.floor+1===level))
      .map(stair=>stair.name+' · '+(stair.floor===level?'вверх':'вниз'))
    const roomNames=[...new Set(plans.flatMap(plan=>plan.rooms??[]))]
    $('interior-list').replaceChildren(...[...roomNames,...stairs,...objects.map(object=>object.name)].map(name=>{
      const item=document.createElement('li')
      item.textContent=name
      return item
    }))
  }
  $('model-parts').textContent = parts.length + ' деталей'
  save('brick-current-v2',{options:model.options,variant:model.variant,activeProject,locks,
    requested:model.variant.request??(model.ownedFootprint?formValues():undefined)})
  syncLocks()
}
function renderStepParts(items) {
  const size=innerHeight<560||innerWidth<740?2:4
  const count=Math.ceil(items.length/size)
  stepPartPage=Math.max(0,Math.min(stepPartPage,count-1))
  $('step-parts').hidden=items.length>0
  $('step-parts').textContent='Совместите крышу с верхним рядом стен.'
  $('step-part-cards').hidden=!items.length
  $('step-part-cards').innerHTML=items.slice(stepPartPage*size,(stepPartPage+1)*size).map(p=>
    '<div class="step-part"><img src="'+import.meta.env.BASE_URL+'part-images/'+p.id+'.webp" alt=""><span class="swatch" style="background:#'+colors[p.color][1].toString(16).padStart(6,'0')+'"></span><span>'+p.label+'<small>'+p.id+'</small></span><b>× '+p.count+'</b></div>').join('')
  pager('step-parts-pager',stepPartPage,count,next=>{stepPartPage=next;renderStepParts(items)})
}

function openModel(next,project) {
  model = next
  activeProject=project?.id??''
  locks={...project?.locks}
  instructions=splitInstructions(model.steps,model.parts.length,16,model.parts)
  pending=null
  previous = []
  step = null
  lastPartsStep=undefined
  if(studioPanel==='instructions'||studioPanel==='interior') showStudioPanel(wideStudio.matches?'settings':'')
  view = 'all'
  houseView=''
  floorView=1
  const houseOptions=()=> (model.houses??[]).map(house=>new Option(house.label+' · '+types[house.type],house.id))
  $('house-view').replaceChildren(new Option('Все дома',''),...houseOptions())
  $('edit-house').replaceChildren(new Option('Выберите дом',''),...houseOptions())
  $('edit-floor').replaceChildren()
  $('messages').replaceChildren()
  $('region').value = 'facade'
  updateSuggestion()
  message('Выберите часть постройки и опишите, что в ней изменить.')
  sync()
  viewer.reset('all')
}
function generate(options,intent='generate') {
  setForm(options)
  const key = historyKey(options)
  const history = histories[key] ?? []
  const feedback=$('generation-feedback')
  feedback.hidden=true
  try {
    const next=generateCandidate(options,history,intent)
    const variant=next.variant
    const settings={...next.options}
    if(intent!=='generate'&&!variant.stockOnly&&variant.version!==9) {
      if(settings.architecture) settings.architecture=variant.design.scheme
      if(settings.streetLayout) settings.streetLayout=variant.design.streetPlan
    }
    rememberVariant(key,variant)
    setForm(variant.request??(next.ownedFootprint?options:settings))
    openModel(next.ownedFootprint?next:{...next,options:settings})
    if(variant.stockOnly) $('status').hidden=true
    if(next.ownedFootprint) {
      feedback.textContent=next.stockRepeated?'Другой подходящий силуэт пока не найден. Все детали этой модели есть в коллекции.'
        :next.ownedFootprint.join(' × ')+' пинов. Все детали есть в коллекции.'
      feedback.hidden=false
    }
  } catch (error) {
    console.error(error)
    feedback.textContent=error.message||'Не получилось сгенерировать постройку.'
    feedback.hidden=false
    toast(feedback.textContent)
  }
}

let generationQueued=false
function requestGeneration(options,intent) {
  if(generationQueued) return
  if(!usesCollection()||$('stock-priority').value==='size') {generate(options,intent);return}
  const feedback=$('generation-feedback')
  feedback.textContent='Подбираем форму и цвета по вашей коллекции…'
  feedback.hidden=false
  generationQueued=true
  requestAnimationFrame(()=>setTimeout(()=>{
    try { generate(options,intent) }
    finally { generationQueued=false }
  },0))
}

function stockSummary(candidate) {
  const {missing}=compareStock(inventory(candidate.parts),ownedStock(owned))
  return missing?'не хватает '+missing+' деталей':'все детали есть'
}

function generateCandidate(request,history=[],intent='generate') {
  const automatic=['width','depth','mode','type','floors','direction'].some(name=>request[name]==='auto')
  const former=model?.variant.request
  const previous=intent==='variation'&&former&&historyKey(former)===historyKey(request)?model.options:undefined
  const options=resolveGenerationOptions(request,crypto.getRandomValues(new Uint32Array(1))[0],previous)
  const withRequest=candidate=>automatic?{...candidate,variant:{...candidate.variant,request}}:candidate
  const stock=usesCollection()?ownedStock(owned):null
  if(stock&&!stock.size) throw Error('Добавьте наборы или CSV с деталями в библиотеку.')
  const shared=Object.values(histories).flat().filter(variant=>variant.version===9)
  const architecturalHistory=[...new Map([...shared,...history].map(variant=>[variant.signature,variant])).values()]
  const priority=$('stock-priority').value
  if(stock&&priority!=='size') {
    try {return withRequest(newArchitecturalModel(options,architecturalHistory,{intent,current:model?.variant,stock}))}
    catch {
      try {return withRequest(newOwnedModel(options,stock,history,undefined,intent))}
      catch(error) {if(priority==='strict') throw error}
    }
  }
  let best, least=Infinity
  for(let attempt=0;attempt<(stock?10:1);attempt++) {
    let candidate
    try {candidate=newArchitecturalModel(options,architecturalHistory,{current:model?.variant,intent})}
    catch(error) {
      if(best) break
      throw error
    }
    const {variant}=candidate
    if(!stock) return withRequest(candidate)
    const {swaps,missing}=tuneToStock(candidate.parts,stock)
    if(missing<least) {
      best={...variant,stockSwaps:swaps}
      least=missing
    }
    if(!least) break
  }
  return withRequest(build(options,best))
}
function updateSuggestion() {
  const region = $('region').value
  const houses=model.houses??[]
  const house=houses.length===1?houses[0]:houses.find(house=>house.id===$('edit-house').value)
  $('edit-house-field').hidden=houses.length<2
  const floorPicker=$('edit-floor')
  const previousFloor=Number(floorPicker.value)
  const floorCount=(house?.floors??1)+Number(Boolean(house?.attic))
  const housePlans=model.interiors?.filter(plan=>plan.building===house?.id)??[]
  const floor=Math.min(previousFloor,floorCount-1)
  floorPicker.replaceChildren(...Array.from({length:floorCount},(_,i)=>new Option(floorLabel(housePlans,i),i)))
  floorPicker.value=String(floor)
  $('edit-floor-field').hidden=region!=='interior'||floorCount<=1
  const canEditStairs=model.version>=7&&Boolean(house?.stairs?.[floor])
  const plan=model.interiors?.find(item=>item.building===house?.id&&item.floor===floor)
  const interiorPlan=model.variant.design.houseEdits?.[house?.id]?.floors?.[floor]?.interiorPlan??model.variant.design.interiorPlan
  const canFurnish=region==='interior'&&!model.variant.stockOnly&&interiorPlan!==1&&fitsRoomPlan(plan?.usable,plan?.heightLimit)
  $('suggestion').textContent = region==='interior'&&plan?.attic?'Переставь мебель':
    canFurnish?'Обставь этаж':region==='interior'&&canEditStairs?'Смени лестницу':suggestions[region]
  syncLocks()
}

function targetScope() {
  const houses=model.houses??[]
  const id=$('edit-house').value
  const house=houses.length===1?houses[0]:houses.find(item=>item.id===id)
  return {house,houseId:house?.id,region:$('region').value,floor:Number($('edit-floor').value)}
}

function locked(houseId,region) {return locks[houseId+'/all']||locks[houseId+'/'+region]}

function syncLocks() {
  const {house,houseId,region}=targetScope()
  $('lock-actions').hidden=!house||Boolean(model.variant.stockOnly)
  $('lock-region').setAttribute('aria-pressed',String(Boolean(locks[houseId+'/'+region])))
  $('lock-building').setAttribute('aria-pressed',String(Boolean(locks[houseId+'/all'])))
  const count=Object.keys(locks).length
  $('new-unlocked').hidden=!count
  $('lock-summary').hidden=!count
  $('lock-summary').textContent='Закреплено: '+count
}

function pickPart(part) {
  const house=model?.houses?.find(house=>house.id===part.building)
  if(!house||pending||!['wall','roof','floor','interior','stair','stairGuard'].includes(part.role)) return
  $('edit-house').value=house.id
  $('region').value=part.role==='wall'?'facade':part.role==='roof'?'roof':'interior'
  updateSuggestion()
  $('edit-floor').value=String(Math.min(part.floor,house.attic?.floor??house.floors-1))
  updateSuggestion()
  toast(house.label+' · выбрана часть в мастерской')
}

function stageEdit(next,scope) {
  if(step!==null) {toast('Закройте инструкцию перед правкой.');return}
  const old=new Map(inventory(model.parts).map(part=>[part.id+'/'+part.color,part.count]))
  let added=0
  for(const part of inventory(next.parts)) {
    const key=part.id+'/'+part.color
    added+=Math.max(0,part.count-(old.get(key)??0))
    old.set(key,Math.max(0,(old.get(key)??0)-part.count))
  }
  const removed=[...old.values()].reduce((sum,count)=>sum+count,0)
  const project=library.find(item=>item.id===activeProject)
  pending={model:next,scope,before:{model,view,houseView,floorView,project,editHouse:$('edit-house').value,editFloor:scope.floor}}
  $('edit-delta').textContent='Предпросмотр · '+(scope.house?.label??'Постройка')+' · +'+added+' / −'+removed+' деталей'+
    (added||removed?'':' · изменились позиции')
  view=scope.region==='interior'?(scope.floor>0?'upper':'ground'):'all'
  if(scope.region==='interior'&&model.houses) {
    houseView=scope.houseId??''
    $('house-view').value=houseView
    floorView=scope.floor||1
  }
  sync()
  viewer.reset(view)
}

$('discard-edit').onclick=()=>{
  if(!pending) return
  const {before}=pending
  pending=null
  view=before.view
  houseView=before.houseView
  floorView=before.floorView
  $('house-view').value=houseView
  sync()
  viewer.reset(view)
}
$('apply-edit').onclick=()=>{
  if(!pending) return
  const {scope,before}=pending
  previous.push(before)
  model=pending.model
  pending=null
  instructions=splitInstructions(model.steps,model.parts.length,16,model.parts)
  form.elements.flooring.value=model.options.flooring??'auto'
  if(activeProject) storeProject({status:'draft',nextPart:0,thumbnail:undefined})
  sync()
  viewer.reset(view)
  updateSuggestion()
  message(scope.house?scope.house.label+' · правка применена.':'Модель и инструкция обновлены.')
}

function sendEdit(text) {
  if (!text.trim()) return
  const scope=targetScope()
  const {houseId,region,floor}=scope
  if(model.houses?.length>1&&!houseId) {
    message('Выберите дом для правки.')
    $('edit-house').focus()
    return
  }
  if(locked(houseId,region)) {message('Эта часть закреплена. Снимите закрепление перед правкой.');return}
  if(pending) {message('Примените или отмените текущий предпросмотр.');return}
  message(text, true)
  $('message').value = ''
  try {
    const result = editVariant(model.options, model.variant, region, text,{houseId,floor})
    if (result.error) { message(result.error); return }
    stageEdit(result.model,scope)
  } catch (error) {
    console.error(error)
    message('Эта правка не подошла к конструкции. Попробуйте другой вариант.')
  }
}

form.addEventListener('submit', event => {
  event.preventDefault()
  if(Object.keys(locks).length) reviseHouse()
  else requestGeneration(formValues())
})
form.addEventListener('invalid',event=>{
  const panel=event.target.closest('[role=tabpanel]')
  if(!panel) return
  showStudioPanel('settings')
  selectSettingsTab(panel.id.slice('settings-'.length))
},true)
$('new-unlocked').onclick=()=>{if(form.reportValidity()) requestGeneration(formValues())}
$('shuffle').onclick = () => {
  if(Object.keys(locks).length) reviseHouse()
  else if(form.reportValidity()) requestGeneration(formValues(),'variation')
}
$('different-architecture').onclick=()=>{
  if(Object.keys(locks).length) reviseHouse()
  else if(form.reportValidity()) requestGeneration(generationRequest({...formValues(),reference:'',buildingForm:''}),'different')
}
for(const input of form.querySelectorAll('[name=mode]')) input.onchange=()=>{
  if(form.elements.mode.value==='auto') {updateModeFields();return}
  const profile=buildingForm(form.elements.buildingForm.value)
  if(profile&&(profile.scheme==='street')!==(form.elements.mode.value==='street')) form.elements.buildingForm.value=''
  const pinned=referenceByNumber.get(settingsExtras.reference)
  if(pinned&&(schemeForReference(pinned)==='street')!==(form.elements.mode.value==='street')) settingsExtras.reference=''
  if(form.elements.mode.value!=='street') {
    if(form.elements.architecture.value==='street') form.elements.architecture.value=''
    form.elements.streetLayout.value=''
  }
  if(form.elements.mode.value==='street') {
    if(form.elements.width.value&&Number(form.elements.width.value)<24) form.elements.width.value='24'
    if(form.elements.depth.value&&Number(form.elements.depth.value)<18) form.elements.depth.value='18'
  }
  updateModeFields()
}
form.elements.architecture.onchange=()=>{
  settingsExtras.reference=''
  form.elements.buildingForm.value=''
  if(form.elements.architecture.value&&form.elements.architecture.value!=='street') form.elements.streetLayout.value=''
  updateModeFields()
}
form.elements.buildingForm.onchange=()=>{
  settingsExtras.reference=''
  settingsExtras.sitePlan=undefined
  form.elements.architecture.value=''
  if(form.elements.buildingForm.value) form.elements.streetLayout.value=''
  setForm(formValues())
}
form.elements.facadeStyle.onchange=()=>{
  const finish=facadeStyle(form.elements.facadeStyle.value)
  if(!finish) return
  form.elements.style.value=finish.theme
  if(form.elements.direction.value!=='auto'&&!architectureDirection(form.elements.direction.value)) form.elements.direction.value=finish.theme
}
form.elements.direction.onchange=()=>{
  const choice=form.elements.direction.value
  form.elements.style.value=architectureDirection(choice)?.theme??choice
  form.elements.facadeStyle.value=''
  settingsExtras.reference=''
  if(!form.elements.buildingForm.value&&form.elements.mode.value!=='street') form.elements.architecture.value=''
  updateModeFields()
}
form.elements.width.oninput=form.elements.depth.oninput=updateModeFields
$('house-view').onchange=()=>{
  houseView=$('house-view').value
  if(houseView) $('edit-house').value=houseView
  sync()
  updateSuggestion()
  $('edit-floor').value=view==='upper'||view==='plan'?String(floorView):'0'
  updateSuggestion()
  viewer.reset(view)
}
$('floor-view').onchange=()=>{
  floorView=Number($('floor-view').value)
  if(!model.houses||model.houses.length===1||houseView===$('edit-house').value) {
    $('edit-floor').value=String(floorView)
    updateSuggestion()
  }
  sync()
  viewer.reset(view)
}
for (const button of document.querySelectorAll('[data-page]')) button.onclick = () => showPage(button.dataset.page)
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => {
  if(button.dataset.view==='plan'&&view!=='upper'&&view!=='plan') floorView=0
  view = button.dataset.view
  sync()
  if(['ground','upper','plan'].includes(view)&&(!model.houses||model.houses.length===1||houseView===$('edit-house').value)) {
    $('edit-floor').value=view==='ground'?'0':String(floorView)
    updateSuggestion()
  }
  viewer.reset(view)
}
$('reset-camera').onclick = () => viewer.reset(step===null?view:'all')
$('region').onchange = updateSuggestion
$('edit-house').onchange=()=>{
  $('edit-floor').value='0'
  updateSuggestion()
}
$('edit-floor').onchange=updateSuggestion
$('chat-form').onsubmit = event => { event.preventDefault(); sendEdit($('message').value.trim()) }
$('suggestion').onclick = () => sendEdit($('suggestion').textContent)
$('undo').onclick = () => {
  if (!previous.length) return
  const restored = previous.pop()
  model = restored.model
  pending=null
  instructions=splitInstructions(model.steps,model.parts.length,16,model.parts)
  form.elements.flooring.value=model.options.flooring??'auto'
  view = restored.view
  houseView=restored.houseView
  floorView=restored.floorView
  $('house-view').value=houseView
  $('edit-house').value=restored.editHouse
  step = null
  if(activeProject) storeProject(restored.project??{status:'draft',nextPart:0})
  updateSuggestion()
  $('edit-floor').value=String(restored.editFloor)
  updateSuggestion()
  message('Предыдущая версия восстановлена.')
  sync()
  viewer.reset(view)
}
function storeProject(changes={}) {
  const existing=library.find(item=>item.id===activeProject)
  const name=changes.name??existing?.name??(types[model.options.type]+' '+model.options.width+' × '+model.options.depth)
  const saved=modelSnapshot(model,name,{...existing,...changes,locks})
  activeProject=saved.id
  library=[saved,...library.filter(item=>item.id!==saved.id)]
  save('brick-projects-v2',library)
  return saved
}

$('open-instructions').onclick = () => {
  if(pending) {toast('Примените или отмените предпросмотр.');return}
  const existing=library.find(item=>item.id===activeProject)
  const nextPart=existing?.status==='building'?existing.nextPart:0
  storeProject({status:'building',nextPart})
  const resume=instructions.findIndex(item=>item.start===nextPart)
  panelBeforeInstruction=studioPanel
  step=Math.max(0,resume)
  sync()
  viewer.reset('all')
}
$('close-instructions').onclick = () => {
  step=null
  showStudioPanel(panelBeforeInstruction)
  sync()
  viewer.reset(view)
  $('open-instructions').focus()
}
$('step-prev').onclick = () => { if (step > 0) { step--; sync();viewer.reset('all') } }
$('step-next').onclick = () => {
  if (step < instructions.length - 1) {
    step++
    const saved=library.find(item=>item.id===activeProject)
    storeProject({status:'building',nextPart:Math.max(saved?.nextPart??0,instructions[step].start)})
    sync();viewer.reset('all')
    return
  }
  storeProject({status:'built',nextPart:model.parts.length})
  step = null
  showStudioPanel(panelBeforeInstruction)
  sync()
  showPage('library')
  toast('Постройка сохранена в библиотеке.')
}
let shortage=[]
function renderPartRows(items,render,page=0) {
  const compact=innerWidth<560
  const size=Math.max(1,Math.min(8,Math.floor((innerHeight*.8-(compact?245:200))/(compact?62:57))))
  const count=Math.ceil(items.length/size)
  $('parts-list').innerHTML=items.slice(page*size,(page+1)*size).map(render).join('')
  pager('parts-pager',page,count,next=>renderPartRows(items,render,next))
}

function showParts(mode='model') {
  const used=inventory(model.parts)
  const showCatalog=mode==='catalog'
  const collection=mode==='owned'
  $('model-inventory').setAttribute('aria-pressed',String(mode==='model'))
  $('shape-catalog').setAttribute('aria-pressed',String(showCatalog))
  $('owned-comparison').setAttribute('aria-pressed',String(collection))
  $('download-parts').hidden=mode!=='model'
  $('download-shortage').hidden=!collection
  const distinct=new Set(used.map(part=>part.id)).size
  $('parts-summary').textContent = showCatalog
    ? Object.keys(catalog).length+' форм с геометрией LDraw'
    : model.parts.length+' деталей · '+distinct+' форм'
  if(showCatalog) {
    renderPartRows(Object.values(catalog).sort((a,b)=>a.label.localeCompare(b.label,'ru')),part=>{
      const variants=Object.keys(availability[part.id]??{}).length
      return `<div class="inventory-row catalog-row"><img class="part-preview" loading="lazy" src="${import.meta.env.BASE_URL}part-images/${part.id}.webp" alt=""><span>${part.label}<small>${part.id} · Цветов в базе ${variants}</small></span></div>`
    })
    return
  }
  if(collection) {
    const result=compareStock(used,ownedStock(owned))
    shortage=result.rows.filter(row=>row.missing)
    $('parts-summary').textContent=result.available+' есть · '+result.missing+' не хватает'+(owned.length?'':' · добавьте наборы в библиотеке')
    const findColor=id=>Object.keys(colors).find(color=>inventoryColor(color)===id)
    renderPartRows(result.rows.slice().sort((a,b)=>b.missing-a.missing),part=>{
      const swaps=part.substitutes.map(({color,quantity})=>quantity+' × '+(colors[findColor(color)]?.[0]??'цвет '+color)).join(', ')
      return `<div class="inventory-row"><img class="part-preview" src="${import.meta.env.BASE_URL}part-images/${part.id}.webp" alt=""><span class="swatch" style="background:#${colors[part.color][1].toString(16).padStart(6,'0')}"></span><span>${part.label}<small>${colors[part.color][0]} · ${part.id}</small>${swaps?'<small>Замена того же артикула: '+swaps+'</small>':''}</span><strong>${part.have} / ${part.count}</strong></div>`
    })
    return
  }
  renderPartRows(used,part=>`
    <div class="inventory-row"><img class="part-preview" src="${import.meta.env.BASE_URL}part-images/${part.id}.webp" alt=""><span class="swatch" style="background:#${colors[part.color][1].toString(16).padStart(6,'0')}"></span><span>${part.label}<small>${colors[part.color][0]} · ${part.id}${part.element?' · '+part.element:''}</small></span><strong>× ${part.count}</strong></div>`)
}
$('open-parts').onclick=()=>{showParts();$('parts-dialog').showModal()}
$('model-inventory').onclick=()=>showParts()
$('shape-catalog').onclick=()=>showParts('catalog')
$('owned-comparison').onclick=()=>showParts('owned')
$('download-shortage').onclick=()=>{
  const lines=['part_num,color_id,quantity',...shortage.map(part=>[part.id,inventoryColor(part.color),part.missing].join(','))]
  download('kirpichik-shortage.csv',lines.join('\r\n'),'text/csv;charset=utf-8')
}

function referenceCard(reference) {
  const recipe=referenceRecipe(reference)
  const article=document.createElement('article')
  article.className='card gallery-card reference-card'
  article.innerHTML='<div class="gallery-art"><div class="reference-placeholder" aria-hidden="true">'+icon('building',34)+'</div><img alt="" loading="lazy"></div><div class="gallery-content"><p class="reference-series"></p><h2></h2><p class="reference-profile"></p><div class="reference-actions"><button class="primary" type="button">Взять за основу</button><a class="reference-inventory" download>Состав CSV</a><a class="reference-source" target="_blank" rel="noopener">О наборе</a><a class="reference-instructions" target="_blank" rel="noopener" hidden>Инструкция LEGO</a></div></div>'
  const photo=article.querySelector('img')
  photo.addEventListener('load',()=>{
    photo.classList.add('is-loaded')
    article.querySelector('.reference-placeholder').hidden=true
  })
  if(reference.image.startsWith('https://cdn.rebrickable.com/')) photo.src=reference.image
  article.querySelector('.reference-series').textContent=reference.series+' · '+reference.number+' · '+reference.year+' · '+reference.count.toLocaleString('ru-RU')+' деталей'
  article.querySelector('h2').textContent=reference.title
  const layout=referenceLayout(reference.number)
  article.querySelector('.reference-profile').textContent=layout?.label??'Мотивы набора · '+recipeDescription(recipe)
  if(recipe.source) {
    const link=article.querySelector('.reference-instructions')
    link.href=recipe.source
    link.hidden=false
  }
  article.querySelector('.reference-inventory').href=import.meta.env.BASE_URL+'reference-inventory/'+reference.id+'.csv'
  article.querySelector('.reference-source').href='https://rebrickable.com/sets/'+reference.id+'/'
  article.querySelector('button').onclick=()=>{
    const referenceTypes={conservatory:'greenhouse',factory:'workshop',station:'station',tram:'station',
      hospital:'clinic',depot:'workshop',fireTower:'fireStation',garage:'garage',airport:'station',
      apartment:'apartment',apartmentRow:'apartment',bazaar:'market'}
    form.elements.type.value=referenceTypes[recipe.key]??reference.type
    form.elements.style.value=reference.style
    form.elements.direction.value=reference.style
    form.elements.facadeStyle.value=''
    form.elements.buildingForm.value=''
    form.elements.floors.value=layout?.floors??(profiles[reference.profile].low?'1':'2')
    form.elements.architecture.value=schemeForReference(reference)
    if(form.elements.architecture.value==='street') form.elements.mode.value='street'
    else if(form.elements.mode.value==='street') form.elements.mode.value='city'
    showPage('studio')
    requestGeneration(generationRequest({...formValues(),reference:reference.number,sitePlan:undefined,streetLayout:'',
      photoPalette:undefined,photoRoof:undefined,photoRhythm:undefined}))
  }
  return article
}

function recipeDescription(recipe) {
  const features=[compositionNames[recipe.composition],facadeNames[recipe.facade],roofNames[recipe.roof]]
  if(recipe.key==='blacksmith') features.push('Пятиугольная черепица')
  if(recipe.interiorOnly) features.unshift('Архитектурная адаптация интерьера')
  return features.join(' · ')
}
function references() {
  const query=$('filter-query').value.toLowerCase().trim()
  const series=$('filter-series').value
  const profile=$('filter-profile').value
  const results=referenceCatalog.filter(reference=>
    (!series||reference.series===series)&&(!profile||reference.profile===profile)&&
    (!query||[reference.title,reference.number,reference.series,profiles[reference.profile].label,recipeDescription(referenceRecipe(reference))].some(value=>value.toLowerCase().includes(query)))
  )
  const {start,end}=galleryPage('reference',results,referenceCard)
  $('reference-count').textContent=results.length
    ? (end===start+1?end:(start+1)+'–'+end)+' из '+results.length
    : 'Подходящих наборов нет'
}
function filterReferences() {referencePage=0;references()}
$('filter-query').oninput=filterReferences
$('filter-series').onchange=$('filter-profile').onchange=filterReferences
function action(label,handler,kind='subtle') {
  const button=document.createElement('button')
  button.type='button'
  button.textContent=label
  button.className=kind
  button.onclick=handler
  return button
}

function libraryCard(title,meta,actions) {
  const article=document.createElement('article')
  article.className='card library-entry'
  const heading=document.createElement('h2')
  const description=document.createElement('p')
  const buttons=document.createElement('div')
  heading.textContent=title
  description.textContent=meta
  buttons.className='feature-actions'
  buttons.append(...actions)
  article.append(heading,description,buttons)
  return article
}

function featureDialog(title,content) {
  const dialog=$('feature-dialog')
  dialog.innerHTML='<div class="dialog-title"><h2></h2><form method="dialog"><button class="bare" aria-label="Закрыть">✕</button></form></div>'+content
  dialog.querySelector('h2').textContent=title
  if(!dialog.open) dialog.showModal()
  return dialog
}

function nameDialog(title,initial,onSave) {
  const dialog=featureDialog(title,'<form class="name-form"><label class="field">Название<input name="name" required maxlength="80"></label><button class="primary">Сохранить</button></form>')
  const nameForm=dialog.querySelector('.name-form')
  nameForm.elements.name.value=initial
  nameForm.onsubmit=event=>{
    event.preventDefault()
    const name=nameForm.elements.name.value.trim()
    if(!name) return
    dialog.close()
    onSave(name)
  }
}

$('save-project').onclick=()=>{
  const existing=library.find(project=>project.id===activeProject)
  nameDialog('Сохранить проект',existing?.name??types[model.options.type],name=>{
    const thumbnail=step===null&&!pending&&view==='all'?viewer.capture(240,180):existing?.thumbnail
    storeProject({name,thumbnail})
    sync()
    toast('Проект сохранён в библиотеке.')
  })
}

function openProject(project) {
  try {
    const next=build(project.options,project.variant)
    showPage('studio')
    setForm(next.variant.request??next.options)
    openModel(next,project)
    if(project.status==='building') $('open-instructions').click()
  } catch(error) {toast(error.message)}
}

function continueDistrict(project) {
  try {
    const source=build(project.options,project.variant)
    let sitePlan=source.options.sitePlan
    if(sitePlan) {
      const edge=source.streets.find(road=>road.x1===source.options.width)
      if(!edge) {toast('Чтобы продолжить квартал справа, доведите дорогу до правого края участка.');return}
      const {width,depth}=source.options
      const z=edge.z1+9<depth?edge.z1+1:1
      const d=Math.min(12,(z===1?edge.z0:depth-1)-z)
      sitePlan=[{kind:'road',x:0,z:edge.z0,w:width,d:edge.z1-edge.z0},{kind:'house',x:2,z,w:Math.min(14,width-3),d}]
      if(validateSitePlan(sitePlan,width,depth)) {toast('Для соседнего дома нужно больше места у продолжения дороги.');return}
    }
    const options=normalize({...source.options,mode:'street',streetLayout:source.streetPlan,sitePlan})
    const next=generateCandidate(options)
    const district=project.district??project.name
    const copy=modelSnapshot(next,project.name+' · соседний участок',{district})
    library=[copy,...library]
    save('brick-projects-v2',library)
    openProject(copy)
  } catch(error) {toast(error.message)}
}

function showLibrary() {
  const out=$('library-list')
  $('library-project-controls').hidden=libraryTab!=='projects'
  $('library-set-controls').hidden=libraryTab!=='sets'
  for(const button of document.querySelectorAll('[data-library]')) button.setAttribute('aria-pressed',String(button.dataset.library===libraryTab))
  if(libraryTab==='sets') {
    galleryPage('library',owned,item=>{
      const loose=item.id.startsWith('csv-')
      const quantity=document.createElement('input')
      const quantityLabel=document.createElement('label')
      quantity.type='number';quantity.min=1;quantity.max=999;quantity.value=item.quantity
      quantity.setAttribute('aria-label','Количество наборов '+item.title)
      quantityLabel.className='quantity-label'
      quantityLabel.append('Копии',quantity)
      quantity.onchange=()=>{
        const value=Number(quantity.value)
        if(Number.isInteger(value)&&value>=1&&value<=999) item.quantity=value
        save('brick-owned-v1',owned);showLibrary();sync()
      }
      const actions=[...(loose?[]:[quantityLabel]),action('Убрать',()=>{
        owned=owned.filter(set=>set.id!==item.id)
        save('brick-owned-v1',owned);showLibrary();sync()
      })]
      if(item.url) {
        const link=document.createElement('a')
        link.href=item.url;link.textContent='Набор LEGO';link.target='_blank';link.rel='noopener'
        actions.unshift(link)
      }
      const count=item.parts.reduce((sum,row)=>sum+row[2],0)*item.quantity
      const label=loose?count+' деталей из CSV':item.id+' · '+item.quantity+' шт. · '+count+' деталей в составе'
      return libraryCard(item.title,label,actions)
    })
    if(!owned.length) out.append(libraryCard('Добавьте первый набор','Номер или ссылка на набор LEGO помогут найти его состав.',[]))
    return
  }
  if(libraryTab==='modules') {
    galleryPage('library',savedModules,item=>libraryCard(item.name,item.description,[
      action('Применить к проекту',()=>insertModule(item),'primary'),
      action('Убрать',()=>{savedModules=savedModules.filter(mod=>mod.id!==item.id);save('brick-modules-v1',savedModules);showLibrary()})
    ]))
    if(!savedModules.length) out.append(libraryCard('Модули из ваших проектов','Сохраните часть дома в мастерской, чтобы использовать её в другой постройке.',[]))
    return
  }
  galleryPage('library',library,project=>{
    const controls=[
      action(project.status==='building'?'Продолжить':'Открыть',()=>openProject(project),'primary'),
      action('Скачать проект',()=>download('kirpichik-project.json',JSON.stringify({format:'kirpichik-project-v1',project}),'application/json')),
      action('Убрать',()=>{
        library=library.filter(item=>item.id!==project.id)
        if(activeProject===project.id) {activeProject='';sync()}
        save('brick-projects-v2',library);showLibrary()
      })
    ]
    if(project.variant.design.scheme==='street') controls.push(action('Соседний участок',()=>continueDistrict(project)))
    const progress=project.status==='building'&&project.partCount?' · '+Math.floor(100*project.nextPart/project.partCount)+'%':''
    const card=libraryCard(project.name,statusNames[project.status]+progress+' · '+project.options.width+' × '+project.options.depth+
      (project.district?' · '+project.district:''),controls)
    if(/^data:image\/webp;base64,[\w+/=]+$/.test(project.thumbnail??'')) {
      const image=new Image()
      image.src=project.thumbnail;image.alt='';image.loading='lazy'
      card.prepend(image)
    }
    return card
  })
  if(!library.length) out.append(libraryCard('Ваш первый проект','Сохраните черновик из студии или начните сборку.',[action('Открыть студию',()=>showPage('studio'),'primary')]))
}

for(const button of document.querySelectorAll('[data-library]')) button.onclick=()=>{libraryTab=button.dataset.library;libraryPage=0;showLibrary()}
$('open-owned-set').onclick=()=>$('owned-set-dialog').showModal()

$('owned-set-form').onsubmit=async event=>{
  event.preventDefault()
  const elements=event.target.elements
  const link=parseSetLink(elements.link.value)
  const status=$('owned-status')
  if(!link) {status.textContent='Вставьте ссылку с lego.com или номер набора.';return}
  const submit=event.target.querySelector('[type=submit]')
  submit.disabled=true
  status.textContent='Загружаем состав…'
  const file=elements.inventory.files[0]
  try {
    const quantity=Number(elements.quantity.value)
    if(!Number.isInteger(quantity)||quantity<1||quantity>999) throw Error('Проверьте количество наборов.')
    const known=file?await lookupSet(link.id).catch(()=>null):await lookupSet(link.id)
    if(!known&&!file) throw Error('Состава нет в локальном каталоге. Прикрепите CSV набора.')
    const parts=file?parseOwnedInventory(await file.text()):known.parts
    const existing=owned.find(item=>item.id===link.id)
    if((existing?.quantity??0)+quantity>999) throw Error('В коллекции можно учесть до 999 копий одного набора.')
    const item={id:link.id,url:link.url??existing?.url,title:known?.title??existing?.title??('Набор '+link.id),parts,
      quantity:(existing?.quantity??0)+quantity}
    owned=[item,...owned.filter(set=>set.id!==item.id)]
    save('brick-owned-v1',owned)
    event.target.reset()
    status.textContent=item.title+' добавлен.'
    $('owned-set-dialog').close()
    toast(status.textContent)
    libraryPage=0
    showLibrary()
    sync()
  } catch(error) {status.textContent=error.message}
  finally {submit.disabled=false}
}

$('check-owned').onclick=()=>{showParts('owned');$('parts-dialog').showModal()}
$('add-loose-parts').onclick=()=>$('loose-parts-file').click()
$('loose-parts-file').onchange=async event=>{
  const file=event.target.files[0]
  if(!file)return
  try {
    if(file.size>3e6) throw Error('Файл деталей слишком большой.')
    const parts=parseOwnedInventory(await file.text())
    const title=file.name.replace(/\.csv$/i,'')||'Мои детали'
    owned=[{id:'csv-'+crypto.randomUUID(),title,quantity:1,parts},...owned]
    save('brick-owned-v1',owned)
    showLibrary()
    sync()
    toast('Детали добавлены в коллекцию.')
  } catch(error) {toast(error.message)}
  finally {event.target.value=''}
}
$('build-from-owned').onclick=()=>{
  if(!owned.length){toast('Добавьте набор в коллекцию.');return}
  showPage('studio')
  $('from-stock').value='on'
  $('stock-priority').value='strict'
  saveStockSettings()
  requestGeneration({...formValues(),reference:''})
}
$('import-project').onclick=()=>$('project-file').click()
$('project-file').onchange=async event=>{
  const file=event.target.files[0]
  if(!file) return
  try {
    if(file.size>4e6) throw Error('Файл проекта слишком большой.')
    const data=readProject(await file.text())
    const next=build(data.options,data.variant)
    const project=modelSnapshot(next,data.name,data)
    library=[project,...library]
    save('brick-projects-v2',library)
    showLibrary()
    toast('Проект добавлен в библиотеку.')
  } catch(error) {toast(error.message)}
  finally {event.target.value=''}
}

const presetOptions={
  auto:{width:'auto',depth:'auto',floors:'auto',type:'auto',mode:'auto',direction:'auto',architecture:'',facadeStyle:'',streetLayout:'',flooring:'auto',partLimit:undefined},
  quick:{width:12,depth:12,floors:1,mode:'solo',architecture:'house',partLimit:450},
  detail:{width:26,depth:26,floors:2,mode:'solo',architecture:'house',partLimit:2200},
  street:{width:48,depth:48,floors:3,mode:'street',architecture:'street',streetLayout:'square',partLimit:6500}
}
function applyPreset(value) {
  const preset=presetOptions[value]
  if(preset) setForm(generationRequest({...formValues(),sitePlan:undefined,reference:'',buildingForm:'',
    photoPalette:undefined,photoRoof:undefined,photoRhythm:undefined,...preset}))
  if(value==='auto') {
    $('from-stock').value='auto'
    $('stock-priority').value='auto'
    saveStockSettings()
  }
}
$('project-preset').onchange=event=>applyPreset(event.target.value)

$('open-lot').onclick=()=>{
  const request=formValues()
  const options=normalize({...request,width:request.width==='auto'?model?.options.width:request.width,
    depth:request.depth==='auto'?model?.options.depth:request.depth,mode:'street',reference:'',buildingForm:''})
  openSiteEditor($('feature-dialog'),{
    width:options.width,depth:options.depth,plan:options.sitePlan??[],
    onSave(plan) {
      const next=generationRequest({...request,width:options.width,depth:options.depth,mode:'street',reference:'',buildingForm:'',
        sitePlan:plan,streetLayout:plan?'custom':''})
      setForm(next)
      if(plan) requestGeneration(next)
    }
  })
}

$('open-photo').onclick=()=>{
  const dialog=featureDialog('Фото постройки',`<label class="field">Изображение<input id="photo-file" type="file" accept="image/*"></label>
    <p id="photo-report" class="muted">Подберём цвета и предложим форму крыши по силуэту.</p><div id="photo-swatches" class="feature-actions"></div>
    <form id="photo-options" hidden><label class="field">Стиль<select name="style"><option value="auto">Автоматически</option>${select(styles)}</select></label>
    <label class="field">Крыша<select name="roof"><option value="auto">Автоматически</option><option value="gable">Двускатная</option><option value="shed">Односкатная</option><option value="terrace">Плоская</option><option value="hip">Четырёхскатная</option></select></label>
    <button class="primary">Генерировать по подсказкам</button></form>`)
  const find=selector=>dialog.querySelector(selector)
  let analyzed
  const photoForm=find('#photo-options')
  find('#photo-file').onchange=async event=>{
    const file=event.target.files[0]
    if(!file)return
    photoForm.hidden=true
    find('#photo-report').textContent='Смотрим цвет и силуэт…'
    try {
      if(file.size>30e6) throw Error('Выберите фото размером до 30 МБ.')
      analyzed=await analyzePhoto(file)
      find('#photo-swatches').replaceChildren(...analyzed.swatches.map(rgb=>{
        const chip=document.createElement('span')
        chip.className='photo-swatch'
        chip.style.background='rgb('+rgb.join(',')+')'
        return chip
      }))
      photoForm.elements.style.value='auto'
      photoForm.elements.roof.value='auto'
      find('#photo-report').textContent='Предложены цвета и силуэт крыши · '+(analyzed.rhythm>=4?'частый ритм светлых и тёмных участков':'крупные цветовые участки')
      photoForm.hidden=false
    } catch(error) {find('#photo-report').textContent=error.message||'Не удалось прочитать фото.'}
  }
  photoForm.onsubmit=event=>{
    event.preventDefault()
    if(!analyzed)return
    const style=photoForm.elements.style.value==='auto'?analyzed.ranked[0].style:photoForm.elements.style.value
    const photoRoof=photoForm.elements.roof.value==='auto'?analyzed.roof:photoForm.elements.roof.value
    const options=generationRequest({...formValues(),reference:'',direction:'',facadeStyle:'',buildingForm:'',style,photoRoof,photoRhythm:analyzed.rhythm>=4?'dense':'open',
      photoPalette:analyzed.ranked.find(item=>item.style===style).index})
    dialog.close()
    requestGeneration(options)
  }
}

$('compare-options').onclick=async()=>{
  if(!form.reportValidity())return
  if(Object.keys(locks).length) {reviseHouse();return}
  if(step!==null||pending) {toast('Закройте инструкцию или предпросмотр перед сравнением.');return}
  const dialog=featureDialog('Сравнить варианты','<p class="muted" id="compare-state">Подбираем три постройки…</p><div class="comparison-grid"></div>')
  const choices=dialog.querySelector('.comparison-grid')
  const status=dialog.querySelector('#compare-state')
  const options=formValues(),history=[]
  try {
    await new Promise(resolve=>setTimeout(resolve,0))
    await viewer.ready
    for(let i=0;i<3&&dialog.open;i++) {
      const next=generateCandidate(options,history)
      if(next.stockRepeated) break
      history.push(next.variant)
      viewer.show(next,{view:'all'})
      viewer.reset('all')
      const exterior=viewer.capture(400,300)
      viewer.show(next,{view:'ground',cutaway:true})
      viewer.reset('plan')
      const floorplan=viewer.capture(400,300)
      const meta=next.parts.length+' деталей · '+splitInstructions(next.steps,next.parts.length).length+' шагов'+
        (owned.length?' · '+stockSummary(next):'')
      const controls=[action('Выбрать',()=>{
        dialog.close()
        if(next.variant.version===9) rememberVariant(historyKey(options),next.variant)
        setForm(next.variant.request??(next.ownedFootprint?options:next.options));openModel(next)
      },'primary')]
      if(exterior) {
        const image=new Image()
        image.src=exterior;image.alt=''
        const toggle=action('План этажа',()=>{
          const showPlan=image.src===exterior
          image.src=showPlan?floorplan:exterior
          toggle.textContent=showPlan?'Внешний вид':'План этажа'
        })
        controls.push(toggle)
        const entry=libraryCard(next.title,meta,controls)
        entry.prepend(image)
        choices.append(entry)
      } else choices.append(libraryCard(next.title,meta,controls))
    }
    const count=choices.children.length
    status.textContent=count===1?'Нашёлся один подходящий вариант.':count+' варианта для вашего участка'
  } catch(error) {status.textContent=error.message}
  finally {sync();viewer.reset(view)}
}

function toggleLock(region) {
  const {houseId}=targetScope()
  if(!houseId)return
  const key=houseId+'/'+region
  if(locks[key]) delete locks[key]
  else locks[key]=true
  storeProject()
  sync()
}
$('lock-region').onclick=()=>toggleLock($('region').value)
$('lock-building').onclick=()=>toggleLock('all')

function reviseHouse() {
  const scope=targetScope()
  if(!scope.house) {toast('Выберите дом в мастерской.');return}
  if(pending) {toast('Примените или отмените текущий предпросмотр.');return}
  let candidate=model
  for(const [region,command] of [['roof','Смени крышу'],['facade','Смени цвет'],['interior','Переставь мебель']]) {
    if(locked(scope.houseId,region))continue
    try {
      const result=editVariant(candidate.options,candidate.variant,region,command,scope)
      if(result.model) candidate=result.model
    } catch {}
  }
  if(candidate===model) {toast('Для выбранного дома нет доступных правок.');return}
  stageEdit(candidate,{...scope,region:'facade'})
}
$('revise-building').onclick=reviseHouse

const regionNames={roof:'Крыша',facade:'Фасад',interior:'Лестница'}
const stairCommands={straight:'Сделай прямую лестницу',stringer:'Сделай лестницу на тетиве',molded:'Сделай литую лестницу',
  turn:'Сделай Г-образную лестницу',return:'Сделай П-образную лестницу'}
$('save-module').onclick=()=>{
  const {house,region,floor}=targetScope()
  if(!house)return
  const edited=model.variant.design.houseEdits?.[house.id]
  const kind=region==='roof'?house.roof:region==='facade'?edited?.facade??house.recipe?.facade:house.stairs?.[floor]?.kind
  if(!kind||kind==='aframe'||region==='interior'&&!stairCommands[kind]) {
    toast('Выберите крышу, фасад или этаж с лестницей.');return
  }
  const label=region==='roof'?roofNames[kind]??'Плоская кровля':region==='facade'?facadeNames[kind]:house.stairs[floor].name
  nameDialog('Сохранить модуль',label,name=>{
    savedModules=[{id:crypto.randomUUID(),name,description:regionNames[region]+' · '+label,kind,region,
      palette:((edited?.palette??model.variant.design.palette)+house.colorIndex)%6},...savedModules]
    save('brick-modules-v1',savedModules)
    toast('Модуль сохранён в библиотеке.')
  })
}

function insertModule(module) {
  showPage('studio')
  if(model.variant.stockOnly) {toast('Подберите новый вариант из коллекции, чтобы сохранить комплектность деталей.');return}
  $('region').value=module.region
  updateSuggestion()
  const scope=targetScope()
  const {house,houseId,region}=scope
  if(!house){toast('Выберите дом в мастерской, затем откройте модуль.');return}
  if(locked(houseId,region)){toast('Эта часть закреплена.');return}
  if(pending){toast('Примените или отмените текущий предпросмотр.');return}
  try {
    if(region==='interior') {
      const result=editVariant(model.options,model.variant,region,stairCommands[module.kind],scope)
      if(!result.model) {toast(result.error);return}
      stageEdit(result.model,scope)
      return
    }
    if(model.version<7||house.roof==='aframe') {toast('Выберите совместимый городской дом.');return}
    const design={...model.variant.design}
    const edit={...design.houseEdits?.[houseId]}
    if(region==='facade') {
      edit.facade=module.kind
      edit.palette=(module.palette-house.colorIndex%6+6)%6
    } else edit.roof=module.kind==='flat'?'terrace':module.kind
    design.houseEdits={...design.houseEdits,[houseId]:edit}
    stageEdit(build(model.options,{...model.variant,design,signature:JSON.stringify(design)}),scope)
  } catch(error) {toast('Модуль не подошёл к этому дому. '+error.message)}
}
const current=read('brick-current-v2',null)
addEventListener('resize',()=>{
  if(!$('references').hidden) references()
  if(!$('library').hidden) showLibrary()
  if(step!==null) {
    const start=instructions[step].start
    renderStepParts(inventory(model.parts.slice(start,instructions[step+1]?.start??model.parts.length)))
  }
})
try {
  if([5,6,7,8,9].includes(current?.variant?.version)) {
    setForm(current.requested??current.options)
    const project=library.find(item=>item.id===current.activeProject)
    openModel(build(current.options,current.variant),project)
  }
  else if(current?.options) {setForm(current.options);generate(formValues())}
  else {setForm(initial);generate(initial)}
} catch {setForm(initial);generate(initial)}



$('download-model').onclick=()=>download('kirpichik-'+model.variant.seed+'.ldr',exportLDraw({...model,steps:instructions}))
$('download-parts').onclick=()=>download('kirpichik-parts.csv',exportInventory(model),'text/csv;charset=utf-8')

$('step-select').onchange=()=>{step=Number($('step-select').value);sync();viewer.reset('all')}
$('stage-select').onchange=()=>{step=Number($('stage-select').value);sync();viewer.reset('all')}

$('cutaway').onclick=()=>{cutaway=!cutaway;sync();viewer.reset(view)}
