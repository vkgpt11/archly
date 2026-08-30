# Diagram as code

Open a project canvas and select **Diagram as code** in the canvas toolbar. Source is saved with the project exactly as written, including comments and whitespace.

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

## Editor controls

- Select **Draw diagram** or press `Ctrl+Enter` / `Cmd+Enter` to render.
- Enable **Live preview** to render valid source after a 500 ms pause.
- Parser errors identify and highlight the failing line without replacing the last valid canvas.
- Use `#` or `//` for comments.
