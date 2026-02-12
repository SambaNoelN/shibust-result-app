$(document).ready(function () {

    let courses = [];

    // Add new course row
    function addCourseRow(course = {code:'', title:'', cv:3, ca:'', exam:''}, index = null) {
        const id = index !== null ? index : courses.length;
        const html = `
            <div class="course-entry" data-index="${id}">
                <button class="remove-btn">×</button>
                <div class="course-grid">
                    <input type="text" class="code" placeholder="Course Code (e.g. CSC101)" value="${course.code}">
                    <input type="text" class="title" placeholder="Course Title" value="${course.title}">
                    <input type="number" class="cv" min="1" max="6" placeholder="CV" value="${course.cv}">
                    <input type="number" class="ca" min="0" max="100" placeholder="CA Score" value="${course.ca}">
                    <input type="number" class="exam" min="0" max="100" placeholder="Exam Score" value="${course.exam}">
                </div>
            </div>
        `;
        $("#coursesContainer").append(html);
    }

    // Add initial empty course
    addCourseRow();

    // Add course button
    $("#addCourseBtn").click(function () {
        addCourseRow();
    });

    // Remove course
    $(document).on("click", ".remove-btn", function () {
        $(this).closest(".course-entry").remove();
    });

    // Generate result
    $("#generateResultBtn").click(function () {
        courses = [];

        $(".course-entry").each(function () {
            const code = $(this).find(".code").val().trim();
            const title = $(this).find(".title").val().trim();
            const cv = parseInt($(this).find(".cv").val()) || 0;
            const ca = parseInt($(this).find(".ca").val()) || 0;
            const exam = parseInt($(this).find(".exam").val()) || 0;

            if (code && title && cv > 0) {
                courses.push({ code, title, cv, ca, exam });
            }
        });

        if (courses.length === 0) {
            alert("Please add at least one valid course.");
            return;
        }

        const name = $("#studentName").val().trim() || "—";
        const matric = $("#matricNo").val().trim() || "—";
        const major = $("#major").val().trim() || "—";
        const level = $("#level").val().trim() || "—";
        const department = $("#department").val().trim() || "-";
        const semester = $("#semester").val().trim() || "-";

        $("#displayName").text(name);
        $("#displayMatric").text(matric);
        $("#displayMajor").text(major);
        $("#displayLevel").text(level);
        $("#displayMajor").trim(department);
        $("#displaySemester").trim(semester);

        // Clear previous table
        $("#resultTable tbody").empty();

        let totalCV = 0;
        let earnedCV = 0;
        let totalPoints = 0;

        function getGrade(mark) {
            if (mark >= 80) return { grade: "A", point: 5 };
            if (mark >= 60) return { grade: "B", point: 4 };
            if (mark >= 50) return { grade: "C", point: 3 };
            if (mark >= 45) return { grade: "D", point: 2 };
            return { grade: "F", point: 0 };
        }

        courses.forEach((course, i) => {
            const final = course.ca + course.exam;
            const result = getGrade(final);

            totalCV += course.cv;
            if (result.point > 0) earnedCV += course.cv;
            totalPoints += result.point * course.cv;

            $("#resultTable tbody").append(`
                <tr>
                    <td>${i + 1}</td>
                    <td>${course.code}</td>
                    <td>${course.title}</td>
                    <td>${course.cv}</td>
                    <td>${course.ca}</td>
                    <td>${course.exam}</td>
                    <td>${final}</td>
                    <td>${result.grade}</td>
                </tr>
            `);
        });

        const gpa = totalCV > 0 ? (totalPoints / totalCV).toFixed(2) : "0.00";

        $("#attempted").text(totalCV);
        $("#earned").text(earnedCV);
        $("#gpa").text(gpa);

        // Show result, hide input
        $("#inputSection").hide();
        $("#resultSection").fadeIn();
    });

    // Edit data → go back
    $("#editDataBtn").click(function () {
        $("#resultSection").hide();
        $("#inputSection").fadeIn();
    });

    // Print / PDF (same as before)
    $("#printBtn").on("click", async function () {
        if (confirm("Open print dialog?\n(Cancel = Save PDF only)")) {
            window.print();
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            const element = document.querySelector("#resultSection");
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = 190;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
            pdf.save("SHIBUST_Semester_Result.pdf");
        } catch (err) {
            console.error(err);
            alert("PDF generation failed. Use Print instead.");
        }
    });

});