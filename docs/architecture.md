# Architecture

The conversion core is UI-agnostic and shared by Tauri commands, the CLI, and
platform integrations.

```text
React UI -> Tauri commands -> converter-core
                             -> converter-engines (FFmpeg & LibreOffice)
                             -> converter-models
```

## Conversion Engines

Recast uses dedicated engines tailored to media types:
- **FFmpeg Engine**: Handles Image, Audio, and Video conversions, stream extractions, and codec mappings.
- **LibreOffice Engine**: Handles Document conversions across Text Documents (Writer), Spreadsheets (Calc), and Presentations (Impress).

### Document Architecture & Isolation

Document conversions are executed via headless LibreOffice (`soffice`):
1. **Isolated User Profiles**: Each document conversion job creates an isolated temporary user profile passed via `-env:UserInstallation=file:///<isolated-temp-dir>` to prevent concurrent LibreOffice instance locks and collisions.
2. **Family-Isolated Capability Graph**: Document conversions stay within their semantic family:
   - Text documents (ODT, DOCX, DOC, RTF, TXT, MD, HTML, EPUB) convert to Text formats and PDF.
   - Spreadsheets (ODS, XLSX, XLS, CSV, TSV) convert to Spreadsheet formats and PDF.
   - Presentations (ODP, PPTX, PPT) convert to Presentation formats and PDF.
   - **PDF is strictly output-only**: Rendered/print formats cannot be converted arbitrarily back to editable documents.
3. **Engine Discovery & Overrides**: LibreOffice is discovered via the `LIBREOFFICE_PATH` environment variable, platform installation directories (Windows Registry / Program Files, macOS `/Applications`, Linux standard paths), or system `PATH`.
4. **Markdown Support**: Conversion to/from Markdown requires LibreOffice 26.2+. If an older version is detected, Recast rejects Markdown jobs with an actionable capability error while keeping other document conversions functional.

Platform-specific work lives outside the core, primarily in `shell-integration`
and the Tauri shell.

