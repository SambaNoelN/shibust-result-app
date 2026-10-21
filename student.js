document.addEventListener("DOMContentLoaded", () => {
    const publishedResultsKey = "shibustPublishedResults";
    const lookupForm = document.getElementById("lookupForm");
    const lookupMessage = document.getElementById("lookupMessage");
    const resultSection = document.getElementById("studentResult");
    const paymentForm = document.getElementById("transactionForm");
    const paymentMessage = document.getElementById("paymentMessage");
    const downloadButton = document.getElementById("downloadReport");
    let selectedResult = null;

    function showMessage(element, message, isSuccess = false) {
        element.textContent = message;
        element.classList.toggle("message-success", isSuccess);
    }

    function getPublishedResults() {
        try {
            const savedResults = localStorage.getItem(publishedResultsKey);
            const results = savedResults ? JSON.parse(savedResults) : [];
            if (!Array.isArray(results)) {
                throw new Error("Published result data is not a list.");
            }
            return results;
        } catch (error) {
            showMessage(lookupMessage, `Unable to read published results: ${error.message}`);
            return null;
        }
    }

    function setText(id, value) {
        document.getElementById(id).textContent = value ?? "";
    }

    function displayResult(result) {
        selectedResult = result;
        setText("reportName", result.name);
        setText("reportMatric", result.matric);
        setText("reportMajor", result.major);
        setText("reportLevel", result.level);
        setText("reportDepartment", result.department);
        setText("reportSemester", result.semester);
        setText("reportAcademicYear", result.academicYear);

        resultSection.hidden = false;
        downloadButton.hidden = true;
        paymentForm.reset();
        showMessage(paymentMessage, "");
    }

    document.getElementById("matricNumber").addEventListener("input", () => {
        selectedResult = null;
        resultSection.hidden = true;
        downloadButton.hidden = true;
        paymentForm.reset();
        showMessage(paymentMessage, "");
    });

    lookupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        resultSection.hidden = true;
        selectedResult = null;
        downloadButton.hidden = true;
        showMessage(lookupMessage, "");

        const matric = document.getElementById("matricNumber").value.trim().toUpperCase();
        if (!matric) {
            showMessage(lookupMessage, "Enter your matriculation number.");
            return;
        }

        const results = getPublishedResults();
        if (!results) return;

        const matchingResults = results.filter((result) =>
            typeof result.matric === "string" &&
            result.matric.trim().toUpperCase() === matric &&
            Array.isArray(result.courses)
        );
        if (!matchingResults.length) {
            showMessage(lookupMessage, "No published result was found for that matriculation number.");
            return;
        }

        matchingResults.sort((first, second) =>
            new Date(second.publishedAt || 0).getTime() -
            new Date(first.publishedAt || 0).getTime()
        );
        displayResult(matchingResults[0]);
        showMessage(lookupMessage, "Your latest published result is ready.", true);
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!selectedResult) {
            showMessage(paymentMessage, "Find your published result before submitting a transaction ID.");
            return;
        }

        const provider = document.getElementById("paymentProvider").value;
        const transactionId = document.getElementById("transactionId").value.trim();
        if (!provider || !transactionId) {
            showMessage(paymentMessage, "Select a payment service and enter your transaction ID.");
            return;
        }

        downloadButton.hidden = false;
        try {
            await downloadPdf(selectedResult);
            showMessage(paymentMessage, "Your full result PDF has been downloaded. Payment has not been verified.", true);
        } catch (error) {
            showMessage(paymentMessage, `PDF download failed: ${error.message}`);
        }
    });

    function loadStampImage() {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("The SHIBUST stamp image could not be loaded."));
            image.src = "shibuststamp.jpeg";
        });
    }

    function cropStampImage(image) {
        const sourceCanvas = document.createElement("canvas");
        sourceCanvas.width = image.naturalWidth;
        sourceCanvas.height = image.naturalHeight;
        const sourceContext = sourceCanvas.getContext("2d");
        if (!sourceContext) {
            throw new Error("The SHIBUST stamp image could not be prepared for the PDF.");
        }
        sourceContext.drawImage(image, 0, 0);

        const { data, width, height } = sourceContext.getImageData(
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height
        );
        let left = width;
        let top = height;
        let right = 0;
        let bottom = 0;
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const pixel = (y * width + x) * 4;
                if (data[pixel] < 245 || data[pixel + 1] < 245 || data[pixel + 2] < 245) {
                    left = Math.min(left, x);
                    top = Math.min(top, y);
                    right = Math.max(right, x);
                    bottom = Math.max(bottom, y);
                }
            }
        }
        if (right < left || bottom < top) {
            throw new Error("The SHIBUST stamp image is blank.");
        }

        const padding = Math.round(Math.max(right - left, bottom - top) * 0.03);
        left = Math.max(0, left - padding);
        top = Math.max(0, top - padding);
        right = Math.min(width - 1, right + padding);
        bottom = Math.min(height - 1, bottom + padding);

        const stampCanvas = document.createElement("canvas");
        stampCanvas.width = right - left + 1;
        stampCanvas.height = bottom - top + 1;
        const stampContext = stampCanvas.getContext("2d");
        if (!stampContext) {
            throw new Error("The SHIBUST stamp image could not be prepared for the PDF.");
        }
        stampContext.drawImage(
            sourceCanvas,
            left,
            top,
            stampCanvas.width,
            stampCanvas.height,
            0,
            0,
            stampCanvas.width,
            stampCanvas.height
        );
        return stampCanvas.toDataURL("image/png");
    }

    async function downloadPdf(result) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error("The PDF library could not be loaded. Check your internet connection and try again.");
        }

        const stampImage = cropStampImage(await loadStampImage());
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 14;
        const usableWidth = pageWidth - margin * 2;
        const columnWidths = [10, 22, 63, 12, 12, 14, 17, 22];
        const headers = ["#", "Code", "Course title", "CV", "CA", "Exam", "Total", "Grade"];
        let y = margin;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.text("SOLIDARITY HIGHER INSTITUTE OF BUSINESS SCIENCE AND TECHNOLOGY", pageWidth / 2, y, {
            align: "center",
            maxWidth: usableWidth
        });
        y += 9;
        pdf.setFontSize(13);
        pdf.text("Semester Result", pageWidth / 2, y, { align: "center" });
        y += 9;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        const details = [
            `Name: ${result.name}`,
            `Matriculation number: ${result.matric}`,
            `Major / Programme: ${result.major}`,
            `Level: ${result.level}`,
            `Department: ${result.department}`,
            `Semester: ${result.semester}`,
            `Academic year: ${result.academicYear}`
        ];
        details.forEach((detail) => {
            const lines = pdf.splitTextToSize(detail, usableWidth);
            pdf.text(lines, margin, y);
            y += lines.length * 5;
        });
        y += 3;

        function drawTableHeader() {
            pdf.setFillColor(40, 86, 106);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            let x = margin;
            headers.forEach((header, index) => {
                pdf.rect(x, y, columnWidths[index], 8, "F");
                pdf.text(header, x + columnWidths[index] / 2, y + 5.2, { align: "center" });
                x += columnWidths[index];
            });
            y += 8;
            pdf.setTextColor(35, 50, 60);
            pdf.setFont("helvetica", "normal");
        }

        drawTableHeader();
        result.courses.forEach((course) => {
            const values = [
                course.number,
                course.code,
                course.title,
                course.cv,
                course.ca,
                course.exam,
                course.total,
                course.grade
            ];
            const wrappedValues = values.map((value, index) =>
                pdf.splitTextToSize(String(value ?? ""), columnWidths[index] - 2)
            );
            const rowHeight = Math.max(8, ...wrappedValues.map((lines) => lines.length * 4 + 3));
            if (y + rowHeight > pageHeight - margin) {
                pdf.addPage();
                y = margin;
                drawTableHeader();
            }

            let x = margin;
            wrappedValues.forEach((lines, index) => {
                pdf.rect(x, y, columnWidths[index], rowHeight);
                pdf.text(lines, x + columnWidths[index] / 2, y + 4.5, { align: "center" });
                x += columnWidths[index];
            });
            y += rowHeight;
        });

        y += 9;
        if (y > pageHeight - margin - 18) {
            pdf.addPage();
            y = margin;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`Attempted Credit: ${result.attempted}`, margin, y);
        pdf.text(`Credit Earned: ${result.earned}`, margin + 60, y);
        pdf.text(`GPA: ${result.gpa}/4.0`, margin + 125, y);

        const stampSize = 27;
        const stampCaptionY = y + stampSize + 10;
        if (stampCaptionY > pageHeight - margin) {
            pdf.addPage();
            y = margin;
        }
        const stampX = pageWidth - margin - stampSize;
        const stampY = y + 5;
        pdf.addImage(stampImage, "PNG", stampX, stampY, stampSize, stampSize);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Official Stamp", stampX + stampSize / 2, stampY + stampSize + 5, {
            align: "center"
        });

        const safeMatric = result.matric.replace(/[^a-z0-9-_]/gi, "_");
        pdf.save(`SHIBUST_Result_${safeMatric}.pdf`);
    }

    downloadButton.addEventListener("click", async () => {
        if (!selectedResult || downloadButton.hidden) return;
        try {
            await downloadPdf(selectedResult);
        } catch (error) {
            showMessage(paymentMessage, `PDF download failed: ${error.message}`);
        }
    });
});
