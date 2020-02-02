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
 * @param {string} data Форматированные дата и время
 * @returns {{timezone: number, time: number}}
 */
const parseMoment = function(data) {
  const tokens = data.match(/^([А-Я]{2} )?(\d{2}):(\d{2})\+(\d+)$/);
  const day = typeof tokens[1] === 'undefined' ? 0 : DAYS.indexOf(tokens[0].substring(0, 2));
  const hour = Number(tokens[2]);
  const minute = Number(tokens[3]);
  const timezone = Number(tokens[4]);

  return { time: (day * HOURS_PER_DAY + hour) * MINUTES_PER_HOUR + minute, timezone: timezone };
};

class Scheduler extends Array {
  /**
   * @param timezone Основной часовой пояс
   */
  constructor(timezone) {
    super();
    this.timezone = timezone;
  }

  /**
   * @param {string} options.actor Имя объекта
   * @param {Object} options.from Начало промежутка
   * @param {Object} options.to Конец промежутка
   * @param {boolean} options.ready Готов ли объект в этот промежуток
   */
  addEvent(options) {
    this.push({
      time: options.from.time + (this.timezone - options.from.timezone) * MINUTES_PER_HOUR,
      actor: options.actor,
      ready: options.ready
    });
    this.push({
      time: options.to.time + (this.timezone - options.to.timezone) * MINUTES_PER_HOUR,
      actor: options.actor,
      ready: !options.ready
    });
  }
}

/**
 * @param {Object} schedule Расписание Банды
 * @param {number} duration Время на ограбление в минутах
 * @param {Object} workingHours Время работы банка
 * @param {string} workingHours.from Время открытия, например, "10:00+5"
 * @param {string} workingHours.to Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
function getAppropriateMoment(schedule, duration, workingHours) {
  const bankDailyFrom = parseMoment(workingHours.from);
  const bankDailyTo = parseMoment(workingHours.to);
  const { timezone: bankTimezone } = bankDailyFrom;
  const scheduler = new Scheduler(bankTimezone);

  scheduler.addEvent({
    actor: 'robbery',
    from: { time: 0, timezone: bankTimezone },
    to: { time: (DEADLINE_DAY + 1) * MINUTES_PER_DAY, timezone: bankTimezone },
    ready: true
  });

  for (let i = 0; i < DAYS.length; i++) {
    scheduler.addEvent({
      actor: 'bank',
      from: { time: bankDailyFrom.time + i * MINUTES_PER_DAY, timezone: bankTimezone },
      to: { time: bankDailyTo.time + i * MINUTES_PER_DAY, timezone: bankTimezone },
      ready: true
    });
  }

  for (let i = 0; i < ACTOR_COUNT; i++) {
    const robberSchedule = Object.values(schedule)[i];
    for (const interval of robberSchedule) {
      scheduler.addEvent({
        actor: 'robber#' + (i + 1),
        from: parseMoment(interval.from),
        to: parseMoment(interval.to),
        ready: false
      });
    }
  }

  scheduler.sort((a, b) => a.time - b.time);
  const goodIntervals = [];
  let readyActors = ACTOR_COUNT;
  let currentTime = 0;

  for (const event of scheduler) {
    const previousTime = currentTime;
    currentTime = event.time;

    if (readyActors === ACTOR_COUNT + 2 && currentTime - previousTime >= duration) {
      goodIntervals.push({ fromTime: previousTime, toTime: currentTime });
    }
    readyActors += event.ready ? 1 : -1;
  }

  return {
    intervalIndex: 0,
    offset: 0,

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

      const time = goodIntervals[this.intervalIndex].fromTime + this.offset;
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

      const previousIntervalIndex = this.intervalIndex;
      const currentInterval = goodIntervals[this.intervalIndex];
      const availableDuration = currentInterval.toTime - currentInterval.fromTime - this.offset;
      if (availableDuration - DELAY >= duration) {
        this.offset += DELAY;

        return true;
      }
      this.intervalIndex = Math.min(this.intervalIndex + 1, goodIntervals.length - 1);
      this.offset = 0;

      return this.intervalIndex !== previousIntervalIndex;
    }
  };
}

module.exports = {
  getAppropriateMoment,

  isExtraTaskSolved
};
