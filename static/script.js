// =========================================================
// STUDYLENS AI
// PREMIUM FRONTEND JAVASCRIPT
// =========================================================


// =========================================================
// GLOBAL STATE
// =========================================================

let studyText = "";
let currentSummary = "";
let currentMCQs = [];
let currentTopics = [];
let currentRevision = [];

let answeredQuestions = 0;
let correctAnswers = 0;

let analysisCompleted = false;
let isAnalyzing = false;


// =========================================================
// DOM ELEMENTS
// =========================================================

const pdfFile =
    document.getElementById("pdfFile");

const selectedFileName =
    document.getElementById("selectedFileName");

const selectedFileInfo =
    document.getElementById("selectedFileInfo");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const documentStatus =
    document.getElementById("documentStatus");

const summary =
    document.getElementById("summary");

const importantTopics =
    document.getElementById("importantTopics");

const revisionContainer =
    document.getElementById("revisionContainer");

const mcqSection =
    document.getElementById("mcqSection");

const mcqContainer =
    document.getElementById("mcqContainer");

const newMcqBtn =
    document.getElementById("newMcqBtn");

const quizProgress =
    document.getElementById("quizProgress");

const quizScore =
    document.getElementById("quizScore");

const quizProgressBar =
    document.getElementById("quizProgressBar");

const copyBtn =
    document.getElementById("copyBtn");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const mobileOverlay =
    document.getElementById("mobileOverlay");


// =========================================================
// UTILITY — ESCAPE HTML
// =========================================================

