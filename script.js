$(document).ready(function () {

    const publishedResultsKey = "shibustPublishedResults";
    const cashBookKey = "shibustCashBook";
    let currentResult = null;
    let cashBook = loadCashBook();

    function syncNavigation(view) {
        $(".nav-link").removeClass("active");
        $(`.nav-link[data-view="${view}"]`).addClass("active");
        const viewTitles = {
            inputSection: "Result Generator",
            resultSection: "Result Sheet",
            publishedSection: "Published Results",
            cashbookSection: "Cash Book"
        };
        $("#viewTitle").text(viewTitles[view]);
    }

    function showView(view) {
        $(".content-area > .container, .content-area > .result-sheet, .content-area > .cashbook-page").hide();
        $(`#${view}`).fadeIn();
        syncNavigation(view);
        closeMobileSidebar();
    }

    function closeMobileSidebar() {
        $(".app-shell").removeClass("sidebar-open");
        $("#sidebarToggle").attr("aria-expanded", "false");
    }

    $(".nav-link").click(function () {
        const view = $(this).data("view");
        if ($(this).prop("disabled")) return;

        showView(view);
        if (view === "publishedSection") renderPublishedResults();
    });

    $("#sidebarToggle").click(function () {
        const isOpen = $(".app-shell").toggleClass("sidebar-open").hasClass("sidebar-open");
        $(this).attr("aria-expanded", String(isOpen));
    });

    $("#sidebarBackdrop").click(closeMobileSidebar);

    function addCourseRow() {
        const html = `
            <div class="course-entry">
                <button class="remove-btn">×</button>
                <div class="course-grid">
                    <input type="text" class="code" placeholder="Course Code" required>
                    <input type="text" class="title" placeholder="Course Title" required>
                    <input type="number" class="cv" min="1" max="6" placeholder="CV" required>
                    <input type="number" class="ca" min="0" max="30" placeholder="CA (0-30)" required>
                    <input type="number" class="exam" min="0" max="70" placeholder="Exam (0-70)" required>
                </div>
            </div>
        `;
        $("#coursesContainer").append(html);
    }

    addCourseRow();

    $("#addCourseBtn").click(function () {
        addCourseRow();
    });

    $(document).on("click", ".remove-btn", function () {
        $(this).closest(".course-entry").remove();
    });

    function getGrade(mark) {
        if (mark >= 80) return { grade: 'A', point: 4.0 };
        if (mark >= 70) return { grade: 'B+', point: 3.5 };
        if (mark >= 60) return { grade: 'B', point: 3.0 };
        if (mark >= 55) return { grade: 'C+', point: 2.5 };
        if (mark >= 50) return { grade: 'C', point: 2.0 };
        if (mark >= 45) return { grade: 'D+', point: 1.5 };
        if (mark >= 40) return { grade: 'D', point: 1.0 };
        return { grade: 'F', point: 0.0 };
    }

    function createResultFromForm() {
        const name = $("#studentName").val().trim();
        const matric = $("#matricNo").val().trim();
        const major = $("#major").val().trim();
        const level = $("#level").val().trim();
        const department = $("#department").val().trim();
        const semester = $("#semester").val().trim();

        if (!name || !matric || !major || !level || !department || !semester) {
            alert("Please complete all student information.");
            return null;
        }

        let totalCV = 0;
        let earnedCV = 0;
        let totalPoints = 0;
        const courses = [];
        let validationError = "";

        $(".course-entry").each(function (index) {

            const code = $(this).find(".code").val().trim();
            const title = $(this).find(".title").val().trim();
            const cvInput = $(this).find(".cv").val();
            const caInput = $(this).find(".ca").val();
            const examInput = $(this).find(".exam").val();

            if (!code && !title && !cvInput && !caInput && !examInput) return;
            if (!code || !title || !cvInput || !caInput || !examInput) {
                validationError = "Please complete every field for each course.";
                return false;
            }

            const cv = Number(cvInput);
            const ca = Number(caInput);
            const exam = Number(examInput);

            if (!Number.isInteger(cv) || cv < 1 || cv > 6 ||
                !Number.isInteger(ca) || ca < 0 || ca > 30 ||
                !Number.isInteger(exam) || exam < 0 || exam > 70) {
                validationError = "Course credits must be 1–6, CA 0–30, and Exam 0–70.";
                return false;
            }

            const total = ca + exam;
            const result = getGrade(total);

            totalCV += cv;
            totalPoints += result.point * cv;

            if (result.point > 0) {
                earnedCV += cv;
            }

            courses.push({ number: index + 1, code, title, cv, ca, exam, total, grade: result.grade });
        });

        if (validationError) {
            alert(validationError);
            return null;
        }

        if (!courses.length) {
            alert("Please enter at least one valid course.");
            return null;
        }

        const currentYear = new Date().getFullYear();
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name,
            matric,
            major,
            level,
            department,
            semester,
            academicYear: `${currentYear}/${currentYear + 1}`,
            courses,
            attempted: totalCV,
            earned: earnedCV,
            gpa: (totalPoints / totalCV).toFixed(2),
            publishedAt: new Date().toISOString()
        };
    }

    function renderResult(result) {
        currentResult = result;
        $("#displayName").text(result.name);
        $("#displayMatric").text(result.matric);
        $("#displayMajor").text(result.major);
        $("#displayLevel").text(result.level);
        $("#displayDepartment").text(result.department);
        $("#displaySemester").text(result.semester);
        $("#academicYear").text(result.academicYear);

        const rows = result.courses.map((course) => {
            const $row = $("<tr>");
            [
                course.number,
                course.code,
                course.title,
                course.cv,
                course.ca,
                course.exam,
                course.total,
                course.grade
            ].forEach((value) => $row.append($("<td>").text(value)));
            return $row;
        });
        $("#resultTable tbody").empty().append(rows);
        $("#attempted").text(result.attempted);
        $("#earned").text(result.earned);
        $("#gpa").text(result.gpa);
        $("#resultNav").prop("disabled", false);
    }

    function loadPublishedResults() {
        try {
            const savedResults = localStorage.getItem(publishedResultsKey);
            const results = savedResults ? JSON.parse(savedResults) : [];
            if (!Array.isArray(results)) {
                throw new Error("Published results data is not a list.");
            }
            return results;
        } catch (error) {
            alert(`Unable to load published results: ${error.message}`);
            return null;
        }
    }

    function renderPublishedResults() {
        const results = loadPublishedResults();
        const $body = $("#publishedResultsBody").empty();
        if (!results) {
            $("#publishedResultsEmpty").text("Published results could not be loaded.").show();
            return;
        }

        getUniquePublishedResults(results).reverse().forEach((result) => {
            const $row = $("<tr>");
            [result.name, result.matric, result.semester, result.academicYear].forEach((value) => {
                $row.append($("<td>").text(value));
            });
            const $viewButton = $("<button>", {
                class: "primary-btn view-report-btn",
                type: "button",
                text: "View Report"
            }).data("result", result);
            $row.append($("<td>").append($viewButton));
            $body.append($row);
        });

        $("#publishedResultsEmpty")
            .text(results.length ? "" : "No results have been published yet.")
            .toggle(results.length === 0);
    }

    function loadCashBook() {
        try {
            const savedCashBook = localStorage.getItem(cashBookKey);
            if (!savedCashBook) return { openingBalance: 0, transactions: [] };

            const data = JSON.parse(savedCashBook);
            if (!data || typeof data !== "object" ||
                !Number.isFinite(data.openingBalance) || data.openingBalance < 0 ||
                !Array.isArray(data.transactions) ||
                data.transactions.some((transaction) =>
                    !transaction || typeof transaction.id !== "string" ||
                    typeof transaction.date !== "string" ||
                    typeof transaction.description !== "string" ||
                    !["income", "expense"].includes(transaction.type) ||
                    !Number.isFinite(transaction.amount) || transaction.amount <= 0
                )) {
                throw new Error("Cash Book data is invalid.");
            }

            return data;
        } catch (error) {
            alert(`Unable to load the Cash Book: ${error.message}`);
            return null;
        }
    }

    function saveCashBook(data) {
        try {
            localStorage.setItem(cashBookKey, JSON.stringify(data));
            return true;
        } catch (error) {
            alert(`Unable to save the Cash Book: ${error.message}`);
            return false;
        }
    }

    function formatCashBookAmount(amount) {
        return amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getLocalDateValue() {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        return new Date(today.getTime() - offset).toISOString().slice(0, 10);
    }

    function appendCashBookCell($row, value) {
        $row.append($("<td>").text(value));
    }

    function renderCashBook() {
        const $body = $("#cashbookTransactionsBody").empty();
        if (!cashBook) {
            $("#cashbookEmpty").text("Cash Book data could not be loaded.").show();
            $("#cashbookSection input, #cashbookSection select, #cashbookSection button").prop("disabled", true);
            return;
        }

        const openingBalance = cashBook.openingBalance;
        let balance = openingBalance;
        let totalIncome = 0;
        let totalExpenses = 0;
        const transactions = cashBook.transactions
            .map((transaction, index) => ({ ...transaction, index }))
            .sort((first, second) => first.date.localeCompare(second.date) || first.index - second.index);

        $("#openingBalance").val(openingBalance.toFixed(2));

        const $openingRow = $("<tr>");
        appendCashBookCell($openingRow, "—");
        appendCashBookCell($openingRow, "Starting balance");
        appendCashBookCell($openingRow, "—");
        appendCashBookCell($openingRow, "—");
        appendCashBookCell($openingRow, formatCashBookAmount(balance));
        appendCashBookCell($openingRow, "—");
        $body.append($openingRow);

        transactions.forEach((transaction) => {
            const $row = $("<tr>");
            if (transaction.type === "income") {
                totalIncome += transaction.amount;
                balance += transaction.amount;
            } else {
                totalExpenses += transaction.amount;
                balance -= transaction.amount;
            }

            appendCashBookCell($row, transaction.date);
            appendCashBookCell($row, transaction.description);
            appendCashBookCell($row, transaction.type === "income" ? formatCashBookAmount(transaction.amount) : "—");
            appendCashBookCell($row, transaction.type === "expense" ? formatCashBookAmount(transaction.amount) : "—");
            appendCashBookCell($row, formatCashBookAmount(balance));

            const $deleteButton = $("<button>", {
                class: "cashbook-delete-btn",
                type: "button",
                text: "Remove",
                "aria-label": `Remove transaction: ${transaction.description}`
            }).data("transaction-id", transaction.id);
            $row.append($("<td>").addClass("cashbook-actions-column").append($deleteButton));
            $body.append($row);
        });

        $("#cashbookIncomeTotal").text(formatCashBookAmount(totalIncome));
        $("#cashbookExpenseTotal").text(formatCashBookAmount(totalExpenses));
        $("#cashbookCurrentBalance").text(formatCashBookAmount(balance));
        $("#cashbookEmpty").toggle(transactions.length === 0);
    }

    function csvCell(value, protectFormula = false) {
        let text = String(value);
        if (protectFormula && /^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCashBook() {
        if (!cashBook) return;

        const rows = [["Date", "Description", "Income", "Expenses", "Balance"]];
        let balance = cashBook.openingBalance;
        rows.push(["", "Starting balance", "", "", balance.toFixed(2)]);

        const transactions = cashBook.transactions
            .map((transaction, index) => ({ ...transaction, index }))
            .sort((first, second) => first.date.localeCompare(second.date) || first.index - second.index);
        transactions.forEach((transaction) => {
            if (transaction.type === "income") balance += transaction.amount;
            else balance -= transaction.amount;

            rows.push([
                transaction.date,
                transaction.description,
                transaction.type === "income" ? transaction.amount.toFixed(2) : "",
                transaction.type === "expense" ? transaction.amount.toFixed(2) : "",
                balance.toFixed(2)
            ]);
        });

        const csv = "\uFEFF" + rows.map((row) =>
            row.map((value, index) => csvCell(value, index === 1)).join(",")
        ).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "SHIBUST_Cash_Book.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    $("#cashbookDate").val(getLocalDateValue());
    renderCashBook();

    $("#openingBalance").on("change", function () {
        if (!cashBook) return;
        const openingBalance = Number(this.value);
        if (!Number.isFinite(openingBalance) || openingBalance < 0) {
            alert("Opening balance must be zero or more.");
            $(this).val(cashBook.openingBalance.toFixed(2));
            return;
        }

        const updatedCashBook = { ...cashBook, openingBalance };
        if (saveCashBook(updatedCashBook)) {
            cashBook = updatedCashBook;
            renderCashBook();
        } else {
            $(this).val(cashBook.openingBalance.toFixed(2));
        }
    });

    $("#cashbookEntryForm").on("submit", function (event) {
        event.preventDefault();
        if (!cashBook) return;

        const transaction = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            date: $("#cashbookDate").val(),
            description: $("#cashbookDescription").val().trim(),
            type: $("#cashbookType").val(),
            amount: Number($("#cashbookAmount").val())
        };
        if (!transaction.date || !transaction.description ||
            !["income", "expense"].includes(transaction.type) ||
            !Number.isFinite(transaction.amount) || transaction.amount <= 0) {
            alert("Enter a date, description, and an amount greater than zero.");
            return;
        }

        const updatedCashBook = {
            ...cashBook,
            transactions: [...cashBook.transactions, transaction]
        };
        if (saveCashBook(updatedCashBook)) {
            cashBook = updatedCashBook;
            this.reset();
            $("#cashbookDate").val(getLocalDateValue());
            renderCashBook();
        }
    });

    $(document).on("click", ".cashbook-delete-btn", function () {
        if (!cashBook) return;
        const transactionId = $(this).data("transaction-id");
        const updatedCashBook = {
            ...cashBook,
            transactions: cashBook.transactions.filter((transaction) => transaction.id !== transactionId)
        };
        if (saveCashBook(updatedCashBook)) {
            cashBook = updatedCashBook;
            renderCashBook();
        }
    });

    $("#exportCashbookBtn").click(exportCashBook);
    $("#printCashbookBtn").click(function () {
        document.body.classList.add("cashbook-print");
        window.print();
    });
    window.addEventListener("afterprint", () => document.body.classList.remove("cashbook-print"));

    function hasPublishedReport(results, result) {
        const reportKey = getReportKey(result);

        return reportKey !== null &&
            results.some((publishedResult) => getReportKey(publishedResult) === reportKey);
    }

    function getReportKey(result) {
        if (!result || typeof result !== "object" ||
            typeof result.matric !== "string" ||
            typeof result.semester !== "string" ||
            typeof result.academicYear !== "string") {
            return null;
        }

        return JSON.stringify([
            result.matric.trim().toUpperCase(),
            result.semester.trim().toLowerCase(),
            result.academicYear.trim().toLowerCase()
        ]);
    }

    function getUniquePublishedResults(results) {
        const uniqueResults = new Map();
        results.forEach((result) => {
            const key = getReportKey(result);
            if (key !== null) uniqueResults.set(key, result);
        });
        return Array.from(uniqueResults.values());
    }

    function publishResult(result) {
        const results = loadPublishedResults();
        if (!results) return false;

        if (hasPublishedReport(results, result)) {
            alert("A result for this student, semester, and academic year has already been published.");
            return false;
        }

        currentResult = result;
        results.push(result);
        try {
            localStorage.setItem(publishedResultsKey, JSON.stringify(results));
        } catch (error) {
            alert(`Unable to publish this result: ${error.message}`);
            return false;
        }

        renderPublishedResults();
        showView("publishedSection");
        return true;
    }

    $("#generateResultBtn").click(function () {
        const result = createResultFromForm();
        if (!result) return;

        renderResult(result);
        showView("resultSection");
    });

    $("#publishResultBtn").click(function () {
        const result = createResultFromForm();
        if (result) publishResult(result);
    });

    $("#publishCurrentResultBtn").click(function () {
        if (currentResult) publishResult(currentResult);
    });

    $(document).on("click", ".view-report-btn", function () {
        const result = $(this).data("result");
        renderResult(result);
        showView("resultSection");
    });

    $("#editDataBtn").click(function () {
        showView("inputSection");
    });

    renderPublishedResults();

    $("#printBtn").click(async function () {

        if (confirm("Open print dialog?\nCancel = Save as PDF only")) {
            window.print();
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p", "mm", "a4");

            const element = document.querySelector("#resultSection");
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");

            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
            pdf.save("SHIBUST_Semester_Result.pdf");

        } catch (error) {
            alert("PDF generation failed. Please use Print.");
        }
    });

});