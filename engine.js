'use strict';
/* Движок правил прототипа: чистые функции без DOM, сети и системных часов.
   Статусы: met — подтверждено; opportunity — есть посильное действие; unknown — данных не хватает
   (не нарушение); na — правило к этому приёму не относится.
   Движение, калории, вес и глюкоза в оценку блюда не входят. */
window.RITM_ENGINE = (() => {
  const GROUP = { veg: 'fiber', legume: 'fiber', protein: 'base', dairy: 'base', fat: 'base', starch: 'carb', fruit: 'sweet', sweet: 'sweet', mixed: 'mixed', drink: 'drink', other: 'unknown' };
  const RANK = { fiber: 0, base: 1, mixed: 1.5, carb: 2, sweet: 3 };
  const isBase = it => ['protein', 'dairy', 'fat', 'legume'].includes(it.cat);
  const isFiber = it => it.cat === 'veg' || it.cat === 'legume';
  const isSweet = it => it.cat === 'fruit' || it.cat === 'sweet';

  const rankOf = it => RANK[GROUP[it.cat]];

  function facts(items) {
    const food = items.filter(i => i.cat !== 'drink');
    return {
      food,
      hasBase: food.some(isBase), hasFiber: food.some(isFiber), hasCarb: food.some(i => i.cat === 'starch'),
      hasSweet: food.some(isSweet), hasTreat: food.some(i => i.cat === 'sweet'),
      hasMixed: food.some(i => i.cat === 'mixed'), unknownItems: food.filter(i => i.cat === 'other')
    };
  }
  const names = list => list.map(i => `«${i.name}»`).join(', ');

  function ruleFirst(meal, f) {
    const r = { id: 'first', title: 'Несладкая основа первого приёма' };
    if (meal.type !== 'first') return { ...r, state: 'na', text: 'Только для первого приёма пищи — в любое время, когда вы впервые едите.' };
    if (!f.hasBase) {
      if (f.hasMixed || f.unknownItems.length) return { ...r, state: 'unknown', text: 'Состав смешанного блюда или компонента неизвестен — данных не хватает.' };
      return { ...r, state: 'opportunity', text: 'Пока нет белковой или жировой основы: яйца, творог, сыр, бобовые, рыба.', action: 'add-base' };
    }
    // При неизвестном порядке место сладкого в списке ничего не доказывает.
    if (f.hasSweet && meal.orderStatus === 'unknown') return { ...r, state: 'unknown', text: 'Основа есть; порядок не подтверждён — это не нарушение.' };
    const lastBase = Math.max(...meal.items.map((it, i) => isBase(it) ? i : -1));
    const sweetBefore = meal.items.some((it, i) => isSweet(it) && i < lastBase);
    if (sweetBefore) return { ...r, state: 'opportunity', text: 'Основа есть. Сладкое или фрукт удобнее съесть после неё.', action: 'sweet-end' };
    return { ...r, state: 'met', text: f.hasSweet ? 'Есть несладкая основа, сладкое — в конце.' : 'Есть несладкая основа.' };
  }

  function ruleSnack(meal, f) {
    const r = { id: 'snack', title: 'Несладкий перекус' };
    if (meal.type !== 'snack') return { ...r, state: 'na', text: 'Только для перекуса.' };
    if (f.hasTreat) return { ...r, state: 'opportunity', text: 'Сладкое не запрещено: его удобнее съесть после основной еды как десерт.', action: 'to-dessert' };
    if (f.hasBase || f.hasFiber) return { ...r, state: 'met', text: 'Есть белок, жиры или овощи. Фрукт вместе с ними — тоже вариант.' };
    if (f.hasMixed || f.unknownItems.length) return { ...r, state: 'unknown', text: 'Состав неизвестен — данных не хватает.' };
    return { ...r, state: 'opportunity', text: 'Только крахмал или фрукт: можно добавить орехи, сыр, йогурт без сахара или хумус.', action: 'add-base' };
  }

  // Подтверждает только явная отметка «сразу после основной еды»: другой приём в тот же день ничего не доказывает.
  function ruleDessert(meal) {
    const r = { id: 'dessert', title: 'Сладкое после основной еды' };
    if (meal.type !== 'dessert') return { ...r, state: 'na', text: 'Только для десерта.' };
    if (meal.afterMain === true) return { ...r, state: 'met', text: 'Вы отметили: сразу после основной еды.' };
    return { ...r, state: 'unknown', text: 'Не отмечено, что это сразу после основной еды. Это не нарушение.' };
  }

  function ruleFiber(meal, f) {
    const r = { id: 'fiber', title: 'Овощи или зелень в приёме' };
    if (!['lunch', 'dinner'].includes(meal.type)) return { ...r, state: 'na', text: 'Для обеда и ужина.' };
    if (f.hasFiber) return { ...r, state: 'met', text: 'Овощи, зелень или бобовые уже есть.' };
    // Неизвестное остаётся неизвестным, но добавить закуску можно в любом случае — это необязательное действие.
    if (f.hasMixed || f.unknownItems.length) return { ...r, state: 'unknown', text: 'В смешанном блюде могут быть овощи — данных не хватает.', action: 'add-veg', soft: 'Не знаем, есть ли в блюде овощи. Если хотите — добавьте небольшую овощную закуску в начало.' };
    return { ...r, state: 'opportunity', text: 'Любое количество овощей лучше, чем ничего: небольшая закуска перед едой.', action: 'add-veg' };
  }

  function ruleCombo(meal, f) {
    const r = { id: 'combo', title: 'Крахмал не в одиночку: с овощами, белком или жиром' };
    if (!['lunch', 'dinner'].includes(meal.type) || !(f.hasCarb || f.hasSweet)) return { ...r, state: 'na', text: 'Для обеда и ужина, где есть крахмал или сладкое.' };
    if (f.hasBase || f.hasFiber) return { ...r, state: 'met', text: 'Рядом с крахмалом есть клетчатка, белок или жир.' };
    if (f.hasMixed || f.unknownItems.length) return { ...r, state: 'unknown', text: 'Состав неизвестен — данных не хватает.' };
    return { ...r, state: 'opportunity', text: 'Можно добавить белок, немного жира или овощи.', action: 'add-base' };
  }

  function ruleOrder(meal, f, ctx) {
    const r = { id: 'order', title: 'Порядок: овощи → белок и жиры → крахмал и сладкое' };
    if (['dessert', 'snack'].includes(meal.type)) return { ...r, state: 'na', text: 'Для основных приёмов пищи.' };
    // В первом приёме сладкое оценивает правило «несладкая основа», чтобы не считать одно и то же дважды.
    // Неизвестный компонент проверяем раньше подсчёта известных: иначе неизвестность выглядела бы как «не применяется».
    if (f.unknownItems.length) return { ...r, state: 'unknown', text: `Уточните группу: ${names(f.unknownItems)}.` };
    const known = f.food.filter(i => !(meal.type === 'first' && isSweet(i)));
    const ranks = known.map(rankOf);
    const distinct = new Set(ranks);
    if (known.length < 2 || distinct.size < 2) return { ...r, state: 'na', text: 'Нужно хотя бы два компонента из разных групп.' };
    if (meal.orderStatus === 'unknown') return { ...r, state: 'unknown', text: 'Порядок не подтверждён или всё ели вместе — это не нарушение.' };
    const ok = ranks.every((v, i) => i === 0 || v >= ranks[i - 1]);
    if (ok) {
      const text = !f.hasMixed ? 'Компоненты расположены по порядку.'
        : f.hasFiber ? 'Доступные овощи сначала, смешанное блюдо не разбираем.'
        : 'Смешанное блюдо не разбираем; крахмал и сладкое — после него.';
      return { ...r, state: 'met', text };
    }
    const sorted = sortByRank(known, meal.type);
    const hint = `Например: ${sorted.map(i => i.name).join(' → ')}.`;
    if (ctx.phase === 'before') return { ...r, state: 'opportunity', text: hint, action: 'reorder' };
    return { ...r, state: 'opportunity', text: `Прошлое не меняем. В следующий раз — ${hint.charAt(0).toLowerCase()}${hint.slice(1)}` };
  }

  // Сортировка для подсказки всегда ставит сладкое последним, даже в первом приёме.
  function sortByRank(items) {
    return items.map((it, i) => ({ it, i, r: it.cat === 'drink' || it.cat === 'other' ? 99 : RANK[GROUP[it.cat]] }))
      .sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.it);
  }
  function sweetToEnd(items) {
    return [...items.filter(i => !isSweet(i)), ...items.filter(isSweet)];
  }

  const PRIORITY = ['first', 'snack', 'fiber', 'combo', 'order'];
  const ACTION_LABEL = {
    'add-veg': 'Добавить овощную закуску в начало',
    'add-base': 'Добавить белок или жир',
    'sweet-end': 'Перенести сладкое в конец',
    reorder: 'Расставить по порядку',
    'to-dessert': 'Сделать сладкое десертом'
  };

  /** meal: {type, items[{name,cat}], orderStatus, afterMain}; ctx: {phase:'before'|'after', limited} */
  function evaluate(meal, ctx = {}) {
    // Ограниченный режим: движок сам не выдаёт ни оценки, ни советов.
    if (ctx.limited) return { rules: [], applicable: 0, met: 0, unknown: 0, insufficient: false, suppressed: true, summary: '', advice: null };
    const f = facts(meal.items || []);
    if (!f.food.length) return { rules: [], applicable: 0, met: 0, unknown: 0, insufficient: true, summary: 'Недостаточно данных: добавьте компоненты', advice: null };
    const rules = [ruleFirst(meal, f), ruleSnack(meal, f), ruleDessert(meal), ruleFiber(meal, f), ruleCombo(meal, f), ruleOrder(meal, f, ctx)];
    const app = rules.filter(r => r.state !== 'na');
    const met = app.filter(r => r.state === 'met').length;
    const unknown = app.filter(r => r.state === 'unknown').length;
    const insufficient = app.length > 0 && unknown === app.length;
    let summary;
    if (!app.length) summary = 'Нет применимых правил';
    else if (insufficient) summary = 'Недостаточно данных';
    else summary = `Подтверждено ${met} из ${app.length} применимых${unknown ? ` · данных не хватает: ${unknown}` : ''}`;
    let advice = null;
    if (ctx.phase === 'before') {
      const ordered = PRIORITY.map(id => rules.find(r => r.id === id));
      const opp = ordered.find(r => r && r.state === 'opportunity' && r.action);
      const soft = ordered.find(r => r && r.state === 'unknown' && r.action);
      if (opp) advice = { ruleId: opp.id, action: opp.action, label: ACTION_LABEL[opp.action], text: opp.text };
      else if (soft) advice = { ruleId: soft.id, action: soft.action, label: ACTION_LABEL[soft.action], text: soft.soft, optional: true };
    }
    return { rules, applicable: app.length, met, unknown, insufficient, summary, advice };
  }

  /* Медиана веса: сначала медиана каждого дня, затем медиана этих дней за 7 календарных дней;
     нужно не меньше 3 дней с измерениями, чтобы частые взвешивания за один день не перевешивали. */
  function median(values) {
    const s = [...values].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function dayDiff(a, b) { return Math.round((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 86400000); }
  function median7(entries, endKey) {
    const win = entries.filter(e => { const d = dayDiff(endKey, e.date); return d >= 0 && d < 7; });
    const byDay = new Map();
    win.forEach(e => { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e.value); });
    if (byDay.size < 3) return null;
    return median([...byDay.values()].map(median));
  }

  return { evaluate, sortByRank, sweetToEnd, median7, dayDiff, GROUP, ACTION_LABEL };
})();
