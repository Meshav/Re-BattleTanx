import type * as THREE from "three";

export interface ViewFns<E> { create(e: E): THREE.Object3D; update(obj: THREE.Object3D, e: E): void }

/** Keep one Three object per entity id: create new, update live, drop gone. */
export function syncById<E extends { id: number }>(objs: Map<number, THREE.Object3D>, items: E[], parent: THREE.Object3D, fns: ViewFns<E>): void {
  const live = new Set<number>();
  for (const e of items) {
    live.add(e.id);
    let obj = objs.get(e.id);
    if (!obj) {
      obj = fns.create(e);
      objs.set(e.id, obj);
      parent.add(obj);
    }
    fns.update(obj, e);
  }
  for (const [id, obj] of objs) {
    if (live.has(id)) continue;
    parent.remove(obj);
    objs.delete(id);
  }
}
