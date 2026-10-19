# SHIBUST Semester Result Generator

A lightweight, browser-based tool for entering student and course information, calculating semester grades and GPA, and generating a printable result sheet for the Solidarity Higher Institute of Business Science and Technology (SHIBUST).

## Features

- Responsive sidebar navigation with a mobile menu.
- Student details form with level, department, and semester dropdowns.
- Add or remove course entries.
- Automatic grade, attempted-credit, earned-credit, and GPA calculations.
- Academic year displayed as the current calendar year and the following year (for example, `2026/2027`).
- Print the result sheet or save it as a PDF.
- Publish results to a browser-stored list and reopen each student's full report.
- Prevent publishing more than one report for the same matriculation number, semester, and academic year.
- Student matriculation lookup that shows basic student information only, then downloads the full result PDF after a transaction ID is submitted.
- Return to the form to edit the entered information.

## Getting started

No build step or package installation is required.

1. Clone or download this repository.
2. Open `index.html` in a modern web browser.

Alternatively, serve the project directory with any static web server and open the local URL it provides. The page loads jQuery, jsPDF, and html2canvas from CDNs, so an internet connection is required for those libraries.

## Using the app

1. Enter the student's name, matriculation number, major/programme, level, department, and semester.
2. Add course details and scores. Use **+ Add New Course** to add rows or the **×** button to remove a row.
3. Select **Generate Sheet** to calculate and view the result.
4. Select **Publish Result** to save the result and open the published-results list. Use **View Report** beside a student to reopen their full report.
5. Use **Print / Save PDF** to print or download the sheet. Use **Edit Data** to return to the form.
6. Open `student.html` and enter the student's matriculation number. Only basic student information is shown; submitting a Mobile Money transaction ID downloads the full report as a PDF.

Available levels are 100, 200, 300, and 400. Departments are Medical, Business, and Computer. Semesters are First Semester and Second Semester.

## Grade and GPA scale

Each course total is calculated as `CA + Exam`. The grade points are:

| Total score | Grade | Grade points |
| --- | --- | ---: |
| 80–100 | A | 4.0 |
| 70–79 | B+ | 3.5 |
| 60–69 | B | 3.0 |
| 55–59 | C+ | 2.5 |
| 50–54 | C | 2.0 |
| 45–49 | D+ | 1.5 |
| 40–44 | D | 1.0 |
| 0–39 | F | 0.0 |

GPA is calculated as the credit-weighted average of course grade points. Credit is counted as earned when the course grade point is greater than zero.

## Project files

- `index.html` — application form, navigation, and result sheet markup.
- `script.js` — course handling, result calculations, navigation, and PDF export.
- `css/style2.css` — application and result-sheet styles, including responsive and print layouts.
- `student.html`, `student.js`, and `css/student.css` — student result lookup, transaction-ID unlock, and PDF report.
- `css/style.css` — additional stylesheet retained in the project.
- `image/` — logo, background, and QR code assets.

## Notes

- The app runs entirely in the browser and does not use a backend. Published results are stored in the browser's local storage, so they remain available after a reload in the same browser.
- The student page reads the same browser-stored published results. It is a demonstration flow, not a secure student login or payment verification system; transaction IDs are not checked with MTN or Orange. Configure official payment account details and add a backend/payment-provider integration before using it for real payments or private student records.
- PDF export and external JavaScript libraries require an internet connection when loaded from their CDNs.
