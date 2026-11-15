# Diagnostic reference

Diagnostics are stable machine-readable records. Match on `code`, `severity`,
and `category`; message wording may improve without a schema-version change.
When available, `source` locates the PADS section and line/byte span,
`entityIds` identifies normalized `padsts` geometry, and `circuitJsonIds`
identifies emitted approximations.

Parser diagnostics produced by `padsts` pass through unchanged. The adapter
adds the codes below.

## Board and layers

| Code | Meaning and remediation |
| --- | --- |
| `circuit-json-board-outline-unavailable` | No usable closed outline exists. Repair or decode the PADS board outline before fabrication. |
| `circuit-json-board-arcs-segmented` | Board arcs became polygon edges at 5° or less. Inspect the outline or tighten the adapter tolerance in a future option. |
| `circuit-json-board-cutout-arcs-segmented` | Cutout arcs became polygon edges at 5° or less. Inspect the focused cutout snapshot before fabrication. |
| `circuit-json-board-circle-not-contained` | A circular BOARD piece lies outside or crosses the selected outer outline, so it was not inferred as a cutout. Verify panelization and board-outline intent. |
| `circuit-json-additional-board-outline-not-a-cutout` | An extra BOARD contour is open or not contained by the selected outer outline. Verify whether it is a panel outline or malformed cutout. |
| `circuit-json-layer-stack-partially-named` | The board has more than eight inner layers. The count is retained, but later inner-layer names require Circuit JSON support. |

## Components, pads, holes, and vias

| Code | Meaning and remediation |
| --- | --- |
| `circuit-json-duplicate-component-reference` | A repeated reference designator was skipped. Make references unique in the source. |
| `circuit-json-component-bounds-unavailable` | Component footprint bounds could not be derived. Improve decal decoding in `padsts`. |
| `circuit-json-source-component-type-inferred` | The generic `simple_chip` source type was inferred. Supply part semantics in a later mapping stage. |
| `circuit-json-pad-layer-unavailable` | The pad's layer has no Circuit JSON name. Check the layer stack or target-schema limit. |
| `circuit-json-pad-component-reference-unresolved` | The pad points to a component that was not emitted. Resolve the source placement/decal reference. |
| `circuit-json-hole-component-reference-unresolved` | A component drill/slot has no emitted owner. Resolve the placement reference. |
| `circuit-json-undrilled-via-not-represented` | A via lacks a decoded drill diameter. Decode or repair the via stack. |
| `circuit-json-via-layers-unavailable` | A via span cannot be named in Circuit JSON. Check its start/end layers and the target layer limit. |
| `circuit-json-via-pad-stack-approximated` | Per-layer via pads collapsed to one circular maximum diameter. Review annular rings and clearances. |
| `circuit-json-via-net-association-not-represented` | The via's net is known but no routed PCB trace was emitted for that net, so `pcb_via.pcb_trace_id` cannot be populated. Preserve the report alongside output. |

## Copper, keepouts, and artwork

| Code | Meaning and remediation |
| --- | --- |
| `circuit-json-route-not-exactly-representable` | A route lacks usable width, points, or layer. Repair the source or add target-layer support. |
| `circuit-json-route-arcs-segmented` | Route arcs became line segments at 5° or less. Inspect the focused snapshot. |
| `circuit-json-copper-curves-segmented` | Copper-region arcs/circles became polygon edges at 5° or less. Inspect pour clearances. |
| `circuit-json-copper-boundary-stroke-omitted` | The filled copper was emitted but its separate boundary stroke was not. Model it separately if electrically meaningful. |
| `circuit-json-copper-layer-defaulted-to-top` | Normalized layer 0 was rendered as top copper. Verify the original PADS line-section level before fabrication. |
| `circuit-json-thermal-relief-ground-plane-unavailable` | A decoded RT/ST thermal relief was retained in mapping coverage but not emitted because Circuit JSON requires a verified `pcb_ground_plane` owner. Decode the PADS plane association before emitting `pcb_thermal_spoke`. |
| `circuit-json-antipad-not-represented` | A decoded RA/SA antipad was retained in mapping coverage but not emitted because Circuit JSON has no standalone antipad entity and the owning plane is not verified. |
| `circuit-json-keepout-path-not-exactly-representable` | The keepout is open, has fewer than three vertices, or has no mapped Circuit JSON layer. Closed non-rectangular polygons are emitted as `shape: "outline"` keepouts. |
| `circuit-json-keepout-arcs-segmented` | Keepout arcs became outline edges at 5° or less. Inspect the polygon before using it as a fabrication keepout. |
| `circuit-json-keepout-circle-layer-unavailable` | A circular keepout has no target layer. Repair or extend the layer mapping. |
| `circuit-json-keepout-restrictions-approximated` | PADS route/via/placement restrictions collapsed to a general layer keepout. Read the source restriction from the diagnostic. |
| `circuit-json-keepout-restriction-scope-unavailable` | `padsts` did not expose the restriction category, so the adapter inferred a general layer keepout. Verify the source intent. |
| `circuit-json-keepout-layer-defaulted-to-top` | Normalized layer 0 was rendered as a top-layer keepout. Verify the original PADS line-section level. |
| `circuit-json-silkscreen-component-unavailable` | Component silkscreen has no emitted owner. Resolve the placement reference. |
| `circuit-json-silkscreen-arcs-segmented` | Silkscreen arcs became line segments. Inspect the focused snapshot. |
| `circuit-json-silkscreen-text-component-unavailable` | Component-owned label or static footprint text has no emitted PCB component owner. Resolve footprint bounds and placement mapping. |
| `circuit-json-silkscreen-text-font-approximated` | Component-owned text was emitted with `tscircuit2024`; compare the focused snapshot because the source PADS stroke font and stroke width are not representable. |
| `circuit-json-fabrication-component-unavailable` | Fabrication artwork has no emitted owner. Resolve the placement reference. |
| `circuit-json-fabrication-curves-segmented` | Fabrication arcs/circles became line segments. Inspect the focused snapshot. |

Unhandled normalized geometry uses
`circuit-json-<kind>-path-not-represented` or
`circuit-json-<kind>-circle-not-represented`. Text, unassigned vertices,
unverified connections, and unverified vias use the corresponding
`circuit-json-*-not-represented` code. These require additional mapping or
upstream decoding; they are never treated as lossless.

## Output integrity and strict mode

| Code | Meaning and remediation |
| --- | --- |
| `circuit-json-emitted-element-invalid` | An element failed the installed Circuit JSON schema and was removed. Treat this as an adapter defect or dependency incompatibility. |
| `circuit-json-duplicate-element-id` | A duplicate Circuit JSON ID was removed. Treat this as an adapter defect. |
| `circuit-json-dangling-reference` | An emitted ID reference has no target. Treat this as an adapter defect or incomplete source reference. |
| `strict-circuit-json-conversion-would-be-lossy` | Strict mode found parser loss, skipped data, or an approximation. Inspect all preceding diagnostics; partial output remains available. |