function escapeHTML(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// TOAST MESSAGE
// =========================================================

function showToast(
    message,
    type = "success"
) {

    const oldToast =
        document.querySelector(
            ".studylens-toast"
        );

    if (oldToast) {
        oldToast.remove();
    }

    const toast =
        document.createElement("div");

    toast.className =
        "studylens-toast";

    toast.innerHTML = `
        <div class="toast-icon">
            ${
                type === "error"
                    ? "⚠️"
                    : "✓"
            }
        </div>

        <div class="toast-message">
            ${escapeHTML(message)}
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 50);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 3000);
}


// =========================================================
// FILE SELECTION
// =========================================================

if (pdfFile) {

    pdfFile.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            if (!file) {
                return;
            }

            validateAndShowFile(file);
        }
    );
}


function validateAndShowFile(file) {

    const fileName =
        file.name.toLowerCase();

    if (!fileName.endsWith(".pdf")) {

        showToast(
            "Please select a PDF file.",
            "error"
        );

        if (pdfFile) {
            pdfFile.value = "";
        }

        return;
    }


    // 20 MB limit

    const maxSize =
        20 * 1024 * 1024;

    if (file.size > maxSize) {

        showToast(
            "PDF must be smaller than 20 MB.",
            "error"
        );

        if (pdfFile) {
            pdfFile.value = "";
        }

        return;
    }


    // Show selected file

    if (selectedFileName) {

        selectedFileName.textContent =
            file.name;
    }


    if (selectedFileInfo) {

        const sizeMB =
            (
                file.size /
                (1024 * 1024)
            ).toFixed(2);

        selectedFileInfo.textContent =
            `${sizeMB} MB • PDF document`;
    }


    if (documentStatus) {

        documentStatus.textContent =
            "PDF selected • Ready to analyze";
    }


    showToast(
        "PDF selected successfully."
    );
}


// =========================================================
// DRAG & DROP
// =========================================================

const uploadBox =
    document.querySelector(".upload-box");


if (uploadBox) {

    uploadBox.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            uploadBox.classList.add(
                "drag-over"
            );
        }
    );


    uploadBox.addEventListener(
        "dragleave",
        function () {

            uploadBox.classList.remove(
                "drag-over"
            );
        }
    );


    uploadBox.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            uploadBox.classList.remove(
                "drag-over"
            );

            const files =
                event.dataTransfer.files;

            if (
                !files ||
                !files.length
            ) {
                return;
            }

            const file =
                files[0];

            if (pdfFile) {

                const dataTransfer =
                    new DataTransfer();

                dataTransfer.items.add(file);

                pdfFile.files =
                    dataTransfer.files;
            }

            validateAndShowFile(file);
        }
    );
}


// =========================================================
// ANALYZE PDF
// =========================================================

if (analyzeBtn) {

    analyzeBtn.addEventListener(
        "click",
        analyzePDF
    );
}


async function analyzePDF() {

    if (isAnalyzing) {
        return;
    }


    if (
        !pdfFile ||
        !pdfFile.files.length
    ) {

        showToast(
            "Please select a PDF first.",
            "error"
        );

        return;
    }


    const file =
        pdfFile.files[0];

    isAnalyzing = true;


    // Button loading state

    const originalButtonHTML =
        analyzeBtn.innerHTML;

    analyzeBtn.disabled = true;

    analyzeBtn.innerHTML = `
        <span class="loading-spinner"></span>
        Analyzing with AI...
    `;


    if (documentStatus) {

        documentStatus.textContent =
            "AI is analyzing your notes...";
    }


    try {

        const formData =
            new FormData();

        formData.append(
            "pdf",
            file
        );


        const response =
            await fetch(
                "/analyze",
                {
                    method: "POST",
                    body: formData
                }
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            throw new Error(
                text ||
                "Server returned an unexpected response."
            );
        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Analysis failed."
            );
        }


        // =================================================
        // SAVE AI DATA
        // =================================================

        studyText =
            data.text || "";

        currentSummary =
            data.summary || "";

        currentTopics =
            Array.isArray(
                data.important_topics
            )
                ? data.important_topics
                : [];

        currentRevision =
            Array.isArray(
                data.revision
            )
                ? data.revision
                : [];

        currentMCQs =
            Array.isArray(
                data.mcqs
            )
                ? data.mcqs
                : [];


        analysisCompleted = true;


        // =================================================
        // RESET QUIZ
        // =================================================

        answeredQuestions = 0;
        correctAnswers = 0;


        // =================================================
        // RENDER RESULTS
        // =================================================

        renderSummary();

        renderImportantTopics();

        renderRevision(
            currentRevision
        );

        renderMCQs();


        // =================================================
        // IMPORTANT:
        // MCQs REMAIN HIDDEN AFTER ANALYSIS
        // UNTIL USER CLICKS "AI MCQs"
        // =================================================

        if (mcqSection) {

            mcqSection.classList.remove(
                "show"
            );
        }


        updateQuizProgress();


        // =================================================
        // STATUS
        // =================================================

        if (documentStatus) {

            documentStatus.textContent =
                "Analysis complete • AI results ready";
        }


        showToast(
            "Your PDF has been analyzed successfully! 🎉"
        );


        // Scroll to summary

        const summarySection =
            document.getElementById(
                "summarySection"
            );

        if (summarySection) {

            setTimeout(() => {

                summarySection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 300);
        }


    } catch (error) {

        console.error(
            "ANALYZE ERROR:",
            error
        );


        if (documentStatus) {

            documentStatus.textContent =
                "Analysis failed";
        }


        showToast(
            error.message ||
            "Something went wrong.",
            "error"
        );

    } finally {

        isAnalyzing = false;

        analyzeBtn.disabled = false;

        analyzeBtn.innerHTML =
            originalButtonHTML;
    }
}


// =========================================================
// FORMAT AI SUMMARY
// =========================================================

function formatSummary(text) {

    if (!text) {

        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>No summary yet</h3>
                <p>
                    Upload your study PDF and
                    analyze it with AI.
                </p>
            </div>
        `;
    }


    let safeText =
        escapeHTML(text);


    // Highlight technical terms

    const technicalWords = [
        "TCP/IP",
        "TCP",
        "UDP",
        "IP",
        "IPv4",
        "IPv6",
        "ARP",
        "RARP",
        "BGP",
        "EGP",
        "NAT",
        "DHCP",
        "DNS",
        "HTTP",
        "HTTPS",
        "OSI",
        "Ethernet",
        "ARPANET",
        "Internet",
        "Packet Switching",
        "Circuit Switching",
        "Datagram",
        "Subnet",
        "Subnet Mask"
    ];


    technicalWords.forEach(
        word => {

            const regex =
                new RegExp(
                    `\\b${word.replace(
                        /[-/]/g,
                        "\\$&"
                    )}\\b`,
                    "gi"
                );

            safeText =
                safeText.replace(
                    regex,
                    `<span class="tech-word">$&</span>`
                );
        }
    );


    // Highlight years

    safeText =
        safeText.replace(
            /\b(19|20)\d{2}\b/g,
            `<span class="year-word">$&</span>`
        );


    // Headings

    safeText =
        safeText.replace(
            /^### (.*)$/gm,
            `<h4>$1</h4>`
        );


    safeText =
        safeText.replace(
            /^## (.*)$/gm,
            `<h3>$1</h3>`
        );


    safeText =
        safeText.replace(
            /^# (.*)$/gm,
            `<h2>$1</h2>`
        );


    // Bold markdown

    safeText =
        safeText.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    // Bullet points

    safeText =
        safeText.replace(
            /^\s*[-•]\s+(.*)$/gm,
            `<li>$1</li>`
        );


    // Numbered points

    safeText =
        safeText.replace(
            /^\s*\d+\.\s+(.*)$/gm,
            `<li>$1</li>`
        );


    // Convert consecutive li elements

    safeText =
        safeText.replace(
            /(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs,
            `<ul>$1</ul>`
        );


    // Line breaks

    safeText =
        safeText.replace(
            /\n{2,}/g,
            "</p><p>"
        );


    safeText =
        `<p>${safeText}</p>`;


    return safeText;
}


// =========================================================
// RENDER SUMMARY
// =========================================================

function renderSummary() {

    if (!summary) {
        return;
    }

    summary.innerHTML =
        formatSummary(
            currentSummary
        );
}


// =========================================================
// IMPORTANT TOPICS
// =========================================================

function renderImportantTopics() {

    if (!importantTopics) {
        return;
    }


    if (!currentTopics.length) {

        importantTopics.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No topics yet</h3>
                <p>
                    Analyze a PDF to generate
                    important exam topics.
                </p>
            </div>
        `;

        return;
    }


    importantTopics.innerHTML =
        currentTopics
            .map(
                (topic, index) => {

                    const number =
                        String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        );


                    return `
                        <div class="topic-card">

                            <div class="topic-number">
                                ${number}
                            </div>

                            <div class="topic-content">

                                <h4>
                                    ${escapeHTML(topic)}
                                </h4>

                                <span>
                                    Exam Focus
                                </span>

                            </div>

                            <div class="topic-arrow">
                                →
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


// =========================================================
// SMART REVISION
// =========================================================

function renderRevision(points) {

    const container =
        document.getElementById(
            "revisionContainer"
        );

    if (!container) {
        return;
    }


    if (
        !Array.isArray(points) ||
        points.length === 0
    ) {

        container.innerHTML = `
            <div class="revision-empty">
                <span>🧠</span>
                <p>
                    No revision points available yet.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        points
            .map(
                (point, index) => {

                    const number =
                        String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        );


                    return `
                        <article class="revision-card">

                            <div class="revision-card-top">

                                <span class="revision-number">
                                    ${number}
                                </span>

                                <span class="revision-badge">
                                    QUICK REVIEW
                                </span>

                            </div>

                            <div class="revision-content">
                                ${formatRevisionText(point)}
                            </div>

                            <div class="revision-memory">
                                <span>🧠</span>
                                <span>
                                    Remember this point for revision
                                </span>
                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


function formatRevisionText(text) {

    if (!text) {
        return "";
    }


    let safeText =
        escapeHTML(
            String(text)
        );


    // Highlight important technical words

    safeText =
        safeText.replace(
            /\b(TCP\/IP|OSI|IPv4|IPv6|HTTP|HTTPS|DNS|ARP|RARP|BGP|LAN|MAN|WAN|TCP|UDP|IP|MAC|Ethernet)\b/gi,
            '<strong class="revision-keyword">$1</strong>'
        );


    // Highlight years

    safeText =
        safeText.replace(
            /\b(19\d{2}|20\d{2})\b/g,
            '<strong class="revision-year">$1</strong>'
        );


    return safeText;
}


// =========================================================
// MCQ RENDERER
// =========================================================

function renderMCQs() {

    if (!mcqContainer) {
        return;
    }


    if (!currentMCQs.length) {

        mcqContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❓</div>
                <h3>No MCQs available</h3>
                <p>
                    Analyze your PDF to generate
                    AI practice questions.
                </p>
            </div>
        `;

        return;
    }


    mcqContainer.innerHTML =
        currentMCQs
            .map(
                (mcq, questionIndex) => {

                    return createMCQHTML(
                        mcq,
                        questionIndex
                    );
                }
            )
            .join("");


    attachMCQListeners();
}


// =========================================================
// CREATE SINGLE MCQ
// =========================================================

function createMCQHTML(
    mcq,
    questionIndex
) {

    const question =
        escapeHTML(
            mcq.question ||
            "Question unavailable"
        );


    const options =
        mcq.options || {};


    const letters = [
        "A",
        "B",
        "C",
        "D"
    ];


    return `
        <div
            class="mcq-card"
            data-question="${questionIndex}"
        >

            <div class="mcq-question-header">

                <span class="question-badge">
                    QUESTION ${String(
                        questionIndex + 1
                    ).padStart(2, "0")}
                </span>

            </div>


            <h3 class="mcq-question">
                ${question}
            </h3>


            <div class="mcq-options">

                ${letters
                    .map(letter => {

                        const optionText =
                            escapeHTML(
                                options[letter] ||
                                "Option unavailable"
                            );


                        return `
                            <button
                                type="button"
                                class="mcq-option"
                                data-question="${questionIndex}"
                                data-option="${letter}"
                            >

                                <span class="option-letter">
                                    ${letter}
                                </span>

                                <span class="option-text">
                                    ${optionText}
                                </span>

                            </button>
                        `;
                    })
                    .join("")}

            </div>


            <div
                class="mcq-feedback"
                id="mcqFeedback${questionIndex}"
            ></div>

        </div>
    `;
}


// =========================================================
// MCQ CLICK EVENTS
// =========================================================

function attachMCQListeners() {

    const options =
        document.querySelectorAll(
            ".mcq-option"
        );


    options.forEach(
        option => {

            option.addEventListener(
                "click",
                handleMCQAnswer
            );
        }
    );
}


// =========================================================
// CHECK MCQ ANSWER
// =========================================================

function handleMCQAnswer(event) {

    const button =
        event.currentTarget;


    const questionIndex =
        Number(
            button.dataset.question
        );


    const selectedOption =
        button.dataset.option;


    const mcq =
        currentMCQs[
            questionIndex
        ];


    if (!mcq) {
        return;
    }


    const card =
        button.closest(
            ".mcq-card"
        );


    if (!card) {
        return;
    }


    // Prevent answering twice

    if (
        card.dataset.answered ===
        "true"
    ) {
        return;
    }


    card.dataset.answered =
        "true";


    const correctOption =
        String(
            mcq.answer || ""
        ).toUpperCase();


    const allOptions =
        card.querySelectorAll(
            ".mcq-option"
        );


    allOptions.forEach(
        option => {

            option.disabled =
                true;
        }
    );


    const feedback =
        document.getElementById(
            `mcqFeedback${questionIndex}`
        );


    answeredQuestions++;


    // Correct answer

    if (
        selectedOption ===
        correctOption
    ) {

        correctAnswers++;


        button.classList.add(
            "correct"
        );


        if (feedback) {

            feedback.innerHTML = `
                <span>
                    ✓ Correct answer!
                </span>
            `;

            feedback.className =
                "mcq-feedback correct-feedback";
        }


        showToast(
            "Correct! 🎉"
        );

    }


    // Wrong answer

    else {

        button.classList.add(
            "wrong"
        );


        allOptions.forEach(
            option => {

                if (
                    option.dataset.option ===
                    correctOption
                ) {

                    option.classList.add(
                        "correct"
                    );
                }
            }
        );


        if (feedback) {

            feedback.innerHTML = `
                <span>
                    ✗ Correct answer:
                    ${correctOption}
                </span>
            `;

            feedback.className =
                "mcq-feedback wrong-feedback";
        }


        showToast(
            `Wrong answer. Correct answer: ${correctOption}`,
            "error"
        );
    }


    updateQuizProgress();
}


// =========================================================
// QUIZ PROGRESS
// =========================================================

function updateQuizProgress() {

    const total =
        currentMCQs.length;


    if (quizProgress) {

        quizProgress.textContent =
            `${answeredQuestions} / ${total}`;
    }


    if (quizScore) {

        quizScore.textContent =
            correctAnswers;
    }


    if (quizProgressBar) {

        const percentage =
            total > 0
                ? (
                    answeredQuestions /
                    total
                ) * 100
                : 0;


        quizProgressBar.style.width =
            `${percentage}%`;
    }
}
// =========================================================
// NEW MCQs
// =========================================================

if (newMcqBtn) {

    newMcqBtn.addEventListener(
        "click",
        generateNewMCQs
    );
}


// =========================================================
// GENERATE NEW MCQs
// =========================================================

async function generateNewMCQs() {

    if (!studyText) {

        showToast(
            "Please analyze a PDF first.",
            "error"
        );

        return;
    }


    const originalHTML =
        newMcqBtn.innerHTML;


    newMcqBtn.disabled = true;


    // Retry up to 3 times
    // if Gemini temporarily fails.

    const maxRetries = 3;


    try {

        let data = null;

        let lastError = null;


        for (
            let attempt = 1;
            attempt <= maxRetries;
            attempt++
        ) {

            newMcqBtn.innerHTML = `
                <span class="loading-spinner"></span>
                Generating${".".repeat(attempt)}
            `;


            try {

                const response =
                    await fetch(
                        "/generate-mcqs",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            // IMPORTANT:
                            // Send the WHOLE PDF text.
                            body: JSON.stringify({
                                text: studyText
                            })
                        }
                    );


                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    data =
                        await response.json();

                } else {

                    const text =
                        await response.text();

                    throw new Error(
                        text ||
                        "Unexpected server response."
                    );
                }


                // Successful response

                if (response.ok) {

                    break;
                }


                lastError =
                    new Error(
                        data.error ||
                        "Could not generate new MCQs."
                    );


                // Retry temporary server errors

                if (
                    response.status === 500 &&
                    attempt < maxRetries
                ) {

                    const waitTime =
                        attempt * 3000;


                    newMcqBtn.innerHTML = `
                        <span class="loading-spinner"></span>
                        Retrying...
                    `;


                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                waitTime
                            )
                    );


                    continue;
                }


                throw lastError;


            } catch (error) {

                lastError =
                    error;


                if (
                    attempt >=
                    maxRetries
                ) {

                    throw error;
                }


                const waitTime =
                    attempt * 3000;


                newMcqBtn.innerHTML = `
                    <span class="loading-spinner"></span>
                    Retrying...
                `;


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            waitTime
                        )
                );
            }
        }


        // =================================================
        // VALIDATE GEMINI RESPONSE
        // =================================================

        if (
            !data ||
            !Array.isArray(
                data.mcqs
            )
        ) {

            throw new Error(
                "Gemini did not return valid MCQs."
            );
        }


        // =================================================
        // SAVE NEW MCQs
        // =================================================

        currentMCQs =
            data.mcqs;


        answeredQuestions = 0;

        correctAnswers = 0;

        // =================================================
        // RENDER NEW MCQs
        // =================================================

        renderMCQs();

        updateQuizProgress();


        // =================================================
        // SHOW MCQ SECTION
        // =================================================

        if (mcqSection) {

            mcqSection.classList.add(
                "show"
            );
        }


        showToast(
            "New MCQs generated! 🧠"
        );


    } catch (error) {

        console.error(
            "NEW MCQ ERROR:",
            error
        );


        showToast(
            error.message ||
            "Failed to generate new MCQs.",
            "error"
        );


    } finally {

        newMcqBtn.disabled = false;

        newMcqBtn.innerHTML =
            originalHTML;
    }
}


// =========================================================
// COPY SUMMARY
// =========================================================

if (copyBtn) {

    copyBtn.addEventListener(
        "click",
        copySummary
    );
}


async function copySummary() {

    if (!currentSummary) {

        showToast(
            "No summary available to copy.",
            "error"
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(
            currentSummary
        );


        showToast(
            "Summary copied! 📋"
        );


    } catch (error) {

        console.error(
            "COPY ERROR:",
            error
        );


        // Fallback method

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            currentSummary;


        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";


        document.body.appendChild(
            textarea
        );


        textarea.select();


        try {

            document.execCommand(
                "copy"
            );


            showToast(
                "Summary copied! 📋"
            );

        } catch (copyError) {

            showToast(
                "Could not copy summary.",
                "error"
            );
        }


        textarea.remove();
    }
}


// =========================================================
// SIDEBAR NAVIGATION
// =========================================================

const navLinks =
    document.querySelectorAll(
        ".nav-link"
    );


navLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                const targetId =
                    this.getAttribute(
                        "href"
                    );


                if (!targetId) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetId
                    );


                if (!target) {
                    return;
                }


                navLinks.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );
                    }
                );


                this.classList.add(
                    "active"
                );


                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });


                // Close mobile sidebar

                if (
                    sidebar &&
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    sidebar.classList.remove(
                        "open"
                    );


                    if (mobileOverlay) {

                        mobileOverlay.classList.remove(
                            "show"
                        );
                    }
                }


                // Special handling for MCQ section

                if (
                    target.id ===
                    "mcqSection"
                ) {

                    if (
                        !analysisCompleted
                    ) {

                        showToast(
                            "Analyze a PDF first.",
                            "error"
                        );

                        return;
                    }


                    if (mcqSection) {

                        mcqSection.classList.add(
                            "show"
                        );
                    }
                }
            }
        );
    }
);


// =========================================================
// INTERSECTION OBSERVER
// Updates sidebar navigation while scrolling.
// =========================================================

const sections =
    document.querySelectorAll(
        "main section[id]"
    );


if (
    sections.length &&
    navLinks.length
) {

    const sectionObserver =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }


                        const id =
                            entry.target.id;


                        navLinks.forEach(
                            link => {

                                const href =
                                    link.getAttribute(
                                        "href"
                                    );


                                if (
                                    href ===
                                    `#${id}`
                                ) {

                                    link.classList.add(
                                        "active"
                                    );

                                } else {

                                    link.classList.remove(
                                        "active"
                                    );
                                }
                            }
                        );
                    }
                );

            },
            {
                rootMargin:
                    "-20% 0px -60% 0px"
            }
        );


    sections.forEach(
        section => {

            sectionObserver.observe(
                section
            );
        }
    );
}


