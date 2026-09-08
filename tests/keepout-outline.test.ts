import { expect, test } from "bun:test"
import { convertPadsToCircuitJson } from "../lib"

const polygonKeepoutBoard = `!PADS-POWERPCB-V9.5-MILS! DESIGN DATABASE ASCII FILE 1.0
*PCB*
MAXIMUMLAYER 2
*LINES*
BOARD_OUTLINE BOARD 0 0 1 0
CLOSED 5 4 0 0
0 0
400 0
400 300
0 300
0 0
POLY_KO KEEPOUT 0 0 1 0
CLOSED 4 10 0 0
50 40
250 40
150 220
50 40
KEEPOUT_RECT KEEPOUT 0 0 1 0
CLOSED 5 10 0 0
280 40
360 40
360 120
280 120
280 40
*END*
`

test("emits Circuit JSON outline keepouts for closed non-rectangular PADS polygons", () => {
  const { circuitJson, report } = convertPadsToCircuitJson(polygonKeepoutBoard)
  const keepouts = circuitJson.filter(({ type }) => type === "pcb_keepout")

  expect(keepouts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "pcb_keepout",
        shape: "outline",
        description: "POLY_KO",
        layers: ["top"],
        stroke_width: 0.254,
        outline: [
          { x: 1.27, y: 1.016 },
          { x: 6.35, y: 1.016 },
          { x: 3.81, y: 5.588 },
        ],
      }),
      expect.objectContaining({
        type: "pcb_keepout",
        shape: "rect",
        description: "KEEPOUT_RECT",
        layers: ["top"],
        width: 2.032,
        height: 2.032,
        center: { x: 8.128, y: 2.032 },
      }),
    ]),
  )
  expect(keepouts).toHaveLength(2)
  expect(report.diagnostics).not.toContainEqual(
    expect.objectContaining({
      code: "circuit-json-keepout-path-not-exactly-representable",
    }),
  )
  expect(report.diagnostics).not.toContainEqual(
    expect.objectContaining({
      code: "circuit-json-emitted-element-invalid",
    }),
  )
})
