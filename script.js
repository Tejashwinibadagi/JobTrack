const API_URL = "https://jobtrack-backend-0j2s.onrender.com/api";
let applications = [];
let companies = [];
let currentJobs = [];

// -------------------- SHARED HELPERS --------------------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];
    });
}

function isSafeHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
        return false;
    }
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = message;
    }
}

// -------------------- FIND JOBS --------------------

const jobResults = document.getElementById("jobResults");
const jobSearchForm = document.getElementById("jobSearchForm");
const jobSearchInput = document.getElementById("jobSearch");
const jobLocationSelect = document.getElementById("jobLocation");
const jobSearchMessage = document.getElementById("jobSearchMessage");
const clearJobSearchButton = document.getElementById("clearJobSearchButton");

function isRemoteEligible(job) {
    const location = String(
        job.candidate_required_location || ""
    ).toLowerCase().trim();

    // Do not treat an empty location as proof that the job is remote.
    if (!location) {
        return false;
    }

    return location.includes("remote")
        || location.includes("worldwide")
        || location.includes("anywhere")
        || location.includes("all countries")
        || location.includes("everywhere");
}

function jobMatchesLocation(job, selectedLocation) {
    if (!selectedLocation) {
        return true;
    }

    const location = String(
        job.candidate_required_location || ""
    ).toLowerCase().trim();

    const requestedLocation = selectedLocation.toLowerCase().trim();

    if (!location) {
        return false;
    }

    if (requestedLocation === "remote") {
        return isRemoteEligible(job);
    }

    // Worldwide listings can accept applicants from the selected location.
    if (
        location.includes("worldwide")
        || location.includes("anywhere")
        || location.includes("all countries")
        || location.includes("everywhere")
    ) {
        return true;
    }

    return location.includes(requestedLocation);
}

