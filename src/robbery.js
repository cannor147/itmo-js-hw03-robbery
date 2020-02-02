'use strict';

/**
 * Флаг решения дополнительной задачи
 * @see README.md
 */
const isExtraTaskSolved = true;

const DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
const ACTOR_COUNT = 3;
const DEADLINE_DAY = 2;
const DELAY = 30;

/**
 * @param {Object} schedule Расписание Банды
 * @param {number} duration Время на ограбление в минутах
 * @param {Object} workingHours Время работы банка
 * @param {string} workingHours.from Время открытия, например, "10:00+5"
 * @param {string} workingHours.to Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
  /**
   * @param {string} data Форматированные дата и время
   * @returns {{timezone: number, time: number}}
   */
  const parseMoment = function(data) {
    const match = data.match(/^([А-Я]{2} )?(\d{2}):(\d{2})\+(\d+)$/);
    const day = typeof match[1] === 'undefined' ? 0 : DAYS.indexOf(match[0].substring(0, 2));
    const hour = Number(match[2]);
    const minute = Number(match[3]);
    const timezone = Number(match[4]);

    return { time: (day * HOURS_PER_DAY + hour) * MINUTES_PER_HOUR + minute, timezone: timezone };
  };

  const bankDailyFrom = parseMoment(workingHours.from);
  const bankDailyTo = parseMoment(workingHours.to);
  const bankTimezone = bankDailyFrom.timezone;
  const events = [];

  /**
   * @param {string} actor Имя объекта
   * @param {Object}from Начало промежутка
   * @param {Object}to Конец промежутка
   * @param {boolean} ready Готов ли объект в этот промежуток
   */
  const addEvent = function(actor, from, to, ready) {
    events.push({
      time: from.time + (bankTimezone - from.timezone) * MINUTES_PER_HOUR,
      actor: actor,
      ready: ready
    });
    events.push({
      time: to.time + (bankTimezone - to.timezone) * MINUTES_PER_HOUR,
      actor: actor,
      ready: !ready
    });
  };

  const robberyFrom = { time: 0, timezone: bankDailyFrom.timezone };
  const robberyTo = {
    time: (DEADLINE_DAY + 1) * MINUTES_PER_DAY,
    timezone: bankDailyFrom.timezone
  };
  addEvent('robbery', robberyFrom, robberyTo, true);

  for (let i = 0; i < DAYS.length; i++) {
    const bankFrom = { time: bankDailyFrom.time + i * MINUTES_PER_DAY, timezone: bankTimezone };
    const bankTo = { time: bankDailyTo.time + i * MINUTES_PER_DAY, timezone: bankTimezone };
    addEvent('bank', bankFrom, bankTo, true);
  }

  for (let i = 0; i < ACTOR_COUNT; i++) {
    const robberSchedule = Object.values(schedule)[i];
    for (const interval of robberSchedule) {
      const robberFrom = parseMoment(interval.from);
      const robberTo = parseMoment(interval.to);
      addEvent('robber#' + (i + 1), robberFrom, robberTo, false);
    }
  }

  events.sort((a, b) => a.time - b.time);
  const goodIntervals = [];

  let readyActors = ACTOR_COUNT;
  let currentTime = 0;
  for (const event of events) {
    const previousTime = currentTime;
    currentTime = event.time;
    if (readyActors === ACTOR_COUNT + 2 && currentTime - previousTime >= duration) {
      goodIntervals.push({ fromTime: previousTime, toTime: currentTime });
    }
    readyActors += event.ready ? 1 : -1;
  }

  let currentIntervalIndex = 0;
  let currentOffset = 0;

  return {
    /**
     * Найдено ли время
     * @returns {boolean}
     */
    exists() {
      return goodIntervals.length > 0;
    },

    /**
     * Возвращает отформатированную строку с часами
     * для ограбления во временной зоне банка
     *
     * @param {string} template
     * @returns {string}
     *
     * @example
     * ```js
     * getAppropriateMoment(...).format('Начинаем в %HH:%MM (%DD)') // => Начинаем в 14:59 (СР)
     * ```
     */
    format(template) {
      if (!this.exists()) {
        return '';
      }

      const time = goodIntervals[currentIntervalIndex].fromTime + currentOffset;
      const day = Math.floor(time / MINUTES_PER_DAY);
      const hour = Math.floor(time / MINUTES_PER_HOUR) % HOURS_PER_DAY;
      const minute = time % MINUTES_PER_HOUR;

      return template
        .replace(/%DD/g, DAYS[day])
        .replace(/%HH/g, ('0' + hour).slice(-2))
        .replace(/%MM/g, ('0' + minute).slice(-2));
    },

    /**
     * Попробовать найти часы для ограбления позже [*]
     * @note Не забудь при реализации выставить флаг `isExtraTaskSolved`
     * @returns {boolean}
     */
    tryLater() {
      if (!this.exists()) {
        return false;
      }

      const previousIntervalIndex = currentIntervalIndex;
      const currentInterval = goodIntervals[currentIntervalIndex];
      const availableDuration = currentInterval.toTime - currentInterval.fromTime - currentOffset;
      if (availableDuration - DELAY >= duration) {
        currentOffset += DELAY;

        return true;
      }
      currentIntervalIndex = Math.min(currentIntervalIndex + 1, goodIntervals.length - 1);
      currentOffset = 0;

      return currentIntervalIndex !== previousIntervalIndex;
    }
  };
}

module.exports = {
  getAppropriateMoment,

  isExtraTaskSolved
};