// =========================================================
// MOBILE MENU
// =========================================================

if (mobileMenuBtn) {

    mobileMenuBtn.addEventListener(
        "click",
        toggleMobileMenu
    );
}


function toggleMobileMenu() {

    if (!sidebar) {
        return;
    }


    sidebar.classList.toggle(
        "open"
    );


    if (mobileOverlay) {

        mobileOverlay.classList.toggle(
            "show"
        );
    }
}


// =========================================================
// MOBILE OVERLAY
// =========================================================

if (mobileOverlay) {

    mobileOverlay.addEventListener(
        "click",
        function () {

            if (sidebar) {

                sidebar.classList.remove(
                    "open"
                );
            }


            mobileOverlay.classList.remove(
                "show"
            );
        }
    );
}


// =========================================================
// CLOSE SIDEBAR WITH ESCAPE
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Escape"
        ) {

            if (
                sidebar &&
                sidebar.classList.contains(
                    "open"
                )
            ) {

                sidebar.classList.remove(
                    "open"
                );


                if (mobileOverlay) {

                    mobileOverlay.classList.remove(
                        "show"
                    );
                }
            }
        }
    }
);


// =========================================================
// HELP MODAL
// =========================================================

const helpBtn =
    document.getElementById(
        "helpBtn"
    );

