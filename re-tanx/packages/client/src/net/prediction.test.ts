import { describe, expect, it } from "vitest";
import { createWorld, idleInput, parseMap, stepWorld } from "@re-tanx/sim";
import { createPrediction, predict, reconcile } from "./prediction.ts";

const map = parseMap({ id: "t", name: "t", cell: 10, rows: ["S........", "........."] });

describe("prediction", () => {
  it("replaying unacknowledged inputs on a server state lands where the client predicted", () => {
    const server = createWorld(map, [{ team: 0, kind: "m1" }]);
    const client = createWorld(map, [{ team: 0, kind: "m1" }]);
    const p = createPrediction();
    const drive = { ...idleInput(), throttle: 1, steer: 0.3 };
    for (let i = 0; i < 10; i++) predict(p, client, client.tanks[0], drive);
    // server has processed only the first 6
    for (let i = 0; i < 6; i++) {
      server.inputs[server.tanks[0]!.id] = drive;
      stepWorld(server);
    }
    const predicted = { ...client.tanks[0]!.pos };
    Object.assign(client.tanks[0]!, structuredClone(server.tanks[0]!));
    reconcile(p, client, client.tanks[0], 6);
    expect(p.pending).toHaveLength(4);
    expect(client.tanks[0]!.pos.x).toBeCloseTo(predicted.x, 5);
    expect(client.tanks[0]!.pos.y).toBeCloseTo(predicted.y, 5);
  });
});
