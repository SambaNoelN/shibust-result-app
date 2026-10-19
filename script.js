$(document).ready(function () {

    const publishedResultsKey = "shibustPublishedResults";
    let currentResult = null;

    function syncNavigation(view) {
        $(".nav-link").removeClass("active");
        $(`.nav-link[data-view="${view}"]`).addClass("active");
        const viewTitles = {
            inputSection: "Result Generator",
            resultSection: "Result Sheet",
            publishedSection: "Published Results"
        };
        $("#viewTitle").text(viewTitles[view]);
    }

    function showView(view) {
        $(".content-area > .container, .content-area > .result-sheet").hide();
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