function displayJobListings(jobs) {
    if (!jobResults) {
        return;
    }

    if (!Array.isArray(jobs) || jobs.length === 0) {
        jobResults.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⌕</div>
                <h3>No matching jobs found</h3>
                <p>
                    Try another keyword or select All Locations.
                    You can also search for Java, software development,
                    internships, or entry-level roles.
                </p>
            </div>
        `;
        return;
    }

    jobResults.innerHTML = jobs.map(function (job, index) {
        const title = escapeHTML(job.title || "Job title unavailable");

        const company = escapeHTML(
            job.company_name || "Company not specified"
        );

        const eligibleLocations = escapeHTML(
            job.candidate_required_location || "Not specified"
        );

        const jobType = escapeHTML(
            job.job_type || "Not specified"
        );

        const salary = escapeHTML(
            job.salary || "Not specified"
        );

        const date = escapeHTML(
            job.publication_date
                ? job.publication_date.substring(0, 10)
                : "Not specified"
        );

        const tags = Array.isArray(job.tags)
            ? job.tags.map(function (tag) {
                return escapeHTML(tag);
            }).join(", ")
            : "";

        const safeUrl = isSafeHttpUrl(job.url) ? job.url : "";

        const remoteLabel = isRemoteEligible(job)
            ? `<span class="job-badge">Remote eligible</span>`
            : "";

        const safeIndex = Number(index);

        return `
            <article class="job-card">

                <div class="job-card-header">
                    <h3>${title}</h3>
                    ${remoteLabel}
                </div>

                <p>
                    <strong>Company:</strong>
                    ${company}
                </p>

                <p>
                    <strong>Eligible locations:</strong>
                    ${eligibleLocations}
                </p>

                <p>
                    <strong>Job type:</strong>
                    ${jobType}
                </p>

                <p>
                    <strong>Salary:</strong>
                    ${salary}
                </p>

                <p>
                    <strong>Published:</strong>
                    ${date}
                </p>

                ${tags ? `
                    <p>
                        <strong>Skills/tags:</strong>
                        ${tags}
                    </p>
                ` : ""}

                <p class="job-source">
                    Source:
                    ${
                        safeUrl
                            ? `<a href="${escapeHTML(safeUrl)}"
                                  target="_blank"
                                  rel="noopener noreferrer">Remotive</a>`
                            : "Remotive"
                    }
                </p>

                <div class="job-actions">

                    ${
                        safeUrl
                            ? `<a class="job-link"
                                  href="${escapeHTML(safeUrl)}"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                  View Original Job
                               </a>`
                            : `<span>Original link unavailable</span>`
                    }

                    <button
                        type="button"
                        class="track-job-button"
                        data-job-index="${safeIndex}">
                        Track Application
                    </button>

                </div>

            </article>
        `;
    }).join("");

    jobResults.querySelectorAll(".track-job-button").forEach(
        function (button) {
            button.addEventListener("click", function () {
                const index = Number(button.dataset.jobIndex);
                const selectedJob = jobs[index];

                if (selectedJob) {
                    openApplicationForm(selectedJob);
                }
            });
        }
    );
}

function showJobMessage(message) {
    if (jobSearchMessage) {
        jobSearchMessage.textContent = message;
    }
}

async function searchJobs() {
    const searchTerm = jobSearchInput?.value.trim()
        || "java developer";

    const selectedLocation = jobLocationSelect?.value || "";

    if (!jobResults) {
        return;
    }

    showJobMessage("Searching Remotive for jobs...");

    jobResults.innerHTML = `
        <div class="empty-state">
            <p>Loading job listings. Please wait...</p>
        </div>
    `;

    try {
        const url =
            `${API_URL}/jobs?search=${encodeURIComponent(searchTerm)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Job search failed. HTTP status: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.jobs)) {
            throw new Error(
                "The job API returned an unexpected response."
            );
        }

        // Keep only usable listings with valid HTTP/HTTPS original links.
        currentJobs = data.jobs.filter(function (job) {
            return job
                && job.title
                && isSafeHttpUrl(job.url);
        });

        const filteredJobs = currentJobs.filter(function (job) {
            return jobMatchesLocation(job, selectedLocation);
        });

        displayJobListings(filteredJobs);

        if (filteredJobs.length === 0) {
            showJobMessage(
                "No jobs matched your search and location. " +
                "Try another keyword or select All Locations."
            );
        } else {
            showJobMessage(
                `Showing ${filteredJobs.length} job listing(s) from Remotive. ` +
                "Check the original listing for eligibility, experience, " +
                "location restrictions, and application instructions."
            );
        }

    } catch (error) {
        console.error("Error searching jobs:", error);

        jobResults.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load jobs</h3>
                <p>
                    Check that your Spring Boot application is running
                    and that the /api/jobs endpoint works.
                </p>
                <button
                    type="button"
                    id="retryJobSearchButton"
                    class="primary-button">
                    Try Again
                </button>
            </div>
        `;

        showJobMessage(
            "Job search failed. Check the backend connection and try again."
        );

        const retryButton =
            document.getElementById("retryJobSearchButton");

        if (retryButton) {
            retryButton.addEventListener("click", searchJobs);
        }
    }
}

if (jobSearchForm) {
    jobSearchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        searchJobs();
    });
}

if (jobLocationSelect) {
    jobLocationSelect.addEventListener("change", searchJobs);
}

if (clearJobSearchButton) {
    clearJobSearchButton.addEventListener("click", function () {
        if (jobSearchInput) {
            jobSearchInput.value = "";
        }

        if (jobLocationSelect) {
            jobLocationSelect.value = "";
        }

        searchJobs();
    });
}

// -------------------- APPLICATION FORM --------------------

function openApplicationForm(job) {
    const form = document.getElementById("applicationForm");
    const formMessage = document.getElementById("formMessage");

    if (!form) {
        return;
    }

    form.style.display = "block";

    const jobRoleInput = document.getElementById("jobRole");
    const applicationDateInput =
        document.getElementById("applicationDate");

    const applicationStatusInput =
        document.getElementById("applicationStatus");

    const applyLinkInput = document.getElementById("applyLink");
    const companyIdInput = document.getElementById("companyId");

    if (jobRoleInput) {
        jobRoleInput.value = job.title || "";
    }

    if (applicationDateInput) {
        applicationDateInput.value =
            new Date().toLocaleDateString("en-CA");
    }

    if (applicationStatusInput) {
        applicationStatusInput.value = "Saved";
    }

    if (applyLinkInput) {
        applyLinkInput.value = isSafeHttpUrl(job.url)
            ? job.url
            : "";
    }

    if (companyIdInput) {
        const matchingCompany = companies.find(function (company) {
            return String(company.companyName || "")
                .trim()
                .toLowerCase()
                === String(job.company_name || "")
                    .trim()
                    .toLowerCase();
        });

        companyIdInput.value = matchingCompany
            ? matchingCompany.companyId
            : "";
    }

    if (formMessage) {
        formMessage.textContent = companyIdInput?.value
            ? "Review the job details, choose a status, and save."
            : "Select a company that exists in your database before saving. " +
              "If this company is not listed, add it to your company records first.";
    }

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

const cancelFormButton =
    document.getElementById("cancelFormButton");

if (cancelFormButton) {
    cancelFormButton.addEventListener("click", function () {
        const form = document.getElementById("applicationForm");

        if (form) {
            form.style.display = "none";
        }
    });
}

// -------------------- LOAD COMPANIES --------------------

async function loadCompanies() {
    try {
        const response = await fetch(`${API_URL}/companies`);

        if (!response.ok) {
            throw new Error(
                `Could not load companies: ${response.status}`
            );
        }

        companies = await response.json();

        const companySelect = document.getElementById("companyId");

        if (!companySelect) {
            return;
        }

        companySelect.innerHTML = `
            <option value="">Select Company</option>

            ${companies.map(function (company) {
                return `
                    <option value="${escapeHTML(company.companyId)}">
                        ${escapeHTML(company.companyName)}
                    </option>
                `;
            }).join("")}
        `;

    } catch (error) {
        console.error("Error loading companies:", error);
    }
}

// -------------------- SAVE APPLICATION --------------------

const applicationForm = document.getElementById("applicationForm");

if (applicationForm) {
    applicationForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const formMessage =
                document.getElementById("formMessage");

            const saveButton =
                document.getElementById("saveApplicationButton");

            const companyId =
                document.getElementById("companyId")?.value;

            const jobRole =
                document.getElementById("jobRole")?.value.trim();

            const applicationDate =
                document.getElementById("applicationDate")?.value;

            const status =
                document.getElementById("applicationStatus")?.value;

            const applyLink =
                document.getElementById("applyLink")?.value.trim();

            if (!companyId) {
                if (formMessage) {
                    formMessage.textContent =
                        "Please select a company that exists in your database.";
                }

                return;
            }

            if (!jobRole || !applicationDate || !status) {
                if (formMessage) {
                    formMessage.textContent =
                        "Please complete all required fields.";
                }

                return;
            }

            if (applyLink && !isSafeHttpUrl(applyLink)) {
                if (formMessage) {
                    formMessage.textContent =
                        "Please enter a valid HTTP or HTTPS application link.";
                }

                return;
            }

            const application = {
                company: {
                    companyId: Number(companyId)
                },
                jobRole: jobRole,
                applicationDate: applicationDate,
                status: status,
                applyLink: applyLink
            };

            try {
                if (saveButton) {
                    saveButton.disabled = true;
                }

                const response = await fetch(
                    `${API_URL}/applications`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(application)
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();

                    throw new Error(
                        errorText || `Save failed: ${response.status}`
                    );
                }

                if (formMessage) {
                    formMessage.textContent =
                        "Application saved successfully!";
                }

                applicationForm.reset();
                applicationForm.style.display = "none";

                await loadApplications();

            } catch (error) {
                console.error("Error saving application:", error);

                if (formMessage) {
                    formMessage.textContent =
                        "Could not save the application. " +
                        "Check the backend and required fields, then try again.";
                }

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                }
            }
        }
    );
}

// -------------------- DASHBOARD COUNTS --------------------

function updateDashboard() {
    const totalCount = document.getElementById("totalCount");
    const appliedCount = document.getElementById("appliedCount");
    const interviewCount = document.getElementById("interviewCount");
    const selectedCount = document.getElementById("selectedCount");

    if (totalCount) {
        totalCount.textContent = applications.length;
    }

    if (appliedCount) {
        appliedCount.textContent = applications.filter(
            app => app.status === "Applied"
        ).length;
    }

    if (interviewCount) {
        interviewCount.textContent = applications.filter(
            app => app.status === "Interview"
        ).length;
    }

    if (selectedCount) {
        selectedCount.textContent = applications.filter(
            app => app.status === "Selected"
        ).length;
    }
}

// -------------------- DISPLAY APPLICATIONS --------------------

function displayApplications(data) {
    const table = document.getElementById("applicationTable");

    if (!table) {
        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6">No applications found.</td>
            </tr>
        `;

        return;
    }

    table.innerHTML = data.map(function (app) {
        const id = Number(app.applicationId);

        const companyName = escapeHTML(
            app.company?.companyName || "Unknown"
        );

        const role = escapeHTML(app.jobRole || "");
        const date = escapeHTML(app.applicationDate || "");
        const status = app.status || "Saved";

        const safeLink = isSafeHttpUrl(app.applyLink)
            ? app.applyLink
            : "";

        const statuses = [
            "Saved",
            "Applied",
            "Interview",
            "Selected",
            "Rejected"
        ];

        return `
            <tr>
                <td>${companyName}</td>
                <td>${role}</td>
                <td>${date}</td>

                <td>
                    <select
                        class="status-select"
                        data-application-id="${id}">

                        ${statuses.map(function (option) {
                            return `
                                <option
                                    value="${option}"
                                    ${option === status ? "selected" : ""}>
                                    ${option}
                                </option>
                            `;
                        }).join("")}

                    </select>
                </td>

                <td>
                    ${
                        safeLink
                            ? `<a href="${escapeHTML(safeLink)}"
                                  target="_blank"
                                  rel="noopener noreferrer">View Link</a>`
                            : "No link"
                    }
                </td>
            </tr>
        `;
    }).join("");

    table.querySelectorAll(".status-select").forEach(
        function (select) {
            select.addEventListener("change", async function () {
                await updateApplicationStatus(
                    Number(select.dataset.applicationId),
                    select.value
                );
            });
        }
    );
}

