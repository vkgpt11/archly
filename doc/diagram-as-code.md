# Diagram as code

Open a project canvas and select **Diagram as code** in the canvas toolbar. Source is saved with the project exactly as written, including comments and whitespace.

Editing works in both directions. Drawing valid source updates the canvas; moving, adding, deleting, renaming, connecting, or styling items on the canvas updates the saved source. A code-driven redraw keeps the source's comments and formatting until the canvas is changed again.

## Components and connections

```text
direction right

web client "Web App"
service api "Orders API"
postgresql db "Orders DB"

client.right -> api.left : "HTTPS"
api.right -> db.left : "SQL"
```

Directions are `right` and `down`. Connection ports are `left`, `right`, `top`, and `bottom`. Omitting ports uses `right -> left` or `bottom -> top`, based on the diagram direction.

Every icon ID in the component catalog is a valid component shorthand. Use the searchable **Component reference** inside the editor to find and insert one. The catalog ID `container` conflicts with the boundary keyword, so its icon shorthand is `icon-container`.

## Regions and containers

```text
region east "AWS · us-east-1" {
  container vpc "Production VPC" {
    aws-api-gateway gateway "API Gateway"
    aws-lambda orders "Orders"
    aws-rds database "Orders DB"

    gateway.right -> orders.left : "HTTPS"
    orders.right -> database.left : "SQL"
  }
}
```

Regions and containers may be nested. Moving an outer boundary moves all nested descendants and membership is retained when the project is saved.

## Variables and appearance

```text
let apiLabel = "Orders API"

service api "${apiLabel}"
database db "Orders DB"
api -> db : "SQL"

style api fill=#112233 border=#445566 text=#ddeeff description="Handles orders"
style-edge api->db color=#ff5500 line=dashed routing=straight
```

Colors use six-digit hexadecimal values. Edge routing is `straight`, `default`, or `smoothstep`. Notes and annotations use the normal `note` and `text` component types.

## Exact positions

```text
service api "Orders API"
position api x=240 y=120
```

`position` directives preserve canvas placement when source is generated from visual edits. Coordinates may be integers or decimals, including negative values.

## Editor controls

### Reusable templates

Use **Insert template example** to add a working example, or write:

```text
template ServiceStack(name, cache="Sessions") {
  container stack "${name}" {
    service api "${name} API"
    redis db "${cache}"
    api.right -> db.left : "cached reads"
  }
}
use ServiceStack orders(name="Orders")
use ServiceStack billing(name="Billing", cache="Billing cache")
orders__api -> billing__api : "calls"
```

Arguments are named, quoted strings. Parameters without a default are required.
Each call's instance name must be unique. Local component IDs are prefixed with
the instance name and `__`; for example, `api` becomes `orders__api`. Nested calls
add another prefix, such as `orders__child__api`. Templates may call templates
declared later in the source, but recursive calls are rejected. Template-local
variables are scoped to their instance. Styles, explicit connection ports,
regions, and position directives are supported inside templates.

Errors identify the original definition line and the call chain. Expansion is
limited to 32 nested calls, 1,000 total calls, and 10,000 output lines; source is
limited to 1,000,000 characters. Parameter newlines are rejected.

Drawing or live-previewing template source keeps its definitions and calls.
As with other source constructs, a subsequent visual canvas edit generates
expanded component declarations; it does not retain linked template instances.
Selection-to-template extraction and a managed template library are not yet
available.

### Rendering

### Advanced styling, layout, boundaries and connections

```text
layout {
  direction: left
  horizontal-spacing: 96
  vertical-spacing: 72
  rank-separation: 100
  routing: orthogonal
}
account cloud "Production AWS" {
  region east "us-east-1" {
    service api "Orders API"
    redis cache "Sessions"
  }
}
boundary east provider=aws identifier="us-east-1"
class node accent {
  fill: #ddeeff
  border-width: 2
}
style api class=accent shape=rounded width=180
style cache {
  opacity: 0.9
  icon: redis
}
connection lookup api.right -> cache.left : "Lookup"
style-edge lookup line=dotted width=2 start=none end=closed
metadata-edge lookup {
  protocol: TCP
  port: 6379
  async: false
  encrypted: true
  direction: forward
  description: "Session lookup"
}
```

