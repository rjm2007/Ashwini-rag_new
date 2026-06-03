# Docling JSON Structure Reference (for LLM / downstream ingestion)

> **Source file:** `output/1172_WARRENTY_docling_raw.json`  
> **API:** `POST http://localhost:5001/v1/convert/file` (official `quay.io/docling-project/docling-serve`)  
> **Document:** Volvo VDA+ warranty export PDF, 2 pages, OCR enabled

---

## 1. Top-level wrapper (our saved file)

Our `extract_pdf.py` saves **two** top-level objects:

```json
{
  "report": { ... },   // human-readable summary we derived (NOT from Docling)
  "raw": { ... }        // actual docling-serve API response (USE THIS for ingestion)
}
```

### 1.1 `raw` — docling-serve API response (canonical)

**Actual top-level keys on `raw` (1172 file):**

`document`, `status`, `errors`, `processing_time`, `timings`

```json
{
  "status": "success",
  "processing_time": 13.26,
  "timings": { ... },
  "errors": [],
  "document": {
    "filename": "1172 WARRENTY.pdf",
    "md_content": "# markdown string with embedded base64 images ...",
    "json_content": { /* DoclingDocument — see Section 2 */ },
    "html_content": "",
    "text_content": "# same as md roughly, plain export ...",
    "doctags_content": ""
  }
}
```

| Field | Meaning |
|-------|---------|
| `status` | `success` \| `partial_success` \| `failure` |
| `processing_time` | Seconds Docling spent converting |
| `document.md_content` | Full document as **Markdown** (tables as `\| col \|` pipes, images as `![Image](data:image/png;base64,...)` ) |
| `document.json_content` | **Structured tree** — use for programmatic ingestion |
| `document.text_content` | Flat text export (often mirrors md) |

**For warranty ingestion:** Prefer `json_content` for tables/VIN/labels; use `md_content` or `text_content` only as a fallback or for full-text search.

---

## 2. `json_content` — DoclingDocument schema

Root object inside `raw.document.json_content`:

```json
{
  "schema_name": "DoclingDocument",
  "version": "1.10.0",
  "name": "1172 WARRENTY",
  "origin": {
    "mimetype": "application/pdf",
    "filename": "1172 WARRENTY.pdf",
    "binary_hash": 16621975368611559429
  },
  "furniture": { /* layout chrome, rarely needed */ },
  "body": { /* READING ORDER + hierarchy root */ },
  "groups": [ /* logical groupings of text items */ ],
  "texts": [ /* all text nodes — indexed array */ ],
  "tables": [ /* structured tables — indexed array */ ],
  "pictures": [ /* images/logos with bbox */ ],
  "pages": { "1": { "size": { "width", "height" } }, "2": { ... } },
  "key_value_items": [ /* optional form key-value pairs */ ],
  "form_items": [ /* optional form fields */ ]
}
```

**1172 counts:** `texts`=38, `tables`=2, `pictures`=4, `groups`=2, `body.children`=20

### Mental model

```
DoclingDocument
├── body.children[]     → ordered list of $ref pointers (document flow)
├── texts[i]            → text node #i (lookup by "#/texts/i")
├── tables[j]           → table node #j (lookup by "#/tables/j")
├── groups[k]           → group node (bundles children)
└── pictures[m]         → image regions
```

**Critical:** Content is **not** only in `body`. Full data lives in **`texts[]` and `tables[]` arrays**. `body.children` is the **reading order / hierarchy**.

---

## 3. Reference system (`$ref`)

Every node has:

```json
"self_ref": "#/texts/5",
"parent": { "$ref": "#/body" }
```

- `body.children` = `[{"$ref":"#/texts/0"}, {"$ref":"#/texts/1"}, ..., {"$ref":"#/tables/0"}, ...]`
- To resolve: `texts[5]` matches `"$ref": "#/texts/5"`

**Ingestion pattern:**

```python
def resolve(ref: str, doc: dict):
    # "#/texts/5" → doc["texts"][5]
    kind, idx = ref.split("/")[-2:]  # "texts", "5"
    return doc[kind][int(idx)]
```

---

## 4. Text nodes (`texts[]`)

Each element:

```json
{
  "self_ref": "#/texts/19",
  "parent": { "$ref": "#/body" },
  "children": [],
  "content_layer": "body",
  "label": "text",
  "prov": [
    {
      "page_no": 1,
      "bbox": { "l": ..., "t": ..., "r": ..., "b": ..., "coord_origin": "BOTTOMLEFT" },
      "charspan": [0, 17]
    }
  ],
  "orig": "4V4NC9EH1LN218380",
  "text": "4V4NC9EH1LN218380",
  "formatting": null,
  "hyperlink": null
}
```

