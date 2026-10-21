# SHIBUST Semester Result Generator

A lightweight, browser-based tool for entering student and course information, calculating semester grades and GPA, and generating a printable result sheet for the Solidarity Higher Institute of Business Science and Technology (SHIBUST).

## Features

- Responsive sidebar navigation with a mobile menu.
- Admin dashboard with student, lecturer, published-result, and cash-book summaries, plus charts for enrollment status, academic levels, lecturer employment, and recent cash flow.
- Dashboard quick actions for generating a result, adding a student or lecturer, and recording a cash-book transaction.
- Student details form with level, department, and semester dropdowns.
- Add or remove course entries.
- Automatic grade, attempted-credit, earned-credit, and GPA calculations.
- Academic year displayed as the current calendar year and the following year (for example, `2026/2027`).
- Print the result sheet or save it as a PDF.
- Publish results to a browser-stored list and reopen each student's full report.
- Track opening balance, dated income, expenses, and a chronological running balance in the admin Cash Book.
- Manage student records from the admin Student Directory, including profile photo URLs, academic status, contact details, and tuition status.
- Assign enrolled courses to students and show their course count and list in the directory, profile, print report, and CSV export. Published reports continue to provide CA, exam, final total, term GPA, and cumulative GPA.
- Manage lecturer records from the admin Lecturer Directory, including academic rank, employment status, qualifications, advisor availability, and contact information. Add courses taught to each lecturer and see the count and list in the directory, profile, print report, and CSV export.
- Print the Cash Book or save it as a PDF, and export it as an Excel-compatible CSV file.
- Prevent publishing more than one report for the same matriculation number, semester, and academic year.
- Student matriculation lookup that shows basic student information only, then downloads the full result PDF with the SHIBUST stamp after a transaction ID is submitted.
- Return to the form to edit the entered information.

## Getting started

No build step or package installation is required.

1. Clone or download this repository.
2. Serve the project directory with a local web server and open the local URL it provides. The Students and Lecturers panels fetch their initial demo records from `students.json` and `lectuers.json`; browsers block these JSON fetches when the page is opened directly as a `file://` URL. The page also loads jQuery, jsPDF, and html2canvas from CDNs, so an internet connection is required for those libraries.

## Using the app

1. The **Dashboard** opens first and summarizes the browser's student, lecturer, published-result, and cash-book records. Its charts show enrollment status, student levels, lecturer employment status, and income/expenses for the latest six months. Use the quick actions to start common tasks.
2. Enter the student's name, matriculation number, major/programme, level, department, and semester in **Result Generator**.
3. Add course details and scores. Use **+ Add New Course** to add rows or the **×** button to remove a row.
4. Select **Generate Sheet** to calculate and view the result.
5. Select **Publish Result** to save the result and open the published-results list. Use **View Report** beside a student to reopen their full report.
6. Use **Print / Save PDF** to print or download the sheet. Use **Edit Data** to return to the form.
7. Open `student.html` and enter the student's matriculation number. Only basic student information is shown; submitting a Mobile Money transaction ID downloads the full report as a PDF.
8. Select **Students** in the admin navigation to view 10 fictional starter records imported from `students.json`, then add, search, view, edit, or delete student records. Add or remove enrolled courses in the student form; each course has a code, title, and credit value. The profile also displays published result sheets matching the student's matriculation number; course finals are calculated from CA + Exam, and cumulative GPA uses the result-sheet credit-weighted grade scale. Matriculation numbers are generated from the last two admission-year digits, the first three department letters, and the next available four-digit sequence (for example, `SHB24SWE0008`). You can upload profile photos from your device; they are stored separately in this browser. Use **Print / Save PDF** to print the matching student records or save them as a PDF, and **Export for Excel** to download their details as a CSV file. Both exports follow the current search and status filters.
9. Select **Lecturers** in the admin navigation to add, search, view, edit, and delete lecturer records. The first load imports the 10 sample records from `lectuers.json` into this browser. Add or remove courses taught in the lecturer form; each course has a code, title, and credit value. Lecturer email addresses must be unique. Lecturer profile photos can be uploaded from your device and are stored separately in this browser. Use **Print / Save PDF** for the matching lecturer profiles or **Export for Excel** to download their information as CSV; both exports respect the current search and employment-status filters.
10. Select **Cash Book** in the admin navigation to set an opening balance and add dated income or expense transactions. The ledger recalculates balances by date and saves entries in this browser. Use **Print / Save PDF** to print or save the ledger as a PDF, or **Export for Excel** to download a CSV spreadsheet.

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
- `students.json` and `lectuers.json` — fictional starter records, including each student's enrolled courses and each lecturer's assigned courses and course count.
- `css/style2.css` — application and result-sheet styles, including responsive and print layouts.
- `student.html`, `student.js`, and `css/student.css` — student result lookup, transaction-ID unlock, and PDF report.
- `css/style.css` — additional stylesheet retained in the project.
- `image/` — logo, background, and QR code assets.

## Notes

- The app runs entirely in the browser and does not use a backend. The 10 fictional demo records in `students.json` and `lectuers.json` are imported into local storage on first load; older browser-stored directory records are given the matching seed course list only when their course list is missing. Thereafter, browser-stored directory data is authoritative. Published results and Cash Book entries also use local storage; uploaded student and lecturer photos are stored separately in IndexedDB. Data remains available after a reload in the same browser. Student portal usernames are optional metadata only; login is not enabled and passwords are not collected or stored.
- The student page reads the same browser-stored published results. It is a demonstration flow, not a secure student login or payment verification system; transaction IDs are not checked with MTN or Orange. Configure official payment account details and add a backend/payment-provider integration before using it for real payments or private student records.
- PDF export and external JavaScript libraries require an internet connection when loaded from their CDNs.