const helpModal =
    document.getElementById(
        "helpModal"
    );

const closeHelpBtn =
    document.getElementById(
        "closeHelpBtn"
    );


if (helpBtn) {

    helpBtn.addEventListener(
        "click",
        function () {

            if (helpModal) {

                helpModal.classList.add(
                    "show"
                );
            }
        }
    );
}


if (closeHelpBtn) {

    closeHelpBtn.addEventListener(
        "click",
        function () {

            if (helpModal) {

                helpModal.classList.remove(
                    "show"
                );
            }
        }
    );
}


if (helpModal) {

    helpModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                helpModal
            ) {

                helpModal.classList.remove(
                    "show"
                );
            }
        }
    );
}


// =========================================================
// NETWORK STATUS
// =========================================================

function updateNetworkStatus() {

    const networkStatus =
        document.getElementById(
            "networkStatus"
        );


    if (!networkStatus) {
        return;
    }


    if (navigator.onLine) {

        networkStatus.textContent =
            "Online";

        networkStatus.classList.remove(
            "offline"
        );

    } else {

        networkStatus.textContent =
            "Offline";

        networkStatus.classList.add(
            "offline"
        );
    }
}


window.addEventListener(
    "online",
    function () {

        updateNetworkStatus();

        showToast(
            "Internet connection restored."
        );
    }
);


