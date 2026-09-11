export const labels={include:'Прямая',conditional:'Для отдельных классов ПО',exclude:'Вне области анализа ПО'};
export const pageConfigs=[
 {kind:'software',file:'index.html',otherFile:'excluded.html',csvFile:'software-threats.csv',title:'Угрозы безопасности программного обеспечения',heading:'Угрозы безопасности<br>программного обеспечения',subtitle:'Отбор по описанию и объекту воздействия из thrlist.xlsx.',note:'Условия применимости — в каждой записи',catalogTitle:'Каталог угроз ПО',catalogSubtitle:'Программные механизмы, данные и компоненты',thirdColumn:'Применимость',otherLabel:'Перейти к угрозам вне области ПО'},
 {kind:'excluded',file:'excluded.html',otherFile:'index.html',csvFile:'excluded-threats.csv',title:'Угрозы вне области анализа программного обеспечения',heading:'Угрозы вне области<br>программного обеспечения',subtitle:'Не отобраны для анализа самостоятельного ПО: объекты и причины исключения.',note:'Обоснование исключения — в каждой строке',catalogTitle:'Угрозы вне области ПО',catalogSubtitle:'Оборудование, инфраструктура, АСУ ТП и организационные сценарии',thirdColumn:'Почему не подходит для ПО',otherLabel:'Перейти к угрозам для ПО'}
];
export const softwareThemes=['Код и выполнение','Доступ и учетные данные','Данные и файлы','Веб и сетевые сервисы','Поставка и обновления','Системное ПО','Виртуализация и контейнеры','Машинное обучение','Защитное ПО'];
export const exclusionThemes=['Аппаратные средства','Физический доступ и каналы утечки','АСУ ТП и технологические процессы','Сетевая инфраструктура','Облачная инфраструктура','Грид-системы и суперкомпьютеры','Организация и персонал'];
export const csvColumns=[
 ['Идентификатор','id'],['Наименование УБИ','name'],['Объект воздействия (источник)','object'],['Применимость','decision'],['Тематика','category'],['Область исключённой угрозы (анализ)','exclusionGroup'],['Программный объект (анализ)','softwareObject'],['Обоснование отбора (анализ)','rationale'],['Почему не подходит для ПО (анализ)','exclusionRationale'],['Условие применимости (анализ)','condition'],['Описание (источник)','description'],['Источник угрозы','actor'],['Нарушение конфиденциальности','confidentiality'],['Нарушение целостности','integrity'],['Нарушение доступности','availability'],['Статус угрозы','status'],['Дата включения','created'],['Дата изменения','updated'],['Замечания','notes'],['Источник','sourceRef']
];
// The exact same function generates both prebuilt files and in-browser exports.
export function createCsv(rows,columns,decisionLabels){
 const field=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const value=(t,key)=>key==='id'?'УБИ.'+String(t.id).padStart(3,'0'):key==='decision'?decisionLabels[t.decision]:key==='exclusionRationale'?(t.decision==='exclude'?t.rationale:''):key==='sourceRef'?`thrlist.xlsx · Sheet · строка ${t.row}`:t[key];
 return '\ufeff'+[columns.map(([title])=>field(title)).join(';'),...rows.map(t=>columns.map(([,key])=>field(value(t,key))).join(';'))].join('\r\n');
}
