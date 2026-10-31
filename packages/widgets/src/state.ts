/**
 * Widget-local state by stableId — ported near-verbatim from flying-pan.
 * Named variants exist for shared state (radio groups) independent of
 * stableId. `destroy` is called by the reconciler on unmount.
 */
export interface StateForOptions<T> {
  stableId: number;
  initial: T;
}

export interface SetStateOptions<T> {
  stableId: number;
  value: T;
}

export interface StateForByNameOptions<T> {
  name: string;
  initial: T;
}

export interface SetStateByNameOptions<T> {
  name: string;
  value: T;
}

export class StateStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly store = new Map<number, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly namedStore = new Map<string, any>();

  public stateFor<T>(options: StateForOptions<T | (() => T)>): T {
    const { stableId, initial } = options;
    const existing = this.store.get(stableId);

    if (existing !== undefined) {
      return existing as T;
    }

    const created = typeof initial === "function" ? (initial as () => T)() : initial;
    this.store.set(stableId, created);

    return created;
  }

  public setState<T>(options: SetStateOptions<T>): void {
    this.store.set(options.stableId, options.value);
  }

  public stateForByName<T>(options: StateForByNameOptions<T | (() => T)>): T {
    const { name, initial } = options;
    const existing = this.namedStore.get(name);

    if (existing !== undefined) {
      return existing as T;
    }

    const created = typeof initial === "function" ? (initial as () => T)() : initial;
    this.namedStore.set(name, created);

    return created;
  }

  public setStateByName<T>(options: SetStateByNameOptions<T>): void {
    this.namedStore.set(options.name, options.value);
  }

  public destroy(stableId: number): void {
    this.store.delete(stableId);
  }

  public destroyByName(name: string): void {
    this.namedStore.delete(name);
  }

  public clear(): void {
    this.store.clear();
    this.namedStore.clear();
  }
}