Style blocks and single-line `key=value` directives are equivalent. Values with
spaces must be double-quoted. `class node NAME` and `class edge NAME` define
reusable styles; local properties override classes. Visual edits serialize the
resolved styles, not the original class/block formatting.

Node styles: six-digit hex `fill`, `border`, and `text`; catalog `icon`; `shape`
rectangle/rounded/ellipse; opacity 0–1; border-width 0–12; width 32–4000;
height 24–4000; boundary padding 8–200. Boundary dimensions are minimums and
grow to contain children. Explicit colours are retained across themes; choose
contrasting text/fill pairs. No semantic theme-token syntax is provided yet.
Connection styles: six-digit hex color, width 0.5–12, solid/dashed/dotted line,
straight/curved/smooth-step/orthogonal routing, and none/arrow/closed markers.

Layout engine version 1 supports right/left/down/up and spacing 16–1000.
Explicit `position` directives override automatic placement. Contradictory
pinned boundary/child positions report an error instead of dropping positions.
**Automatic layout** offers whole-canvas or selection scope (a selected
boundary includes descendants), a cancellable preview, and one undoable apply.
Applying explicitly replaces positions in the selected scope.

Boundary keywords: account (AWS), subscription (Azure), project (GCP), region,
zone, vpc, vnet (Azure), subnet, cluster, namespace. Providers inherit from the
parent. Explicit conflicting providers and invalid parent types are rejected.
Standalone boundaries are allowed when surrounding context is omitted; generic
containers provide grouping without provider constraints. Move/delete includes
descendants; boundary metadata persists with the diagram.

Named connections retain stable IDs, including parallel connections. Protocols:
HTTP, HTTPS, REST, GRPC, TCP, UDP, SQL, AMQP, MQTT, KAFKA, CUSTOM. Ports are
1–65535 or ordered inclusive ranges such as `8000-8100`; async/encrypted accept
true/false; direction is forward/reverse/bidirectional/none; descriptions have a
2000-character limit. The connection inspector edits these values. Marker
controls synchronize direction metadata.

### Text export compatibility

Export project offers Mermaid (`.mmd`), PlantUML (`.puml`), D2 (`.d2`), and
architecture metadata (`.archly-metadata.json`). Preview and compatibility
warnings appear before download; clipboard copying is optional. Generation is
local and does not send diagram contents to an external renderer.

Native supported subset: labelled rectangles, nested boundaries, directed,
bidirectional or undirected labelled connections, and node fill colours.
Mermaid also emits node border/text colours. Stable ASCII aliases encode node
IDs. Exact positions, icons, port handles, routing, advanced styles and semantic
metadata are not represented natively; a leading `archly-metadata:` JSON comment
preserves the complete durable model. Do not remove it if fidelity matters.
Destination applications are not expected to restore Archly-specific data.
Importing destination syntax into Archly is not implemented.

Metadata schema version 1 contains `format`, `version`, `schemaVersion`, `view`,
`environment`, `provenance`, `validation`, `nodes`, and `edges`. Node data retains
boundary semantics; edge data retains protocol/security metadata. `view` is
currently architecture, environment is null (variants are not implemented),
and validation status is `not-run` rather than an invented policy result.
Output is UTF-8, LF, deterministic and sorted by stable IDs. Selection export
includes endpoints of selected connections and removes parents outside scope.

### Drawing and errors

- Select **Draw diagram** or press `Ctrl+Enter` / `Cmd+Enter` to render.
- Enable **Live preview** to render valid source after a 500 ms pause.
- Parser errors identify and highlight the failing line without replacing the last valid canvas.
- Use `#` or `//` for comments.