window.addEventListener(
    "offline",
    function () {

        updateNetworkStatus();

        showToast(
            "You are offline.",
            "error"
        );
    }
);


updateNetworkStatus();


// =========================================================
// KEYBOARD SHORTCUTS
// =========================================================

document.addEventListener(
    "keydown",
    function (event) {

        // Ctrl + Enter
        // Analyze selected PDF

        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {

            if (
                pdfFile &&
                pdfFile.files.length
            ) {

                event.preventDefault();

                analyzePDF();
            }
        }


        // Ctrl + Shift + C
        // Copy summary

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "c"
        ) {

            if (currentSummary) {

                event.preventDefault();

                copySummary();
            }
        }
    }
);


// =========================================================
// SMOOTH PAGE STARTUP
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateNetworkStatus();


        // Make sure MCQ section starts hidden

        if (mcqSection) {

            mcqSection.classList.remove(
                "show"
            );
        }
    }
);


// =========================================================
// WINDOW RESIZE
// =========================================================

window.addEventListener(
    "resize",
    function () {

        // Close mobile menu when
        // switching to desktop.

        if (
            window.innerWidth > 900
        ) {

            if (sidebar) {

                sidebar.classList.remove(
                    "open"
                );
            }


            if (mobileOverlay) {

                mobileOverlay.classList.remove(
                    "show"
                );
            }
        }
    }
);
// =========================================================
// ADDITIONAL UI HELPERS
// =========================================================