// -------------------- LOAD APPLICATIONS --------------------

async function loadApplications() {
    try {
        const response = await fetch(`${API_URL}/applications`);

        if (!response.ok) {
            throw new Error(
                `Could not load applications: ${response.status}`
            );
        }

        applications = await response.json();

        filterApplications();
        updateDashboard();

    } catch (error) {
        console.error("Error loading applications:", error);

        const table = document.getElementById("applicationTable");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        Could not load applications.
                        Check that the backend is running.
                    </td>
                </tr>
            `;
        }
    }
}

// -------------------- SEARCH MY APPLICATIONS --------------------

function filterApplications() {
    const searchInput = document.getElementById("searchInput");

    const searchTerm =
        searchInput?.value.trim().toLowerCase() || "";

    const filteredApplications = applications.filter(function (app) {
        const companyName = app.company?.companyName || "";
        const role = app.jobRole || "";
        const status = app.status || "";

        return companyName.toLowerCase().includes(searchTerm)
            || role.toLowerCase().includes(searchTerm)
            || status.toLowerCase().includes(searchTerm);
    });

    displayApplications(filteredApplications);
}

const applicationSearchInput =
    document.getElementById("searchInput");

if (applicationSearchInput) {
    applicationSearchInput.addEventListener(
        "input",
        filterApplications
    );
}

// -------------------- UPDATE APPLICATION STATUS --------------------

async function updateApplicationStatus(applicationId, status) {
    try {
        const response = await fetch(
            `${API_URL}/applications/${applicationId}/status`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(status)
            }
        );

        if (!response.ok) {
            throw new Error(
                `Status update failed: ${response.status}`
            );
        }

        await loadApplications();

    } catch (error) {
        console.error("Error updating status:", error);

        alert(
            "Could not update the status. Please check the backend and try again."
        );

        await loadApplications();
    }
}

// -------------------- RESUME UPLOAD --------------------

const uploadButton = document.getElementById("uploadButton");

if (uploadButton) {
    uploadButton.addEventListener("click", async function () {
        const resumeFile = document.getElementById("resumeFile");
        const fileMessage = document.getElementById("fileMessage");

        if (
            !resumeFile
            || !resumeFile.files
            || resumeFile.files.length === 0
        ) {
if (fileMessage) {
    fileMessage.textContent =
        "Choose a PDF, DOC, or DOCX resume using the file picker first.";
}

if (resumeFile) {
    resumeFile.click();
}

return;
}

        const file = resumeFile.files[0];

        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        const allowedExtensions = [".pdf", ".doc", ".docx"];

        const fileName = file.name.toLowerCase();

       if (
    !allowedExtensions.some(
        extension => fileName.endsWith(extension)
    )
) {
            if (fileMessage) {
                fileMessage.textContent =
                    "Please select a valid PDF, DOC, or DOCX resume.";
            }

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            if (fileMessage) {
                fileMessage.textContent =
                    "Your resume must be 5 MB or smaller.";
            }

            return;
        }

        const formData = new FormData();

        formData.append("file", file);

        try {
            uploadButton.disabled = true;
            uploadButton.textContent = "Uploading...";

            if (fileMessage) {
                fileMessage.textContent =
                    "Uploading and analyzing your resume...";
            }

            const response = await fetch(`${API_URL}/resumes`, {
                method: "POST",
                body: formData
            });

            const responseText = await response.text();

            let result = {};

            try {
                result = responseText
                    ? JSON.parse(responseText)
                    : {};
            } catch (error) {
                result = {};
            }

            if (!response.ok) {
                throw new Error(
                    result.message
                    || result.detail
                    || `Upload failed. HTTP ${response.status}`
                );
            }

            if (fileMessage) {
                const skills = Array.isArray(result.skills)
                    ? result.skills
                    : [];

                if (skills.length > 0) {
                    fileMessage.textContent =
                        `${result.message || "Resume analyzed successfully!"} `
                        + `Skills found (${skills.length}): `
                        + skills.join(", ");
                } else {
                    fileMessage.textContent =
                        `${result.message || "Resume uploaded successfully!"} `
                        + "No recognized skills were found in the resume.";
                }
            }

        } catch (error) {
            console.error("Resume upload error:", error);

            if (fileMessage) {
                fileMessage.textContent =
                    error.message
                    || "Could not upload your resume. " +
                       "Make sure the Spring Boot backend is running.";
            }

        } finally {
            uploadButton.disabled = false;
            uploadButton.textContent = "Upload Resume";
        }
    });
}

// -------------------- START JOBTRACK --------------------

loadCompanies();
loadApplications();
