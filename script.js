$(document).ready(function () {

    function addCourseRow() {
        const html = `
            <div class="course-entry">
                <button class="remove-btn">×</button>
                <div class="course-grid">
                    <input type="text" class="code" placeholder="Course Code" required>
                    <input type="text" class="title" placeholder="Course Title" required>
                    <input type="number" class="cv" min="1" max="6" placeholder="CV" required>
                    <input type="number" class="ca" min="0" max="40" placeholder="CA (0-40)" required>
                    <input type="number" class="exam" min="0" max="60" placeholder="Exam (0-60)" required>
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

    $("#generateResultBtn").click(function () {

        const name = $("#studentName").val().trim();
        const matric = $("#matricNo").val().trim();
        const major = $("#major").val().trim();
        const level = $("#level").val().trim();
        const department = $("#department").val().trim();
        const semester = $("#semester").val().trim();

        if (!name || !matric || !major || !level || !department || !semester) {
            alert("Please complete all student information.");
            return;
        }

        let totalCV = 0;
        let earnedCV = 0;
        let totalPoints = 0;

        $("#resultTable tbody").empty();

        let validCourse = false;

        $(".course-entry").each(function (index) {

            const code = $(this).find(".code").val().trim();
            const title = $(this).find(".title").val().trim();
            const cv = parseInt($(this).find(".cv").val());
            const ca = parseInt($(this).find(".ca").val());
            const exam = parseInt($(this).find(".exam").val());

            if (!code || !title || !cv) return;

            if (ca > 40 || exam > 60) {
                alert("CA must be ≤ 40 and Exam ≤ 60.");
                return;
            }

            const total = ca + exam;
            const result = getGrade(total);

            totalCV += cv;
            totalPoints += result.point * cv;

            if (result.point > 0) {
                earnedCV += cv;
            }

            $("#resultTable tbody").append(`
                <tr>
                    <td>${index + 1}</td>
                    <td>${code}</td>
                    <td>${title}</td>
                    <td>${cv}</td>
                    <td>${ca}</td>
                    <td>${exam}</td>
                    <td>${total}</td>
                    <td>${result.grade}</td>
                </tr>
            `);

            validCourse = true;
        });

        if (!validCourse) {
            alert("Please enter at least one valid course.");
            return;
        }

        const gpa = (totalPoints / totalCV).toFixed(2);

        $("#displayName").text(name);
        $("#displayMatric").text(matric);
        $("#displayMajor").text(major);
        $("#displayLevel").text(level);
        $("#displayDepartment").text(department);
        $("#displaySemester").text(semester);

        $("#attempted").text(totalCV);
        $("#earned").text(earnedCV);
        $("#gpa").text(gpa);

        $("#inputSection").hide();
        $("#resultSection").fadeIn();
    });

    $("#editDataBtn").click(function () {
        $("#resultSection").hide();
        $("#inputSection").fadeIn();
    });

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