### 4.1 Important `label` values (text classification)

| `label` | Meaning | Example from 1172 PDF |
|---------|---------|------------------------|
| `page_header` | Header/footer | `"VDA+"`, `"Page 1 of 2"` |
| `section_header` | Section title | `"Coverage Information"`, `"Add Coverage"` |
| `text` | Body text / field values | `"Volvo Truck"`, `"218380"`, `"4V4NC9EH1LN218380"` |
| `caption` | Caption under figures/tables | rare |
| `footnote` | Footnotes | rare |

**Warranty PDF pattern:** Vehicle fields are many separate `text` nodes (not one block):

```
text: "Brand"     →  text: "Volvo Truck"
text: "Chassis ID" → text: "NR" → text: "218380"
text: "VIN"        → text: "4V4NC9EH1LN218380"
```

### 4.2 `prov` (provenance)

- `page_no`: 1-based page number
- `bbox`: bounding box on page (coordinates depend on `coord_origin`)
- Use to map text → page for citations

### 4.3 Fields to read for ingestion

| Field | Use |
|-------|-----|
| `text` or `orig` | OCR text (usually identical) |
| `label` | Is it a heading vs body? |
| `prov[0].page_no` | Page number |

---

## 5. Table nodes (`tables[]`)

Each table:

```json
{
  "self_ref": "#/tables/0",
  "parent": { "$ref": "#/body" },
  "label": "table",
  "prov": [{ "page_no": 1, "bbox": { ... } }],
  "data": {
    "table_cells": [
      {
        "text": "Coverage",
        "row_span": 1,
        "col_span": 1,
        "start_row_offset_idx": 0,
        "end_row_offset_idx": 1,
        "start_col_offset_idx": 0,
        "end_col_offset_idx": 1,
        "column_header": true,
        "row_header": false,
        "bbox": { "l", "t", "r", "b", "coord_origin": "TOPLEFT" }
      },
      {
        "text": "U030",
        "start_row_offset_idx": 5,
        "end_row_offset_idx": 6,
        "start_col_offset_idx": 0,
        "column_header": false
      },
      {
        "text": "BREAKDOWN CLAIM JOB(DC10) Frame & Crossmembers, 72 Months/750,000 Miles ...",
        "start_row_offset_idx": 5,
        "start_col_offset_idx": 1
      }
    ]
  }
}
```

### 5.1 Reconstructing rows

- Grid is sparse: each cell knows `(start_row_offset_idx, start_col_offset_idx)` and spans.
- **Coverage code** often in column 0 (`U030`, `U06`, `TOW4`, …).
- **Description** in column 1 (long string).
- **Start / End dates** in columns 2–3 (often `00-00 0000` placeholders when missing).

**1172 PDF:** `tables/0` has **99 cells** (main warranty grid, page 1).  
`tables/1` has **22 cells** (continuation, page 2).

### 5.2 Markdown mirror of same table

`md_content` contains the same data as a pipe table:

```markdown
| Coverage | Description | Start | End | Details in UCHP |
| U030 | Frame & Crossmembers, 72 Months/750,000 Miles ... | 00-00 0000-00-00 | 00-00 0000-00-00 | |
| U06 | Standard Engine Warranty: 24 months/250,000 Miles ... | ... | ... | |
```

Use **either** `tables[].data.table_cells` **or** parse `md_content` — not both unless cross-checking.

---

## 6. Body hierarchy (`body.children`)

Reading order for 1172 WARRENTY (simplified):

```
#/texts/0      VDA+ header
#/texts/1      Page 1 of 2
#/pictures/0   logo image
#/texts/2      "Vehicle Data Administration"
#/groups/0     bundle of form field texts
#/pictures/1
#/texts/25     "Add Coverage"
#/pictures/2
#/texts/28
#/tables/0     MAIN COVERAGE TABLE (page 1)
#/groups/1
#/texts/31-34  page 2 headers
#/pictures/3
#/tables/1     table continuation (page 2)
#/texts/36-37
```

**`groups[]`** — intermediate nodes that group related `texts` (e.g. all vehicle ID fields):

```json
{
  "self_ref": "#/groups/0",
  "parent": { "$ref": "#/body" },
  "children": [
    { "$ref": "#/texts/3" },
    { "$ref": "#/texts/4" },
    ...
  ]
}
```

---

## 7. Pictures (`pictures[]`)

