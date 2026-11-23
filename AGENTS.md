# Repository Instructions for OpenCode

## Stack & Architecture
- **Backend:** Laravel 13 (PHP 8.3+) + Inertia.js v3.
- **Frontend:** React 19 + Tailwind CSS v4 + Vite 8 (`resources/js/Pages/`).
- **Routes:** Client SPA routes in `routes/web.php` (Inertia views); API endpoints in `routes/api.php` (`/api/*`).
- **Storage:** Uploads and generated documents use private storage (`storage/app/private/`), NOT public storage.

## Key Commands
- **Dev Server:** `npm run dev` (Vite) and `php artisan dev`
- **Build:** `npm run build`
- **Tests:** `php artisan test` (or `php artisan test --filter=TestClassName`)
- **Formatting (PHP):** `vendor/bin/pint --dirty --format agent`

## System & External Dependencies
- **Poppler (`pdftotext`, `pdftohtml`):** Required in `PATH` for PDF schedule parsing (`GradePdfParser`). PDF parser unit tests auto-skip if missing.
- **LibreOffice (`soffice` / `LIBREOFFICE_BIN` env):** Required ONLY for DOCX-to-PDF conversion (`DocxToPdfConverter`). DOCX timesheet generation works without it.
- **Timesheet Template:** Requires template file at `storage/app/private/templates/folha_ponto_modelo.docx` at runtime (not committed to git).

## Security & Privacy
- The application has **no built-in route authentication** and handles sensitive teacher data (CPF, matricula). Do NOT expose to public networks without an external proxy/VPN access barrier.

## Testing Quirks
- Feature & Unit tests run on SQLite in-memory database (`:memory:`).
- In tests involving PDF output, mock `DocxToPdfConverter` (`$this->mock(DocxToPdfConverter::class)`) to avoid external LibreOffice execution.
