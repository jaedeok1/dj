export interface ControlEntry {
  id:       string
  type:     'slider-h' | 'slider-v' | 'knob'
  label:    string
  min:      number
  max:      number
  getValue: () => number
  setValue: (v: number) => void
  getRect:  () => DOMRect | null
}

const registry = new Map<string, ControlEntry>()

export const controlRegistry = {
  register:   (id: string, entry: ControlEntry) => { registry.set(id, entry) },
  unregister: (id: string) => { registry.delete(id) },
  getAll:     (): ControlEntry[] => Array.from(registry.values()),
  get:        (id: string): ControlEntry | undefined => registry.get(id),
}
