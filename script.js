$(document).ready(function () {

    const publishedResultsKey = "shibustPublishedResults";
    const cashBookKey = "shibustCashBook";
    const studentsKey = "shibustStudents";
    const studentPhotosDatabase = "shibustStudentPhotos";
    const studentPhotosStore = "photos";
    const lecturersKey = "shibustLecturers";
    let currentResult = null;
    let cashBook = loadCashBook();
    let students = null;
    let lecturers = null;
    let studentsLoaded = false;
    let lecturersLoaded = false;
    let studentPhotosDatabasePromise = null;
    const studentPhotoObjectUrls = new Map();
    let selectedPhotoPreviewUrl = "";
    let selectedLecturerPhotoPreviewUrl = "";

    function syncNavigation(view) {
        $(".nav-link").removeClass("active");
        $(`.nav-link[data-view="${view}"]`).addClass("active");
        const viewTitles = {
            dashboardSection: "Dashboard",
            inputSection: "Result Generator",
            resultSection: "Result Sheet",
            publishedSection: "Published Results",
            studentsSection: "Students",
            lecturersSection: "Lecturers",
            cashbookSection: "Cash Book"
        };
        $("#viewTitle").text(viewTitles[view]);
    }

    function showView(view) {
        $(".content-area > .dashboard-page, .content-area > .container, .content-area > .result-sheet, .content-area > .cashbook-page, .content-area > .students-page, .content-area > .lecturers-page").hide();
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
        if (view === "studentsSection") renderStudents();
        if (view === "lecturersSection") renderLecturers();
        if (view === "dashboardSection") renderDashboard();
    });

    $("#sidebarToggle").click(function () {
        const isOpen = $(".app-shell").toggleClass("sidebar-open").hasClass("sidebar-open");
        $(this).attr("aria-expanded", String(isOpen));
    });

    $("#sidebarBackdrop").click(closeMobileSidebar);

    const studentFields = [
        ["matriculationNumber", "Matriculation Number"],
        ["admissionYear", "Admission Year"],
        ["currentLevel", "Current Level"],
        ["enrollmentStatus", "Enrollment Status"],
        ["firstName", "First Name"],
        ["lastName", "Last Name"],
        ["profilePhotoUrl", "Profile Photo URL"],
        ["dateOfBirth", "Date of Birth"],
        ["gender", "Gender"],
        ["nationality", "Nationality"],
        ["facultySchool", "Faculty / School"],
        ["department", "Department"],
        ["programMajor", "Program / Major"],
        ["assignedAdvisorTutor", "Assigned Advisor / Tutor"],
        ["studentEmail", "Student Email"],
        ["personalEmail", "Personal Email"],
        ["phoneNumber", "Phone Number"],
        ["emergencyContactName", "Emergency Contact Name"],
        ["emergencyContactPhone", "Emergency Contact Phone"],
        ["tuitionStatus", "Tuition Status"],
        ["portalUsername", "Portal Username"]
    ];

    function createProfileCourseRow(course = {}) {
        const $row = $("<div>").addClass("profile-course-row");
        const $code = $("<input>", {
            type: "text",
            maxlength: 24,
            placeholder: "Course code",
            "aria-label": "Course code"
        }).addClass("profile-course-code").val(course.code || "");
        const $title = $("<input>", {
            type: "text",
            maxlength: 120,
            placeholder: "Course title",
            "aria-label": "Course title"
        }).addClass("profile-course-title").val(course.title || "");
        const $credits = $("<input>", {
            type: "number",
            min: 1,
            max: 6,
            step: 1,
            placeholder: "Credits",
            "aria-label": "Course credits"
        }).addClass("profile-course-credits").val(course.credits ?? course.cv ?? "");
        const $remove = $("<button>", {
            type: "button",
            class: "profile-course-remove",
            text: "Remove",
            "aria-label": `Remove course ${course.code || ""}`
        });
        $row.append($code, $title, $credits, $remove);
        return $row;
    }

    function renderProfileCourseEditor(containerId, courses) {
        const $editor = $(`#${containerId}`).empty();
        const entries = Array.isArray(courses) ? courses : [];
        if (entries.length) {
            entries.forEach((course) => $editor.append(createProfileCourseRow(course)));
        } else {
            $editor.append(createProfileCourseRow());
        }
    }

    function readProfileCourses(containerId) {
        const courses = [];
        let validationMessage = "";
        const seenCodes = new Set();
        $(`#${containerId} .profile-course-row`).each(function () {
            const code = $(this).find(".profile-course-code").val().trim().toUpperCase();
            const title = $(this).find(".profile-course-title").val().trim();
            const creditsValue = $(this).find(".profile-course-credits").val();
            if (!code && !title && !creditsValue) return;
            const credits = Number(creditsValue);
            if (!code || !title || !creditsValue) {
                validationMessage = "Complete the course code, title, and credits for every course row.";
                return false;
            }
            if (!Number.isInteger(credits) || credits < 1 || credits > 6) {
                validationMessage = "Course credits must be a whole number from 1 to 6.";
                return false;
            }
            if (seenCodes.has(code)) {
                validationMessage = `Course code ${code} is listed more than once.`;
                return false;
            }
            seenCodes.add(code);
            courses.push({ code, title, credits });
        });

        if (validationMessage) {
            alert(validationMessage);
            return null;
        }
        return courses;
    }

    function formatProfileCourses(courses) {
        return (Array.isArray(courses) ? courses : [])
            .map((course) => `${course.code} - ${course.title} (${course.credits ?? course.cv ?? "—"} credits)`)
            .join("; ");
    }

    function isValidProfileCourse(course) {
        return course && typeof course === "object" &&
            typeof course.code === "string" && typeof course.title === "string" &&
            Number.isInteger(course.credits) && course.credits >= 1 && course.credits <= 6;
    }

    $(document).on("click", "[data-add-profile-course]", function () {
        const containerId = $(this).data("add-profile-course");
        $(`#${containerId}`).append(createProfileCourseRow());
    });

    $(document).on("click", ".profile-course-remove", function () {
        const $editor = $(this).closest(".profile-course-editor");
        $(this).closest(".profile-course-row").remove();
        if (!$editor.children().length) $editor.append(createProfileCourseRow());
    });

    async function addCoursesFromSeedWhenMissing(records, jsonPath, storageKey, identityField) {
        if (!records) return records;

        const needsSeedCourses = records.some((record) => !Array.isArray(record.courses));
        let seedsByIdentity = new Map();
        if (needsSeedCourses) {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Unable to migrate course assignments from ${jsonPath} (HTTP ${response.status}).`);
            }
            const seedRecords = await response.json();
            if (!Array.isArray(seedRecords) || seedRecords.some((record) =>
                !record || typeof record[identityField] !== "string" ||
                (record.courses !== undefined &&
                    (!Array.isArray(record.courses) || !record.courses.every(isValidProfileCourse)))
            )) {
                throw new Error(`${jsonPath} does not contain a valid directory with course assignments.`);
            }
            seedsByIdentity = new Map(seedRecords.map((record) => [record[identityField], record]));
        }

        let changed = false;
        const migratedRecords = records.map((record) => {
            const seedRecord = Array.isArray(record.courses) ? null : seedsByIdentity.get(record[identityField]);
            const courses = Array.isArray(record.courses)
                ? record.courses
                : (Array.isArray(seedRecord?.courses) ? seedRecord.courses : []);
            const numberOfCourses = courses.length;
            if (Array.isArray(record.courses) && record.numberOfCourses === numberOfCourses) return record;
            changed = true;
            return { ...record, courses, numberOfCourses };
        });
        if (changed) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(migratedRecords));
            } catch (error) {
                throw new Error(`Unable to save migrated course assignments: ${error.message}`);
            }
        }
        return migratedRecords;
    }

    async function loadDirectoryRecords(storageKey, jsonPath, collectionName, isValidRecord) {
        try {
            const savedRecords = localStorage.getItem(storageKey);
            if (savedRecords !== null) {
                const records = JSON.parse(savedRecords);
                if (!Array.isArray(records) || records.some((record) => !isValidRecord(record))) {
                    throw new Error(`${collectionName} records data is invalid.`);
                }
                if (records.length || localStorage.getItem(`${storageKey}SeedLoaded`) === "true") {
                    return records;
                }
            }

            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}.`);
            }
            const records = await response.json();
            if (!Array.isArray(records) || records.some((record) => !isValidRecord(record))) {
                throw new Error(`${jsonPath} does not contain a valid ${collectionName} list.`);
            }
            localStorage.setItem(storageKey, JSON.stringify(records));
            localStorage.setItem(`${storageKey}SeedLoaded`, "true");
            return records;
        } catch (error) {
            alert(`Unable to load ${collectionName.toLowerCase()}: ${error.message}. Open the app through a local web server so the JSON files can be fetched.`);
            return null;
        }
    }

    async function loadStudents() {
        const records = await loadDirectoryRecords(
            studentsKey,
            "students.json",
            "Student records",
            (student) => student && typeof student.id === "string" &&
                typeof student.matriculationNumber === "string" &&
                typeof student.firstName === "string" &&
            typeof student.lastName === "string" &&
            (!Array.isArray(student.courses) || student.courses.every(isValidProfileCourse))
        );
        try {
            return await addCoursesFromSeedWhenMissing(records, "students.json", studentsKey, "id");
        } catch (error) {
            alert(`Unable to load student course assignments: ${error.message}`);
            return records;
        }
    }

    function saveStudents(records) {
        try {
            localStorage.setItem(studentsKey, JSON.stringify(records));
            return true;
        } catch (error) {
            alert(`Unable to save student records: ${error.message}`);
            return false;
        }
    }

    function getExternalStudentPhotoUrl(value) {
        const url = String(value || "").trim();
        if (!url) return "";
        if (/^https?:\/\//i.test(url) || /^(\/(?!\/)|\.{1,2}\/)/.test(url)) return url;
        return "";
    }

    function openStudentPhotosDatabase() {
        if (!("indexedDB" in window)) {
            return Promise.reject(new Error("This browser does not support persistent photo storage."));
        }
        if (!studentPhotosDatabasePromise) {
            studentPhotosDatabasePromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(studentPhotosDatabase, 1);
                request.onupgradeneeded = () => {
                    if (!request.result.objectStoreNames.contains(studentPhotosStore)) {
                        request.result.createObjectStore(studentPhotosStore);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error("Unable to open photo storage."));
            });
        }
        return studentPhotosDatabasePromise;
    }

    function saveStudentPhoto(photoId, file) {
        return openStudentPhotosDatabase().then((database) => new Promise((resolve, reject) => {
            const transaction = database.transaction(studentPhotosStore, "readwrite");
            transaction.objectStore(studentPhotosStore).put(file, photoId);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Unable to save the profile photo."));
            transaction.onabort = () => reject(transaction.error || new Error("Photo storage was interrupted."));
        }));
    }

    function loadStudentPhoto(photoId) {
        return openStudentPhotosDatabase().then((database) => new Promise((resolve, reject) => {
            const transaction = database.transaction(studentPhotosStore, "readonly");
            const request = transaction.objectStore(studentPhotosStore).get(photoId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error("Unable to load the profile photo."));
        }));
    }

    function deleteStudentPhoto(photoId) {
        if (!photoId) return Promise.resolve();
        return openStudentPhotosDatabase().then((database) => new Promise((resolve, reject) => {
            const transaction = database.transaction(studentPhotosStore, "readwrite");
            transaction.objectStore(studentPhotosStore).delete(photoId);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Unable to remove the profile photo."));
            transaction.onabort = () => reject(transaction.error || new Error("Photo removal was interrupted."));
        })).then(() => {
            const objectUrl = studentPhotoObjectUrls.get(photoId);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            studentPhotoObjectUrls.delete(photoId);
        });
    }

    async function getStudentPhotoUrl(student) {
        const externalUrl = getExternalStudentPhotoUrl(student.profilePhotoUrl);
        if (externalUrl) return externalUrl;
        if (!student.profilePhotoId) return "";
        if (studentPhotoObjectUrls.has(student.profilePhotoId)) {
            return studentPhotoObjectUrls.get(student.profilePhotoId);
        }

        const photo = await loadStudentPhoto(student.profilePhotoId);
        if (!photo) return "";
        const objectUrl = URL.createObjectURL(photo);
        studentPhotoObjectUrls.set(student.profilePhotoId, objectUrl);
        return objectUrl;
    }

    function getStudentInitials(student) {
        return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
    }

    function createStudentAvatar(student, className, knownPhotoUrl = "") {
        const $avatar = $("<span>").addClass(className).attr("aria-hidden", "true");
        const initials = getStudentInitials(student);
        $avatar.text(initials);
        const showPhoto = (photoUrl) => {
            if (!photoUrl) return;
            $("<img>").attr({
                src: photoUrl,
                alt: "",
                ...(className === "students-print-avatar" ? {} : { loading: "lazy" })
            })
                .on("error", () => $avatar.text(initials))
                .appendTo($avatar.empty());
        };
        if (knownPhotoUrl) {
            showPhoto(knownPhotoUrl);
        } else {
            getStudentPhotoUrl(student).then(showPhoto)
                .catch((error) => alert(`Unable to load ${student.firstName} ${student.lastName}'s profile photo: ${error.message}`));
        }
        return $avatar;
    }

    function getDepartmentCode(department) {
        return String(department || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
    }

    function generateMatriculationNumber(admissionYear, department, excludedId = "") {
        const year = Number(admissionYear);
        const departmentCode = getDepartmentCode(department);
        if (!Number.isInteger(year) || year < 1900 || year > 2100 || departmentCode.length !== 3 || !students) return "";

        const yearCode = String(year).slice(-2);
        const prefix = `SHB${yearCode}${departmentCode}`;
        const existingNumberPattern = new RegExp(`^SHB(?:20)?${yearCode}${departmentCode}(\\d+)$`, "i");
        const highestSequence = students.reduce((highest, student) => {
            if (student.id === excludedId) return highest;
            const match = String(student.matriculationNumber || "").replace(/[^a-z0-9]/gi, "").match(existingNumberPattern);
            return match ? Math.max(highest, Number(match[1])) : highest;
        }, 0);
        return `${prefix}${String(highestSequence + 1).padStart(4, "0")}`;
    }

    function updateGeneratedMatriculationNumber() {
        const form = $("#studentForm")[0];
        if (!form || form.elements.recordId.value) return;
        form.elements.matriculationNumber.value = generateMatriculationNumber(
            form.elements.admissionYear.value,
            form.elements.department.value
        );
    }

    function getFilteredStudents() {
        if (!students) return null;
        const query = $("#studentSearch").val().trim().toLowerCase();
        const status = $("#studentStatusFilter").val();
        return students.filter((student) => {
            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
            return (!query || fullName.includes(query) || student.matriculationNumber.toLowerCase().includes(query)) &&
                (!status || student.enrollmentStatus === status);
        }).sort((first, second) =>
            `${first.lastName} ${first.firstName}`.localeCompare(`${second.lastName} ${second.firstName}`)
        );
    }

    function renderStudents() {
        const $body = $("#studentsBody").empty();
        const matches = getFilteredStudents();
        if (!matches) {
            $("#studentsEmpty").text(studentsLoaded ? "Student records could not be loaded." : "Loading student records...").show();
            if (studentsLoaded) {
                $("#studentsSection input, #studentsSection select, #studentsSection button").prop("disabled", true);
            }
            renderDashboard();
            return;
        }

        matches.forEach((student) => {
            const $row = $("<tr>");
            const $name = $("<td>").addClass("student-name-cell");
            const $view = $("<button>", {
                class: "student-name-button",
                type: "button",
                text: `${student.firstName} ${student.lastName}`
            }).data("student-id", student.id);
            $name.append(createStudentAvatar(student, "student-avatar"), $view);
            $row.append($name);
            $row.append($("<td>").text(student.matriculationNumber));
            $row.append($("<td>").text([student.department, student.currentLevel].filter(Boolean).join(" · ") || "—"));
            $row.append($("<td>").text(Array.isArray(student.courses) ? student.courses.length : 0));
            $row.append($("<td>").append($("<span>").addClass("student-status").addClass(
                `student-status-${String(student.enrollmentStatus).toLowerCase()}`
            ).text(student.enrollmentStatus || "—")));

            const $actions = $("<td>").addClass("student-row-actions");
            [
                ["View", "student-view-btn"],
                ["Edit", "student-edit-btn"],
                ["Delete", "student-delete-btn"]
            ].forEach(([label, className]) => {
                $actions.append($("<button>", { class: className, type: "button", text: label }).data("student-id", student.id));
            });
            $row.append($actions);
            $body.append($row);
        });

        $("#studentsEmpty")
            .text(matches.length ? "" : (students.length ? "No students match your search." : "No student records yet. Add a student to get started."))
            .toggle(matches.length === 0);
        renderDashboard();
    }

    async function createStudentPrintReport(records) {
        const photoUrls = await Promise.all(records.map((student) => getStudentPhotoUrl(student)));
        const $report = $("#studentsPrintReport").empty();
        $report.append(
            $("<h1>").text("SHIBUST Student Directory"),
            $("<p>").addClass("students-print-date").text(`Generated ${new Date().toLocaleString()}`)
        );

        records.forEach((student, index) => {
            const $record = $("<article>").addClass("students-print-record");
            const $heading = $("<header>").addClass("students-print-record-heading");
            $heading.append(createStudentAvatar(student, "students-print-avatar", photoUrls[index]));
            $heading.append($("<div>").append(
                $("<h2>").text(`${student.firstName} ${student.lastName}`),
                $("<p>").text(student.matriculationNumber)
            ));
            $record.append($heading);

            const groups = [
                ["Identification & Academic Status", [
                    ["Admission Year", "admissionYear"], ["Current Level", "currentLevel"],
                    ["Enrollment Status", "enrollmentStatus"]
                ]],
                ["Personal Information", [
                    ["Date of Birth", "dateOfBirth"], ["Gender", "gender"], ["Nationality", "nationality"],
                    ["Profile Photo URL", "profilePhotoUrl"]
                ]],
                ["Academic & Department", [
                    ["Faculty / School", "facultySchool"], ["Department", "department"],
                    ["Program / Major", "programMajor"], ["Assigned Advisor / Tutor", "assignedAdvisorTutor"]
                ]],
                ["Enrolled Courses", [
                    ["Number of Courses", { value: Array.isArray(student.courses) ? student.courses.length : 0 }],
                    ["Courses", { value: formatProfileCourses(student.courses) || "—" }]
                ]],
                ["Contact & Emergency Details", [
                    ["Student Email", "studentEmail"], ["Personal Email", "personalEmail"],
                    ["Phone Number", "phoneNumber"], ["Emergency Contact Name", "emergencyContactName"],
                    ["Emergency Contact Phone", "emergencyContactPhone"]
                ]],
                ["Administrative & Financial", [
                    ["Tuition Status", "tuitionStatus"], ["Portal Username", "portalUsername"]
                ]]
            ];

            groups.forEach(([title, fields]) => {
                const $group = $("<section>").addClass("students-print-group");
                const $table = $("<table>").append($("<caption>").text(title));
                const $body = $("<tbody>");
                fields.forEach(([label, field]) => {
                    const value = typeof field === "object" && field !== null
                        ? field.value
                        : typeof field !== "string"
                            ? field
                        : field === "profilePhotoUrl" && student.profilePhotoId
                            ? "Uploaded from device"
                            : (student[field] || "—");
                    $body.append($("<tr>").append(
                        $("<th>").attr("scope", "row").text(label),
                        $("<td>").text(value)
                    ));
                });
                $table.append($body);
                $group.append($table);
                $record.append($group);
            });
            $report.append($record);
        });
        await Promise.all(Array.from($report.find("img")).map((image) =>
            image.complete ? Promise.resolve() : new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            })
        ));
    }

    function exportStudentsToCsv(records) {
        const headers = [...studentFields.map(([, label]) => label), "Number of Courses", "Courses"];
        const rows = [headers, ...records.map((student) =>
            [...studentFields.map(([field]) =>
                field === "profilePhotoUrl" && student.profilePhotoId
                    ? "Uploaded from device"
                    : (student[field] || "")
            ), Array.isArray(student.courses) ? student.courses.length : 0, formatProfileCourses(student.courses)]
        )];
        const csv = "\uFEFF" + rows.map((row) =>
            row.map((value) => csvCell(value, true)).join(",")
        ).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "SHIBUST_Students.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    $("#exportStudentsBtn").on("click", function () {
        const records = getFilteredStudents();
        if (!records) return;
        if (!records.length) {
            alert("There are no matching student records to export.");
            return;
        }
        exportStudentsToCsv(records);
    });

    $("#printStudentsBtn").on("click", async function () {
        const records = getFilteredStudents();
        if (!records) return;
        if (!records.length) {
            alert("There are no matching student records to print.");
            return;
        }
        try {
            await createStudentPrintReport(records);
        } catch (error) {
            alert(`Unable to prepare the student print report: ${error.message}`);
            return;
        }
        document.body.classList.add("students-print");
        window.print();
    });
    window.addEventListener("afterprint", () => document.body.classList.remove("students-print"));

    function findStudentById(id) {
        return students && students.find((student) => student.id === id);
    }

    function openStudentForm(student = null) {
        const form = $("#studentForm")[0];
        form.reset();
        form.elements.recordId.value = student ? student.id : "";
        $("#studentFormTitle").text(student ? "Edit Student" : "Add Student");
        studentFields.forEach(([field]) => {
            if (!student) return;
            const input = form.elements[field];
            const value = student[field] || "";
            if (input instanceof HTMLSelectElement) {
                const normalizedValue = value.toLowerCase().replace(/^level\s*/, "");
                const matchingOption = Array.from(input.options).find((option) =>
                    option.value.toLowerCase().replace(/^level\s*/, "") === normalizedValue
                );
                input.value = matchingOption ? matchingOption.value : "";
            } else {
                input.value = value;
            }
        });
        $("#studentPhotoUpload").val("");
        clearStudentPhotoPreview();
        if (!student) {
            form.elements.admissionYear.value = new Date().getFullYear();
            form.elements.enrollmentStatus.value = "Active";
        } else {
            getStudentPhotoUrl(student).then((photoUrl) => {
                if (photoUrl && !form.elements.profilePhotoUpload.files.length && !form.elements.profilePhotoUrl.value) {
                    showStudentPhotoPreview(photoUrl);
                }
            }).catch((error) => alert(`Unable to load the profile photo: ${error.message}`));
        }
        renderProfileCourseEditor("studentCoursesEditor", student?.courses);
        updateGeneratedMatriculationNumber();
        document.getElementById("studentFormDialog").showModal();
    }

    function clearStudentPhotoPreview() {
        if (selectedPhotoPreviewUrl) URL.revokeObjectURL(selectedPhotoPreviewUrl);
        selectedPhotoPreviewUrl = "";
        $("#studentPhotoPreview").attr("src", "").prop("hidden", true);
    }

    function showStudentPhotoPreview(photoUrl) {
        $("#studentPhotoPreview").attr("src", photoUrl).prop("hidden", false);
    }

    function renderStudentCourseHistory($content, student) {
        const $section = $("<section>").addClass("student-detail-group student-course-history");
        $section.append($("<h3>").text("Courses & Results"));

        const normalizedMatriculationNumber = String(student.matriculationNumber || "").trim().toUpperCase();
        const enrolledCourses = Array.isArray(student.courses) ? student.courses : [];
        const $enrollmentSummary = $("<dl>").addClass("student-course-summary");
        $enrollmentSummary.append($("<div>").append(
            $("<dt>").text("Enrolled Courses"),
            $("<dd>").text(enrolledCourses.length)
        ));
        $section.append($enrollmentSummary);
        if (enrolledCourses.length) {
            const $enrolledList = $("<ul>").addClass("student-enrolled-course-list");
            enrolledCourses.forEach((course) => {
                $enrolledList.append($("<li>").text(
                    `${course.code} · ${course.title} · ${course.credits} credits`
                ));
            });
            $section.append($enrolledList);
        } else {
            $section.append($("<p>").addClass("student-detail-note").text("No enrolled courses have been assigned."));
        }

        const results = loadPublishedResults();
        if (!results) {
            $section.append($("<p>").addClass("student-detail-note").text("Published course results could not be loaded."));
            $content.append($section);
            return;
        }

        const studentResults = getUniquePublishedResults(results)
            .filter((result) => result.matric.trim().toUpperCase() === normalizedMatriculationNumber)
            .sort((first, second) => String(second.publishedAt || "").localeCompare(String(first.publishedAt || "")));
        const courseCount = studentResults.reduce((count, result) =>
            count + (Array.isArray(result.courses) ? result.courses.length : 0), 0);
        let attemptedCredits = 0;
        let earnedCredits = 0;
        let totalGradePoints = 0;

        studentResults.forEach((result) => {
            (Array.isArray(result.courses) ? result.courses : []).forEach((course) => {
                if (!course || typeof course !== "object") return;
                const credit = Number(course.cv);
                const ca = Number(course.ca);
                const exam = Number(course.exam);
                const storedTotal = Number(course.total);
                const finalMark = Number.isFinite(storedTotal) ? storedTotal : ca + exam;
                if (!Number.isFinite(credit) || credit <= 0 || !Number.isFinite(finalMark)) return;

                const grade = getGrade(finalMark);
                attemptedCredits += credit;
                totalGradePoints += grade.point * credit;
                if (grade.point > 0) earnedCredits += credit;
            });
        });

        const cumulativeGpa = attemptedCredits
            ? (totalGradePoints / attemptedCredits).toFixed(2)
            : "—";
        const $summary = $("<dl>").addClass("student-course-summary");
        [
            ["Published Result Courses", courseCount],
            ["Attempted Credits", attemptedCredits || "—"],
            ["Earned Credits", earnedCredits || 0],
            ["Cumulative GPA", cumulativeGpa]
        ].forEach(([label, value]) => {
            $summary.append($("<div>").append($("<dt>").text(label), $("<dd>").text(value)));
        });
        $section.append($summary);

        if (!studentResults.length) {
            $section.append($("<p>").addClass("student-detail-note").text("No published result courses found for this student."));
            $content.append($section);
            return;
        }

        studentResults.forEach((result) => {
            const courses = Array.isArray(result.courses) ? result.courses : [];
            const $report = $("<div>").addClass("student-course-report");
            $report.append($("<h4>").text(
                [result.semester, result.academicYear].filter(Boolean).join(" · ") || "Published Result"
            ));
            $report.append($("<p>").addClass("student-course-report-summary").text(
                `Courses: ${courses.length} · Attempted credits: ${Number.isFinite(Number(result.attempted)) ? result.attempted : "—"} · ` +
                `Earned credits: ${Number.isFinite(Number(result.earned)) ? result.earned : "—"} · GPA: ${result.gpa || "—"}`
            ));

            const $table = $("<table>").addClass("student-course-table");
            const $head = $("<thead>").append($("<tr>"));
            ["Course Code", "Course Title", "Credits", "CA", "Exam", "Final", "Grade"].forEach((label) => {
                $head.find("tr").append($("<th>").text(label));
            });
            $table.append($head);

            const $body = $("<tbody>");
            courses.forEach((course) => {
                if (!course || typeof course !== "object") return;
                const $row = $("<tr>");
                const ca = Number(course.ca);
                const exam = Number(course.exam);
                const total = Number(course.total);
                const finalMark = Number.isFinite(total) ? total :
                    (Number.isFinite(ca) && Number.isFinite(exam) ? ca + exam : NaN);
                const grade = Number.isFinite(finalMark) ? getGrade(finalMark).grade : (course.grade || "—");
                [
                    course.code || "—",
                    course.title || "—",
                    course.cv ?? "—",
                    Number.isFinite(ca) ? ca : "—",
                    Number.isFinite(exam) ? exam : "—",
                    Number.isFinite(finalMark) ? finalMark : "—",
                    grade
                ].forEach((value) => $row.append($("<td>").text(value)));
                $body.append($row);
            });
            $table.append($body);
            $report.append($("<div>").addClass("student-course-table-wrap").append($table));
            $section.append($report);
        });

        $content.append($section);
    }

    function renderStudentDetails(student) {
        const $content = $("#studentDetailsContent").empty();
        const $profile = $("<div>").addClass("student-detail-profile");
        $profile.append(createStudentAvatar(student, "student-detail-avatar"));
        $profile.append($("<div>").append(
            $("<h3>").text(`${student.firstName} ${student.lastName}`),
            $("<p>").text(student.matriculationNumber)
        ));
        $content.append($profile);

        const groups = [
            ["Identification & Academic Status", [
                ["Matriculation Number", "matriculationNumber"], ["Admission Year", "admissionYear"],
                ["Current Level", "currentLevel"], ["Enrollment Status", "enrollmentStatus"]
            ]],
            ["Personal Information", [
                ["First Name", "firstName"], ["Last Name", "lastName"], ["Date of Birth", "dateOfBirth"],
                ["Gender", "gender"], ["Nationality", "nationality"], ["Profile Photo URL", "profilePhotoUrl"]
            ]],
            ["Academic & Department", [
                ["Faculty / School", "facultySchool"], ["Department", "department"], ["Program / Major", "programMajor"],
                ["Assigned Advisor / Tutor", "assignedAdvisorTutor"]
            ]],
            ["Contact & Emergency Details", [
                ["Student Email", "studentEmail"], ["Personal Email", "personalEmail"], ["Phone Number", "phoneNumber"],
                ["Emergency Contact Name", "emergencyContactName"], ["Emergency Contact Phone", "emergencyContactPhone"]
            ]],
            ["Administrative & Financial", [
                ["Tuition Status", "tuitionStatus"], ["Portal Username", "portalUsername"]
            ]]
        ];

        groups.forEach(([title, fields]) => {
            const $group = $("<section>").addClass("student-detail-group");
            $group.append($("<h3>").text(title));
            const $grid = $("<dl>").addClass("student-detail-grid");
            fields.forEach(([label, field]) => {
                const value = field === "profilePhotoUrl" && student.profilePhotoId
                    ? "Uploaded from device"
                    : (student[field] || "—");
                $grid.append($("<div>").append($("<dt>").text(label), $("<dd>").text(value)));
            });
            $group.append($grid);
            $content.append($group);
        });
        renderStudentCourseHistory($content, student);
        $content.append($("<p>").addClass("student-detail-note").text("Student login is not enabled; passwords are not collected or stored."));
        document.getElementById("studentDetailsDialog").showModal();
    }

    $("#addStudentBtn").on("click", () => openStudentForm());
    $("#studentAdmissionYear, #studentDepartment").on("input change", updateGeneratedMatriculationNumber);
    $("#studentPhotoUpload").on("change", function () {
        const file = this.files[0];
        clearStudentPhotoPreview();
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Choose an image file for the student profile photo.");
            this.value = "";
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("The profile photo must be 5 MB or smaller.");
            this.value = "";
            return;
        }
        $("#studentPhoto").val("");
        selectedPhotoPreviewUrl = URL.createObjectURL(file);
        showStudentPhotoPreview(selectedPhotoPreviewUrl);
    });
    $("#studentPhoto").on("input", function () {
        if (this.value.trim()) {
            $("#studentPhotoUpload").val("");
            clearStudentPhotoPreview();
        }
    });
    $("#studentSearch, #studentStatusFilter").on("input change", renderStudents);
    $(document).on("click", ".student-name-button, .student-view-btn", function () {
        const student = findStudentById($(this).data("student-id"));
        if (student) renderStudentDetails(student);
    });
    $(document).on("click", ".student-edit-btn", function () {
        const student = findStudentById($(this).data("student-id"));
        if (student) openStudentForm(student);
    });
    $(document).on("click", ".student-delete-btn", async function () {
        if (!students) return;
        const student = findStudentById($(this).data("student-id"));
        if (!student || !confirm(`Delete ${student.firstName} ${student.lastName}'s student record?`)) return;
        const updatedStudents = students.filter((record) => record.id !== student.id);
        if (saveStudents(updatedStudents)) {
            students = updatedStudents;
            renderStudents();
            try {
                await deleteStudentPhoto(student.profilePhotoId);
            } catch (error) {
                alert(`Student record was deleted, but its stored photo could not be removed: ${error.message}`);
            }
        }
    });
    $("#studentForm").on("submit", async function (event) {
        event.preventDefault();
        if (!students || !this.reportValidity()) return;

        const formData = new FormData(this);
        const recordId = String(formData.get("recordId") || "");
        const existingStudent = recordId ? findStudentById(recordId) : null;
        const record = { id: recordId || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
        const courses = readProfileCourses("studentCoursesEditor");
        if (!courses) return;
        record.courses = courses;
        record.numberOfCourses = courses.length;
        studentFields.forEach(([field]) => {
            record[field] = String(formData.get(field) || "").trim();
        });
        const photoFile = this.elements.profilePhotoUpload.files[0];
        if (photoFile && (!photoFile.type.startsWith("image/") || photoFile.size > 5 * 1024 * 1024)) {
            alert("Choose an image file that is 5 MB or smaller.");
            return;
        }
        if (!recordId) {
            record.matriculationNumber = generateMatriculationNumber(record.admissionYear, record.department);
        }
        if (!record.matriculationNumber) {
            alert("Enter a valid admission year and department to generate the matriculation number.");
            return;
        }
        if (!/^(https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(record.profilePhotoUrl) && record.profilePhotoUrl) {
            alert("Enter a photo URL beginning with https://, http://, /, ./, or ../.");
            return;
        }
        record.profilePhotoId = photoFile
            ? `${record.id}-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`
            : (record.profilePhotoUrl ? "" : (existingStudent?.profilePhotoId || ""));

        const duplicate = students.some((student) =>
            student.id !== recordId &&
            student.matriculationNumber.trim().toLowerCase() === record.matriculationNumber.toLowerCase()
        );
        if (duplicate) {
            alert("A student with this matriculation number already exists.");
            return;
        }

        const updatedStudents = recordId
            ? students.map((student) => student.id === recordId ? record : student)
            : [...students, record];
        if (photoFile) {
            try {
                await saveStudentPhoto(record.profilePhotoId, photoFile);
            } catch (error) {
                alert(`Unable to save the profile photo: ${error.message}`);
                return;
            }
        }
        if (saveStudents(updatedStudents)) {
            students = updatedStudents;
            if (existingStudent?.profilePhotoId && existingStudent.profilePhotoId !== record.profilePhotoId) {
                try {
                    await deleteStudentPhoto(existingStudent.profilePhotoId);
                } catch (error) {
                    alert(`Student record was saved, but the previous photo could not be removed: ${error.message}`);
                }
            }
            this.reset();
            clearStudentPhotoPreview();
            document.getElementById("studentFormDialog").close();
            renderStudents();
        } else if (photoFile) {
            try {
                await deleteStudentPhoto(record.profilePhotoId);
            } catch (error) {
                alert(`Student details were not saved and the uploaded photo could not be removed: ${error.message}`);
            }
        }
    });
    $("[data-close-dialog]").on("click", function () {
        document.getElementById($(this).data("close-dialog")).close();
    });

    const lecturerFields = [
        ["lecturerEmail", "Lecturer Email"],
        ["employmentStatus", "Employment Status"],
        ["academicRank", "Academic Rank"],
        ["dateOfHiring", "Date of Hiring"],
        ["firstName", "First Name"],
        ["lastName", "Last Name"],
        ["profilePhotoUrl", "Profile Photo URL"],
        ["gender", "Gender"],
        ["highestQualification", "Highest Qualification"],
        ["facultySchool", "Faculty / School"],
        ["primaryDepartment", "Primary Department"],
        ["officeLocation", "Office Location"],
        ["isAdvisor", "Can be assigned as advisor / tutor"],
        ["phoneNumber", "Phone Number"]
    ];

    async function loadLecturers() {
        const records = await loadDirectoryRecords(
            lecturersKey,
            "lectuers.json",
            "Lecturer records",
            (lecturer) => lecturer && typeof lecturer.lecturerEmail === "string" &&
                typeof lecturer.firstName === "string" &&
            typeof lecturer.lastName === "string" &&
            (!Array.isArray(lecturer.courses) || lecturer.courses.every(isValidProfileCourse))
        );
        try {
            return await addCoursesFromSeedWhenMissing(records, "lectuers.json", lecturersKey, "lecturerEmail");
        } catch (error) {
            alert(`Unable to load lecturer course assignments: ${error.message}`);
            return records;
        }
    }

    function saveLecturers(records) {
        try {
            localStorage.setItem(lecturersKey, JSON.stringify(records));
            return true;
        } catch (error) {
            alert(`Unable to save lecturer records: ${error.message}`);
            return false;
        }
    }

    function getFilteredLecturers() {
        if (!lecturers) return null;
        const query = $("#lecturerSearch").val().trim().toLowerCase();
        const employmentStatus = $("#lecturerStatusFilter").val();
        return lecturers.filter((lecturer) => {
            const fullName = `${lecturer.firstName} ${lecturer.lastName}`.toLowerCase();
            const department = String(lecturer.primaryDepartment || "").toLowerCase();
            return (!query || fullName.includes(query) ||
                lecturer.lecturerEmail.toLowerCase().includes(query) ||
                department.includes(query)) &&
                (!employmentStatus || lecturer.employmentStatus === employmentStatus);
        }).sort((first, second) =>
            `${first.lastName} ${first.firstName}`.localeCompare(`${second.lastName} ${second.firstName}`)
        );
    }

    function renderLecturers() {
        const $body = $("#lecturersBody").empty();
        const matches = getFilteredLecturers();
        if (!matches) {
            $("#lecturersEmpty").text(lecturersLoaded ? "Lecturer records could not be loaded." : "Loading lecturer records...").show();
            if (lecturersLoaded) {
                $("#lecturersSection input, #lecturersSection select, #lecturersSection button").prop("disabled", true);
            }
            renderDashboard();
            return;
        }

        matches.forEach((lecturer) => {
            const $row = $("<tr>");
            const $nameCell = $("<td>").addClass("student-name-cell");
            const fullName = `${lecturer.firstName} ${lecturer.lastName}`;
            const $viewButton = $("<button>", {
                class: "student-name-button lecturer-name-button",
                type: "button",
                text: fullName
            }).data("lecturer-email", lecturer.lecturerEmail);
            $nameCell.append(createStudentAvatar(lecturer, "student-avatar"), $viewButton);
            $row.append($nameCell);
            $row.append($("<td>").text(lecturer.lecturerEmail));
            $row.append($("<td>").text([lecturer.primaryDepartment, lecturer.academicRank].filter(Boolean).join(" · ") || "—"));
            $row.append($("<td>").append($("<span>").addClass("student-status lecturer-status").text(lecturer.employmentStatus || "—")));
            $row.append($("<td>").text(Array.isArray(lecturer.courses) ? lecturer.courses.length : 0));
            $row.append($("<td>").text(lecturer.isAdvisor ? "Yes" : "No"));

            const $actions = $("<td>").addClass("student-row-actions");
            [
                ["View", "lecturer-view-btn"],
                ["Edit", "lecturer-edit-btn"],
                ["Delete", "lecturer-delete-btn"]
            ].forEach(([label, className]) => {
                $actions.append($("<button>", { class: className, type: "button", text: label }).data("lecturer-email", lecturer.lecturerEmail));
            });
            $row.append($actions);
            $body.append($row);
        });

        $("#lecturersEmpty")
            .text(matches.length ? "" : (lecturers.length ? "No lecturers match your search." : "No lecturer records yet. Add a lecturer to get started."))
            .toggle(matches.length === 0);
        renderDashboard();
    }

    async function createLecturerPrintReport(records) {
        const photoUrls = await Promise.all(records.map((lecturer) => getStudentPhotoUrl(lecturer)));
        const $report = $("#lecturersPrintReport").empty();
        $report.append(
            $("<h1>").text("SHIBUST Lecturer Directory"),
            $("<p>").addClass("students-print-date").text(`Generated ${new Date().toLocaleString()}`)
        );

        records.forEach((lecturer, index) => {
            const $record = $("<article>").addClass("students-print-record");
            const $heading = $("<header>").addClass("students-print-record-heading");
            $heading.append(createStudentAvatar(lecturer, "students-print-avatar", photoUrls[index]));
            $heading.append($("<div>").append(
                $("<h2>").text(`${lecturer.firstName} ${lecturer.lastName}`),
                $("<p>").text(lecturer.lecturerEmail)
            ));
            $record.append($heading);

            const groups = [
                ["Identification & Academic Rank", [
                    ["Lecturer Email", "lecturerEmail"], ["Employment Status", "employmentStatus"],
                    ["Academic Rank", "academicRank"], ["Date of Hiring", "dateOfHiring"]
                ]],
                ["Personal Information & Media", [
                    ["First Name", "firstName"], ["Last Name", "lastName"], ["Gender", "gender"],
                    ["Highest Qualification", "highestQualification"], ["Profile Photo URL", "profilePhotoUrl"]
                ]],
                ["Institutional & Departmental Mapping", [
                    ["Faculty / School", "facultySchool"], ["Primary Department", "primaryDepartment"],
                    ["Office Location", "officeLocation"], ["Can be assigned as advisor / tutor", "isAdvisor"]
                ]],
                ["Courses Taught", [
                    ["Number of Courses", { value: Array.isArray(lecturer.courses) ? lecturer.courses.length : 0 }],
                    ["Courses", { value: formatProfileCourses(lecturer.courses) || "—" }]
                ]],
                ["Contact Details", [["Phone Number", "phoneNumber"]]]
            ];

            groups.forEach(([title, fields]) => {
                const $group = $("<section>").addClass("students-print-group");
                const $table = $("<table>").append($("<caption>").text(title));
                const $body = $("<tbody>");
                fields.forEach(([label, field]) => {
                    const value = typeof field === "object" && field !== null
                        ? field.value
                        : typeof field !== "string"
                            ? field
                        : field === "isAdvisor"
                            ? (lecturer.isAdvisor ? "Yes" : "No")
                            : field === "profilePhotoUrl" && lecturer.profilePhotoId
                                ? "Uploaded from device"
                                : (lecturer[field] || "—");
                    $body.append($("<tr>").append(
                        $("<th>").attr("scope", "row").text(label),
                        $("<td>").text(value)
                    ));
                });
                $table.append($body);
                $group.append($table);
                $record.append($group);
            });
            $report.append($record);
        });

        await Promise.all(Array.from($report.find("img")).map((image) =>
            image.complete ? Promise.resolve() : new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            })
        ));
    }

    function exportLecturersToCsv(records) {
        const headers = [...lecturerFields.map(([, label]) => label), "Number of Courses", "Courses"];
        const rows = [headers, ...records.map((lecturer) =>
            [...lecturerFields.map(([field]) => {
                if (field === "isAdvisor") return lecturer.isAdvisor ? "Yes" : "No";
                if (field === "profilePhotoUrl" && lecturer.profilePhotoId) return "Uploaded from device";
                return lecturer[field] || "";
            }), Array.isArray(lecturer.courses) ? lecturer.courses.length : 0, formatProfileCourses(lecturer.courses)]
        )];
        const csv = "\uFEFF" + rows.map((row) =>
            row.map((value) => csvCell(value, true)).join(",")
        ).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "SHIBUST_Lecturers.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    $("#exportLecturersBtn").on("click", function () {
        const records = getFilteredLecturers();
        if (!records) return;
        if (!records.length) {
            alert("There are no matching lecturer records to export.");
            return;
        }
        exportLecturersToCsv(records);
    });

    $("#printLecturersBtn").on("click", async function () {
        const records = getFilteredLecturers();
        if (!records) return;
        if (!records.length) {
            alert("There are no matching lecturer records to print.");
            return;
        }
        try {
            await createLecturerPrintReport(records);
        } catch (error) {
            alert(`Unable to prepare the lecturer print report: ${error.message}`);
            return;
        }
        document.body.classList.add("lecturers-print");
        window.print();
    });
    window.addEventListener("afterprint", () => document.body.classList.remove("lecturers-print"));

    function findLecturerByEmail(email) {
        return lecturers && lecturers.find((lecturer) =>
            lecturer.lecturerEmail.toLowerCase() === String(email).toLowerCase()
        );
    }

    function clearLecturerPhotoPreview() {
        if (selectedLecturerPhotoPreviewUrl) URL.revokeObjectURL(selectedLecturerPhotoPreviewUrl);
        selectedLecturerPhotoPreviewUrl = "";
        $("#lecturerPhotoPreview").attr("src", "").prop("hidden", true);
    }

    function openLecturerForm(lecturer = null) {
        const form = $("#lecturerForm")[0];
        form.reset();
        form.elements.originalEmail.value = lecturer ? lecturer.lecturerEmail : "";
        $("#lecturerFormTitle").text(lecturer ? "Edit Lecturer" : "Add Lecturer");
        lecturerFields.forEach(([field]) => {
            if (!lecturer) return;
            if (field === "isAdvisor") {
                form.elements[field].checked = Boolean(lecturer[field]);
            } else if (field !== "profilePhotoUrl") {
                form.elements[field].value = lecturer[field] || "";
            }
        });
        $("#lecturerPhotoUpload").val("");
        clearLecturerPhotoPreview();
        if (lecturer) {
            form.elements.lecturerEmail.value = lecturer.lecturerEmail;
            form.elements.profilePhotoUrl.value = lecturer.profilePhotoUrl || "";
            getStudentPhotoUrl(lecturer).then((photoUrl) => {
                if (photoUrl && !form.elements.profilePhotoUpload.files.length && !form.elements.profilePhotoUrl.value) {
                    $("#lecturerPhotoPreview").attr("src", photoUrl).prop("hidden", false);
                }
            }).catch((error) => alert(`Unable to load the lecturer's profile photo: ${error.message}`));
        }
        renderProfileCourseEditor("lecturerCoursesEditor", lecturer?.courses);
        document.getElementById("lecturerFormDialog").showModal();
    }

    function renderLecturerDetails(lecturer) {
        const $content = $("#lecturerDetailsContent").empty();
        const $profile = $("<div>").addClass("student-detail-profile");
        $profile.append(createStudentAvatar(lecturer, "student-detail-avatar"));
        $profile.append($("<div>").append(
            $("<h3>").text(`${lecturer.firstName} ${lecturer.lastName}`),
            $("<p>").text(lecturer.lecturerEmail)
        ));
        $content.append($profile);

        const groups = [
            ["Identification & Academic Rank", [
                ["Lecturer Email", "lecturerEmail"], ["Employment Status", "employmentStatus"],
                ["Academic Rank", "academicRank"], ["Date of Hiring", "dateOfHiring"]
            ]],
            ["Personal Information & Media", [
                ["First Name", "firstName"], ["Last Name", "lastName"], ["Gender", "gender"],
                ["Highest Qualification", "highestQualification"], ["Profile Photo URL", "profilePhotoUrl"]
            ]],
            ["Institutional & Departmental Mapping", [
                ["Faculty / School", "facultySchool"], ["Primary Department", "primaryDepartment"],
                ["Office Location", "officeLocation"], ["Can be assigned as advisor / tutor", "isAdvisor"]
            ]],
            ["Courses Taught", [
                ["Number of Courses", { value: Array.isArray(lecturer.courses) ? lecturer.courses.length : 0 }],
                ["Courses", { value: formatProfileCourses(lecturer.courses) || "—" }]
            ]],
            ["Contact Details", [["Phone Number", "phoneNumber"]]]
        ];

        groups.forEach(([title, fields]) => {
            const $group = $("<section>").addClass("student-detail-group");
            $group.append($("<h3>").text(title));
            const $grid = $("<dl>").addClass("student-detail-grid");
            fields.forEach(([label, field]) => {
                const value = field === "isAdvisor"
                    ? (lecturer.isAdvisor ? "Yes" : "No")
                    : typeof field === "object" && field !== null
                        ? field.value
                    : typeof field !== "string"
                        ? field
                    : field === "profilePhotoUrl" && lecturer.profilePhotoId
                        ? "Uploaded from device"
                        : (lecturer[field] || "—");
                $grid.append($("<div>").append($("<dt>").text(label), $("<dd>").text(value)));
            });
            $group.append($grid);
            $content.append($group);
        });
        document.getElementById("lecturerDetailsDialog").showModal();
    }

    $("#addLecturerBtn").on("click", () => openLecturerForm());
    $("#lecturerSearch, #lecturerStatusFilter").on("input change", renderLecturers);
    $(document).on("click", ".lecturer-name-button, .lecturer-view-btn", function () {
        const lecturer = findLecturerByEmail($(this).data("lecturer-email"));
        if (lecturer) renderLecturerDetails(lecturer);
    });
    $(document).on("click", ".lecturer-edit-btn", function () {
        const lecturer = findLecturerByEmail($(this).data("lecturer-email"));
        if (lecturer) openLecturerForm(lecturer);
    });
    $(document).on("click", ".lecturer-delete-btn", async function () {
        if (!lecturers) return;
        const lecturer = findLecturerByEmail($(this).data("lecturer-email"));
        if (!lecturer || !confirm(`Delete ${lecturer.firstName} ${lecturer.lastName}'s lecturer record?`)) return;
        const updatedLecturers = lecturers.filter((record) =>
            record.lecturerEmail.toLowerCase() !== lecturer.lecturerEmail.toLowerCase()
        );
        if (saveLecturers(updatedLecturers)) {
            lecturers = updatedLecturers;
            renderLecturers();
            try {
                await deleteStudentPhoto(lecturer.profilePhotoId);
            } catch (error) {
                alert(`Lecturer record was deleted, but its stored photo could not be removed: ${error.message}`);
            }
        }
    });
    $("#lecturerPhotoUpload").on("change", function () {
        const file = this.files[0];
        clearLecturerPhotoPreview();
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Choose an image file for the lecturer profile photo.");
            this.value = "";
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("The profile photo must be 5 MB or smaller.");
            this.value = "";
            return;
        }
        $("#lecturerPhotoUrl").val("");
        selectedLecturerPhotoPreviewUrl = URL.createObjectURL(file);
        $("#lecturerPhotoPreview").attr("src", selectedLecturerPhotoPreviewUrl).prop("hidden", false);
    });
    $("#lecturerPhotoUrl").on("input", function () {
        if (this.value.trim()) {
            $("#lecturerPhotoUpload").val("");
            clearLecturerPhotoPreview();
        }
    });
    $("#lecturerForm").on("submit", async function (event) {
        event.preventDefault();
        if (!lecturers || !this.reportValidity()) return;

        const form = this;
        const formData = new FormData(form);
        const originalEmail = String(formData.get("originalEmail") || "").trim();
        const existingLecturer = originalEmail ? findLecturerByEmail(originalEmail) : null;
        const lecturer = {};
        const courses = readProfileCourses("lecturerCoursesEditor");
        if (!courses) return;
        lecturer.courses = courses;
        lecturer.numberOfCourses = courses.length;
        lecturerFields.forEach(([field]) => {
            if (field === "isAdvisor") {
                lecturer[field] = form.elements[field].checked;
            } else {
                lecturer[field] = String(formData.get(field) || "").trim();
            }
        });
        lecturer.lecturerEmail = lecturer.lecturerEmail.toLowerCase();
        lecturer.profilePhotoId = existingLecturer?.profilePhotoId || "";
        const photoFile = form.elements.profilePhotoUpload.files[0];
        if (photoFile && (!photoFile.type.startsWith("image/") || photoFile.size > 5 * 1024 * 1024)) {
            alert("Choose an image file that is 5 MB or smaller.");
            return;
        }
        if (lecturer.profilePhotoUrl &&
            !/^(https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(lecturer.profilePhotoUrl)) {
            alert("Enter a photo URL beginning with https://, http://, /, ./, or ../.");
            return;
        }

        const duplicate = lecturers.some((record) =>
            record.lecturerEmail.toLowerCase() !== originalEmail.toLowerCase() &&
            record.lecturerEmail.toLowerCase() === lecturer.lecturerEmail
        );
        if (duplicate) {
            alert("A lecturer with this email address already exists.");
            return;
        }

        if (photoFile) {
            lecturer.profilePhotoId = `lecturer-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        } else if (lecturer.profilePhotoUrl) {
            lecturer.profilePhotoId = "";
        }
        const updatedLecturers = existingLecturer
            ? lecturers.map((record) =>
                record.lecturerEmail.toLowerCase() === originalEmail.toLowerCase() ? lecturer : record
            )
            : [...lecturers, lecturer];

        if (photoFile) {
            try {
                await saveStudentPhoto(lecturer.profilePhotoId, photoFile);
            } catch (error) {
                alert(`Unable to save the profile photo: ${error.message}`);
                return;
            }
        }
        if (saveLecturers(updatedLecturers)) {
            lecturers = updatedLecturers;
            if (existingLecturer?.profilePhotoId && existingLecturer.profilePhotoId !== lecturer.profilePhotoId) {
                try {
                    await deleteStudentPhoto(existingLecturer.profilePhotoId);
                } catch (error) {
                    alert(`Lecturer record was saved, but the previous photo could not be removed: ${error.message}`);
                }
            }
            form.reset();
            clearLecturerPhotoPreview();
            document.getElementById("lecturerFormDialog").close();
            renderLecturers();
        } else if (photoFile) {
            try {
                await deleteStudentPhoto(lecturer.profilePhotoId);
            } catch (error) {
                alert(`Lecturer details were not saved and the uploaded photo could not be removed: ${error.message}`);
            }
        }
    });

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

    function renderDashboardBarChart(selector, entries, colorClass, isAvailable) {
        const $chart = $(selector).empty();
        if (!isAvailable) {
            $chart.append($("<p>").addClass("dashboard-chart-empty").text("Records could not be loaded."));
            return;
        }
        if (!entries.length) {
            $chart.append($("<p>").addClass("dashboard-chart-empty").text("No records to chart yet."));
            return;
        }

        const maximum = Math.max(1, ...entries.map((entry) => entry.value));
        entries.forEach((entry) => {
            const percentage = (entry.value / maximum) * 100;
            const $row = $("<div>").addClass("dashboard-chart-row");
            const $label = $("<span>").addClass("dashboard-chart-label").text(entry.label);
            const $track = $("<div>").addClass("dashboard-chart-track");
            const $bar = $("<span>")
                .addClass(`dashboard-chart-bar ${colorClass}`)
                .css("width", `${percentage}%`)
                .attr("role", "img")
                .attr("aria-label", `${entry.label}: ${entry.value}`);
            $track.append($bar);
            $row.append($label, $track, $("<strong>").text(entry.value));
            $chart.append($row);
        });
    }

    function renderDashboardCashFlow() {
        const $chart = $("#dashboardCashFlowChart").empty();
        if (!cashBook) {
            $chart.append($("<p>").addClass("dashboard-chart-empty").text("Cash Book data could not be loaded."));
            return;
        }

        const months = [];
        const now = new Date();
        for (let offset = 5; offset >= 0; offset -= 1) {
            const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            months.push({
                key,
                label: date.toLocaleDateString(undefined, { month: "short" }),
                income: 0,
                expenses: 0
            });
        }

        const monthByKey = new Map(months.map((month) => [month.key, month]));
        cashBook.transactions.forEach((transaction) => {
            const month = monthByKey.get(transaction.date.slice(0, 7));
            if (!month) return;
            if (transaction.type === "income") month.income += transaction.amount;
            else month.expenses += transaction.amount;
        });

        if (!cashBook.transactions.some((transaction) => monthByKey.has(transaction.date.slice(0, 7)))) {
            $chart.append($("<p>").addClass("dashboard-chart-empty").text("No transactions in the last six months."));
            return;
        }

        const maximum = Math.max(1, ...months.flatMap((month) => [month.income, month.expenses]));
        months.forEach((month) => {
            const $month = $("<div>").addClass("dashboard-month-row");
            const $bars = $("<div>").addClass("dashboard-month-bars");
            [
                ["income", month.income],
                ["expenses", month.expenses]
            ].forEach(([type, amount]) => {
                $bars.append($("<span>")
                    .addClass(`dashboard-month-bar dashboard-month-bar-${type}`)
                    .css("height", `${Math.max(amount ? 4 : 0, (amount / maximum) * 100)}%`)
                    .attr("role", "img")
                    .attr("aria-label", `${month.label} ${type}: ${formatCashBookAmount(amount)}`)
                    .attr("title", `${month.label} ${type}: ${formatCashBookAmount(amount)}`));
            });
            $month.append($bars, $("<span>").addClass("dashboard-month-label").text(month.label));
            $chart.append($month);
        });
    }

    function renderDashboard() {
        if (studentsLoaded && students) {
            const activeCount = students.filter((student) => student.enrollmentStatus === "Active").length;
            $("#dashboardStudentCount").text(students.length);
            $("#dashboardActiveStudents").text(`${activeCount} active`);
            const statusCounts = new Map(["Active", "Suspended", "Graduated", "Deferred"].map((status) => [status, 0]));
            students.forEach((student) => {
                const status = student.enrollmentStatus || "Not specified";
                statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
            });
            renderDashboardBarChart(
                "#dashboardStudentStatusChart",
                Array.from(statusCounts, ([label, value]) => ({ label, value })),
                "dashboard-chart-bar-teal",
                true
            );

            const levelCounts = new Map();
            students.forEach((student) => {
                const level = student.currentLevel || "Not specified";
                levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
            });
            const levels = Array.from(levelCounts, ([label, value]) => ({ label, value }))
                .sort((first, second) => first.label.localeCompare(second.label, undefined, { numeric: true }));
            renderDashboardBarChart("#dashboardStudentLevelChart", levels, "dashboard-chart-bar-blue", true);
        } else {
            $("#dashboardStudentCount").text(studentsLoaded ? "—" : "…");
            $("#dashboardActiveStudents").text(studentsLoaded ? "Records unavailable" : "Loading records");
            renderDashboardBarChart("#dashboardStudentStatusChart", [], "dashboard-chart-bar-teal", false);
            renderDashboardBarChart("#dashboardStudentLevelChart", [], "dashboard-chart-bar-blue", false);
        }

        if (lecturersLoaded && lecturers) {
            const fullTimeCount = lecturers.filter((lecturer) => lecturer.employmentStatus === "Full-Time").length;
            $("#dashboardLecturerCount").text(lecturers.length);
            $("#dashboardFullTimeLecturers").text(`${fullTimeCount} full-time`);
            const statusCounts = new Map(["Full-Time", "Part-Time", "Visiting", "On Leave"].map((status) => [status, 0]));
            lecturers.forEach((lecturer) => {
                const status = lecturer.employmentStatus || "Not specified";
                statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
            });
            renderDashboardBarChart(
                "#dashboardLecturerStatusChart",
                Array.from(statusCounts, ([label, value]) => ({ label, value })),
                "dashboard-chart-bar-purple",
                true
            );
        } else {
            $("#dashboardLecturerCount").text(lecturersLoaded ? "—" : "…");
            $("#dashboardFullTimeLecturers").text(lecturersLoaded ? "Records unavailable" : "Loading records");
            renderDashboardBarChart("#dashboardLecturerStatusChart", [], "dashboard-chart-bar-purple", false);
        }

        const results = loadPublishedResults();
        $("#dashboardResultCount").text(results ? getUniquePublishedResults(results).length : "—");
        if (cashBook) {
            const balance = cashBook.transactions.reduce((total, transaction) =>
                total + (transaction.type === "income" ? transaction.amount : -transaction.amount),
            cashBook.openingBalance);
            $("#dashboardCashBalance").text(formatCashBookAmount(balance));
        } else {
            $("#dashboardCashBalance").text("—");
        }
        renderDashboardCashFlow();
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
            renderDashboard();
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
        renderDashboard();
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
    showView("dashboardSection");
    renderCashBook();

    loadStudents().then((records) => {
        students = records;
        studentsLoaded = true;
        renderDashboard();
        if ($('.nav-link[data-view="studentsSection"]').hasClass("active")) renderStudents();
    });

    loadLecturers().then((records) => {
        lecturers = records;
        lecturersLoaded = true;
        renderDashboard();
        if ($('.nav-link[data-view="lecturersSection"]').hasClass("active")) renderLecturers();
    });

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
        renderDashboard();
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

    $(document).on("click", "[data-dashboard-action]", function () {
        const action = $(this).data("dashboard-action");
        if (action === "result") {
            showView("inputSection");
        } else if (action === "student") {
            showView("studentsSection");
            renderStudents();
            $("#addStudentBtn").trigger("click");
        } else if (action === "lecturer") {
            showView("lecturersSection");
            renderLecturers();
            $("#addLecturerBtn").trigger("click");
        } else if (action === "transaction") {
            showView("cashbookSection");
            $("#cashbookDescription").trigger("focus");
        }
    });

    renderPublishedResults();
    renderDashboard();

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