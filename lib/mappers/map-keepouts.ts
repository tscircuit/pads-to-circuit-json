import type { AnyCircuitElement } from "circuit-json"
import type { ConversionContext } from "../internal/conversion-context"
import {
  nanometersToMillimeters,
  toCircuitJsonPoint,
  toStableCircuitJsonId,
} from "../internal/coordinates"
import {
  createApproximationDiagnostic,
  createInferredDiagnostic,
  createSkippedDiagnostic,
} from "../internal/diagnostics"
import { getCircuitJsonLayer, layerWasDefaultedToTop } from "../internal/layers"
import { pathHasArcs, pathToPolylinePoints } from "../internal/path-to-polyline"
import {
  getAxisAlignedRectangle,
  withoutRepeatedClosingPoint,
} from "../internal/polygon"

const addRestrictionsDiagnostic = ({
  context,
  entity,
  circuitJsonId,
}: {
  context: ConversionContext
  entity: {
    id?: string
    source?: ConversionContext["documentSource"]
    restrictions?: string
  }
  circuitJsonId: string
}): void => {
  if (!entity.restrictions) {
    context.diagnostics.push(
      createInferredDiagnostic({
        code: "circuit-json-keepout-restriction-scope-unavailable",
        message:
          "PADS normalized geometry did not expose a restriction category; mapped the shape as a general Circuit JSON layer keepout",
        entity,
        circuitJsonIds: [circuitJsonId],
        fallbackSource: context.documentSource,
      }),
    )
    return
  }
  context.diagnostics.push(
    createApproximationDiagnostic({
      code: "circuit-json-keepout-restrictions-approximated",
      message: `Mapped PADS keepout restrictions ${JSON.stringify(entity.restrictions)} to a general Circuit JSON layer keepout`,
      entity,
      circuitJsonIds: [circuitJsonId],
      fallbackSource: context.documentSource,
    }),
  )
}

const addKeepoutLayerDiagnostics = ({
  context,
  path,
  keepoutId,
}: {
  context: ConversionContext
  path: ConversionContext["geometry"]["paths"][number]
  keepoutId: string
}): void => {
  if (layerWasDefaultedToTop(path)) {
    context.diagnostics.push(
      createInferredDiagnostic({
        code: "circuit-json-keepout-layer-defaulted-to-top",
        message:
          "Mapped a PADS keepout with normalized layer 0 to the top layer; verify the original line-section level",
        entity: path,
        circuitJsonIds: [keepoutId],
        fallbackSource: context.documentSource,
      }),
    )
  }
  addRestrictionsDiagnostic({
    context,
    entity: path,
    circuitJsonId: keepoutId,
  })
}

export const mapKeepouts = (context: ConversionContext): void => {
  for (const [index, path] of context.geometry.paths.entries()) {
    if (path.kind !== "keepout") continue
    context.handledPaths.add(path)
    const layer = getCircuitJsonLayer(path.layer, context.geometry.layerCount)
    if (!layer) {
      context.diagnostics.push(
        createSkippedDiagnostic({
          code: "circuit-json-keepout-path-not-exactly-representable",
          message:
            "Skipped a keepout path because its PADS layer has no Circuit JSON mapping",
          entity: path,
          fallbackSource: context.documentSource,
        }),
      )
      continue
    }

    const keepoutId = toStableCircuitJsonId(
      "pcb_keepout",
      path.source?.sourceId,
      index,
    )
    const rectangle = path.closed
      ? getAxisAlignedRectangle(path.points)
      : undefined

    if (rectangle) {
      context.circuitJson.push({
        type: "pcb_keepout",
        pcb_keepout_id: keepoutId,
        shape: "rect",
        center: toCircuitJsonPoint(rectangle.center),
        width: nanometersToMillimeters(rectangle.width),
        height: nanometersToMillimeters(rectangle.height),
        layers: [layer],
        description: path.name,
      } as AnyCircuitElement)
      context.mappedEntities.add(path)
      addKeepoutLayerDiagnostics({ context, path, keepoutId })
      continue
    }

    const outline = withoutRepeatedClosingPoint(pathToPolylinePoints(path))
    if (!path.closed || outline.length < 3) {
      context.diagnostics.push(
        createSkippedDiagnostic({
          code: "circuit-json-keepout-path-not-exactly-representable",
          message:
            "Skipped a keepout path because it is open or has fewer than three vertices",
          entity: path,
          fallbackSource: context.documentSource,
        }),
      )
      continue
    }

    context.circuitJson.push({
      type: "pcb_keepout",
      pcb_keepout_id: keepoutId,
      shape: "outline",
      outline: outline.map(toCircuitJsonPoint),
      stroke_width: nanometersToMillimeters(path.width),
      layers: [layer],
      description: path.name,
    } as AnyCircuitElement)
    context.mappedEntities.add(path)
    if (pathHasArcs(path)) {
      context.diagnostics.push(
        createApproximationDiagnostic({
          code: "circuit-json-keepout-arcs-segmented",
          message:
            "Segmented circular keepout arcs into Circuit JSON outline edges at no more than five degrees per segment",
          entity: path,
          circuitJsonIds: [keepoutId],
          fallbackSource: context.documentSource,
        }),
      )
    }
    addKeepoutLayerDiagnostics({ context, path, keepoutId })
  }

  for (const [index, circle] of context.geometry.circles.entries()) {
    if (circle.kind !== "keepout") continue
    context.handledCircles.add(circle)
    const layer = getCircuitJsonLayer(circle.layer, context.geometry.layerCount)
    if (!layer) {
      context.diagnostics.push(
        createSkippedDiagnostic({
          code: "circuit-json-keepout-circle-layer-unavailable",
          message:
            "Skipped a circular keepout because its PADS layer has no Circuit JSON mapping",
          entity: circle,
          fallbackSource: context.documentSource,
        }),
      )
      continue
    }

    const keepoutId = toStableCircuitJsonId(
      "pcb_keepout",
      circle.source?.sourceId,
      index,
    )
    context.circuitJson.push({
      type: "pcb_keepout",
      pcb_keepout_id: keepoutId,
      shape: "circle",
      center: toCircuitJsonPoint(circle.center),
      radius: nanometersToMillimeters(circle.radius),
      layers: [layer],
      description: circle.name,
    } as AnyCircuitElement)
    context.mappedEntities.add(circle)
    addRestrictionsDiagnostic({
      context,
      entity: circle,
      circuitJsonId: keepoutId,
    })
  }
}