function scrollToTop() {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================================================
// BACK TO TOP BUTTON
// =========================================================

const backToTopBtn =
    document.getElementById(
        "backToTop"
    );


if (backToTopBtn) {

    window.addEventListener(
        "scroll",
        function () {

            if (
                window.scrollY >
                500
            ) {

                backToTopBtn.classList.add(
                    "show"
                );

            } else {

                backToTopBtn.classList.remove(
                    "show"
                );
            }
        }
    );


    backToTopBtn.addEventListener(
        "click",
        scrollToTop
    );
}


// =========================================================
// FOCUS MODE
// =========================================================

const focusModeBtn =
    document.getElementById(
        "focusModeBtn"
    );


if (focusModeBtn) {

    focusModeBtn.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "focus-mode"
            );


            const enabled =
                document.body.classList.contains(
                    "focus-mode"
                );


            focusModeBtn.classList.toggle(
                "active",
                enabled
            );


            showToast(
                enabled
                    ? "Focus Mode enabled 🎯"
                    : "Focus Mode disabled"
            );
        }
    );
}


// =========================================================
// STUDENT MODE
// =========================================================

const studentModeBtn =
    document.getElementById(
        "studentModeBtn"
    );


if (studentModeBtn) {

    studentModeBtn.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "student-mode"
            );


            const enabled =
                document.body.classList.contains(
                    "student-mode"
                );


            studentModeBtn.classList.toggle(
                "active",
                enabled
            );


            showToast(
                enabled
                    ? "Student Mode enabled 📚"
                    : "Student Mode disabled"
            );
        }
    );
}