Screenshots, logos, UI chrome. Each has `prov[].bbox` and often no extractable text (OCR picks text separately in `texts[]`).

- `md_content` embeds them as huge base64 `![Image](data:image/png;base64,...)`
- **Do not** use pictures for warranty logic unless you need image regions.

---

## 8. Three output formats compared

| Format | Location | Best for |
|--------|----------|----------|
| **JSON** | `document.json_content` | Tables, labels, page+bbox, programmatic row rebuild |
| **Markdown** | `document.md_content` | Human review, quick full-doc read, pipe tables |
| **Plain text** | `document.text_content` | Embedding full-document (loses table structure) |

---

## 9. OCR / processing settings used

These were sent as form fields to `/v1/convert/file`:

```
do_ocr=true
force_ocr=false
table_mode=fast
do_table_structure=true
pdf_backend=docling_parse
to_formats=json, md, text
```

- **OCR:** Enabled (`do_ocr=true`) — reads text from PDF text layer + bitmap where needed.
- **Tables:** Structure detection on (`do_table_structure=true`).
- **CPU:** No GPU; `table_mode=fast` for speed.

---

## 10. Minimal JSON skeleton (copy-paste template)

```json
{
  "report": { "summary_derived_by_us": true },
  "raw": {
    "status": "success",
    "processing_time": 0.0,
    "document": {
      "filename": "example.pdf",
      "md_content": "# Section\n\n| Col A | Col B |\n|-------|-------|\n| U030  | Frame warranty ... |",
      "text_content": "plain text export ...",
      "json_content": {
        "schema_name": "DoclingDocument",
        "version": "1.10.0",
        "name": "example",
        "body": {
          "children": [
            { "$ref": "#/texts/0" },
            { "$ref": "#/tables/0" }
          ]
        },
        "texts": [
          {
            "self_ref": "#/texts/0",
            "label": "section_header",
            "text": "Coverage Information",
            "prov": [{ "page_no": 1, "bbox": { "l": 0, "t": 0, "r": 100, "b": 20 } }]
          }
        ],
        "tables": [
          {
            "self_ref": "#/tables/0",
            "label": "table",
            "prov": [{ "page_no": 1 }],
            "data": {
              "table_cells": [
                {
                  "text": "U030",
                  "start_row_offset_idx": 1,
                  "start_col_offset_idx": 0,
                  "column_header": false
                },
                {
                  "text": "Frame & Crossmembers, 72 Months/750,000 Miles",
                  "start_row_offset_idx": 1,
                  "start_col_offset_idx": 1
                }
              ]
            }
          }
        ],
        "groups": [],
        "pictures": []
      }
    }
  }
}
```

---

## 11. Recommended ingestion algorithm (warranty PDFs)

```
1. Load raw.document.json_content → DOC

2. Vehicle identity (regex + text scan):
   - Walk texts[] where label=="text"
   - Concatenate or pattern-match:
     VIN:     17-char alphanumeric after "VIN" label
     Chassis: digits after "Chassis ID" / "NR"
     Brand:   after "Brand" label node

3. Coverage rows:
   - For each table in DOC["tables"]:
     - For each cell in table["data"]["table_cells"]:
       - Group by start_row_offset_idx
       - Column 0 → coverage_code (regex U\d{3,4}, TOW\d, D\d{4})
       - Column 1 → description
       - Columns 2–3 → start_date, end_date (parse or null)

4. Optional: traverse body.children in order for narrative context

5. Embed md_content or row text for vector search (separate from structured fields)
```

---

## 12. 1172 WARRENTY.pdf — extracted facts (ground truth)

| Field | Value |
|-------|-------|
| Pages | 2 |
| Text nodes | 38 |
| Tables | 2 (99 + 22 cells) |
| VIN | `4V4NC9EH1LN218380` |
| Chassis | `218380` (unit 1172 in filename) |
| Sample codes | U030, U06, U06A, U065, TOW4, U13, … |

---

## 13. What NOT to parse from this file

- `report` — our summary only; not from Docling.
- Base64 blobs in `md_content` — UI images, not warranty data.
- `furniture` — page furniture layer; ignore for POC.

---

## 14. File size note

Full `1172_WARRENTY_docling_raw.json` is ~7,300 lines because `md_content` embeds **base64 images** (hundreds of KB each). For LLM context:

- Pass **`json_content` only** (extract programmatically), or
- Use **`report` + sample table_cells**, or
- Strip `md_content` before pasting (images make file huge).

---

*End of reference — suitable for copy-paste into Claude or any ingestion agent prompt.*
