import { MouseSensor, TouchSensor } from '@dnd-kit/core'

/**
 * dnd-kit breekt een sleepactie af bij elke `resize` van het venster. Op iPhone/iPad gebeurt dat
 * tijdens het slepen vanzelf: Safari klapt de adresbalk in of uit zodra de pagina beweegt. Gevolg:
 * je taak "laat los". Deze sensoren negeren resizes en loze zichtbaarheids-events (pagina is nog
 * gewoon zichtbaar); echt van app wisselen, touchcancel en Escape breken het slepen nog steeds af.
 */
type CancelFn = (this: unknown, event?: Event) => void

function ignoreResize<T extends { prototype: object }>(Sensor: T, Base: { prototype: object }) {
  const original = (Base.prototype as { handleCancel: CancelFn }).handleCancel
  // handleCancel is in de typings 'private', maar wordt in de constructor via het prototype gebonden.
  Object.defineProperty(Sensor.prototype, 'handleCancel', {
    configurable: true,
    writable: true,
    value: function (this: unknown, event?: Event) {
      if (event?.type === 'resize') return
      if (event?.type === 'visibilitychange' && document.visibilityState === 'visible') return
      return original.call(this, event)
    },
  })
  return Sensor
}

export const SteadyTouchSensor = ignoreResize(class SteadyTouchSensor extends TouchSensor {}, TouchSensor)
export const SteadyMouseSensor = ignoreResize(class SteadyMouseSensor extends MouseSensor {}, MouseSensor)
