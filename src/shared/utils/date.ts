import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { transformNumberToWords } from './number'

export const TIMES = {
  AN_HOUR: 60 * 60 * 1000,
  A_DAY: 24 * 60 * 60 * 1000,
  A_WEEK: 7 * 24 * 60 * 60 * 1000,
}

export const formatDate = (date: Date): string =>
  format(date, 'dd/MM/yyyy', { locale: es })

export const formatDateTime = (date: Date): string =>
  format(date, 'dd/MM/yyyy HH:mm', { locale: es })

export const formatTime = (date: Date): string =>
  format(date, 'HH:mm', { locale: es })

export const formatDateText = (
  date: Date | string,
  formatStr = "d 'de' MMMM 'de' yyyy",
): string => {
  const dateObj = new Date(date)

  // chack if reduces 1 day because of timezone the db stores it as yyyy-MM-dd
  const isFormatedWithoutTime = date.toString().split('-').length === 3

  if (isFormatedWithoutTime) {
    const day = date.toString().split('-')[2]

    if (day !== dateObj.getDate().toString()) {
      dateObj.setDate(parseInt(day))
    }
  }

  return format(dateObj, formatStr, { locale: es })
}

export const formatWeekDayName = (date: Date): string =>
  format(date, 'EEEE', { locale: es })

export const formatMonthName = (date: Date): string =>
  format(date, 'MMMM', { locale: es })

export const formatHourMinutesText = (date: Date): string => {
  if (!date) return ''

  const hours = date.getHours()
  const minutes = date.getMinutes()

  return `${transformNumberToWords(hours)} ${
    hours === 1 ? 'hora' : 'horas'
  } y ${transformNumberToWords(minutes)} ${
    minutes === 1 ? 'minuto' : 'minutos'
  }`
}

export const addMinutesToDate = (date: Date, minutes: number): Date =>
  new Date(new Date(date).getTime() + minutes * 60000)

export const FIRST_DAY_OF_YEAR = new Date(new Date().getFullYear(), 0, 1)
export const LAST_DAY_OF_YEAR = new Date(new Date().getFullYear(), 11, 31)