// =========================================================
// QUICK REVISION BUTTON
// =========================================================

const quickRevisionBtn =
    document.getElementById(
        "quickRevisionBtn"
    );


if (quickRevisionBtn) {

    quickRevisionBtn.addEventListener(
        "click",
        function () {

            const revisionSection =
                document.getElementById(
                    "revisionSection"
                );


            if (!revisionSection) {
                return;
            }


            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            revisionSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}


// =========================================================
// SHOW MCQ SECTION BUTTON
// =========================================================

const showMCQBtn =
    document.getElementById(
        "showMCQBtn"
    );


if (showMCQBtn) {

    showMCQBtn.addEventListener(
        "click",
        function () {

            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            if (mcqSection) {

                mcqSection.classList.add(
                    "show"
                );


                mcqSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
    );
}


// =========================================================
// AI SUMMARY NAVIGATION BUTTON
// =========================================================

const summaryNavBtn =
    document.getElementById(
        "summaryNavBtn"
    );


if (summaryNavBtn) {

    summaryNavBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            const summarySection =
                document.getElementById(
                    "summarySection"
                );


            if (!summarySection) {
                return;
            }


            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            summarySection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}


// =========================================================
// EXAM FOCUS NAVIGATION
// =========================================================

const examFocusNavBtn =
    document.getElementById(
        "examFocusNavBtn"
    );


if (examFocusNavBtn) {

    examFocusNavBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            const examFocusSection =
                document.getElementById(
                    "examFocusSection"
                );


            if (!examFocusSection) {
                return;
            }


            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            examFocusSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}


// =========================================================
// AI MCQ NAVIGATION
// =========================================================

const mcqNavBtn =
    document.getElementById(
        "mcqNavBtn"
    );


if (mcqNavBtn) {

    mcqNavBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            if (mcqSection) {

                mcqSection.classList.add(
                    "show"
                );


                mcqSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
    );
}


// =========================================================
// SMART REVISION NAVIGATION
// =========================================================

const revisionNavBtn =
    document.getElementById(
        "revisionNavBtn"
    );


if (revisionNavBtn) {

    revisionNavBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            const revisionSection =
                document.getElementById(
                    "revisionSection"
                );


            if (!revisionSection) {
                return;
            }


            if (!analysisCompleted) {

                showToast(
                    "Analyze a PDF first.",
                    "error"
                );

                return;
            }


            revisionSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}


// =========================================================
// FILE INPUT RESET
// =========================================================

function resetStudyData() {

    studyText = "";

    currentSummary = "";

    currentMCQs = [];

    currentTopics = [];

    currentRevision = [];

    answeredQuestions = 0;

    correctAnswers = 0;

    analysisCompleted = false;


    if (summary) {

        summary.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Ready to study</h3>
                <p>
                    Upload your PDF and let
                    StudyLens AI analyze it.
                </p>
            </div>
        `;
    }


    if (importantTopics) {

        importantTopics.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No topics yet</h3>
                <p>
                    Upload a study PDF first.
                </p>
            </div>
        `;
    }


    if (revisionContainer) {

        revisionContainer.innerHTML = `
            <div class="revision-empty">
                <span>🧠</span>
                <p>
                    No revision points available yet.
                </p>
            </div>
        `;
    }


    if (mcqContainer) {

        mcqContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❓</div>
                <h3>No MCQs yet</h3>
                <p>
                    Analyze your PDF first.
                </p>
            </div>
        `;
    }


    if (mcqSection) {

        mcqSection.classList.remove(
            "show"
        );
    }


    updateQuizProgress();
}


// =========================================================
// CLEAR FILE BUTTON
// =========================================================

const clearFileBtn =
    document.getElementById(
        "clearFileBtn"
    );


if (clearFileBtn) {

    clearFileBtn.addEventListener(
        "click",
        function () {

            if (pdfFile) {

                pdfFile.value = "";
            }


            if (selectedFileName) {

                selectedFileName.textContent =
                    "No PDF selected";
            }


            if (selectedFileInfo) {

                selectedFileInfo.textContent =
                    "Choose a PDF to begin";
            }


            if (documentStatus) {

                documentStatus.textContent =
                    "Waiting for PDF";
            }


            resetStudyData();


            showToast(
                "PDF selection cleared."
            );
        }
    );
}


// =========================================================
// PREVENT ACCIDENTAL FORM SUBMISSION
// =========================================================

document.addEventListener(
    "submit",
    function (event) {

        const form =
            event.target;


        if (
            form &&
            form.dataset &&
            form.dataset.allowSubmit ===
                "true"
        ) {

            return;
        }


        event.preventDefault();
    }
);


// =========================================================
// LOADING SPINNER FALLBACK
// =========================================================

function ensureSpinnerStyles() {

    if (
        document.getElementById(
            "studylens-spinner-style"
        )
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "studylens-spinner-style";


    style.textContent = `
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            animation: studylens-spin .7s linear infinite;
            vertical-align: -3px;
            margin-right: 7px;
        }

        @keyframes studylens-spin {
            to {
                transform: rotate(360deg);
            }
        }
    `;


    document.head.appendChild(
        style
    );
}


ensureSpinnerStyles();


// =========================================================
// INITIAL UI STATE
// =========================================================

function initializeStudyLens() {

    if (mcqSection) {

        mcqSection.classList.remove(
            "show"
        );
    }


    updateNetworkStatus();


    if (
        selectedFileName &&
        (!pdfFile ||
            !pdfFile.files.length)
    ) {

        selectedFileName.textContent =
            "No PDF selected";
    }


    if (selectedFileInfo) {

        if (
            !pdfFile ||
            !pdfFile.files.length
        ) {

            selectedFileInfo.textContent =
                "Choose a PDF to begin";
        }
    }


    if (documentStatus) {

        if (
            !analysisCompleted
        ) {

            documentStatus.textContent =
                "Waiting for PDF";
        }
    }


    updateQuizProgress();
}


// =========================================================
// RUN INITIALIZATION
// =========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeStudyLens
    );

} else {

    initializeStudyLens();
}


// =========================================================
// DEBUG INFORMATION
// =========================================================

console.log(
    "StudyLens AI frontend loaded successfully."
);

console.log(
    "Analysis status:",
    analysisCompleted
);