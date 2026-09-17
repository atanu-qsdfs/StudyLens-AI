const analyzeBtn = document.getElementById("analyzeBtn");

analyzeBtn.addEventListener("click", async () => {
    const fileInput = document.getElementById("pdfFile");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a PDF file first.");
        return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    analyzeBtn.textContent = "Analyzing...";
    analyzeBtn.disabled = true;

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById("summary").textContent =
            data.text || "No text found in the PDF.";

    } catch (error) {
        alert("Something went wrong.");
        console.error(error);
    } finally {
        analyzeBtn.textContent = "Analyze Notes";
        analyzeBtn.disabled = false;
    }
});