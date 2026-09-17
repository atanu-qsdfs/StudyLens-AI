from flask import Flask, render_template, request
from pypdf import PdfReader

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files.get("pdf")

    if not file:
        return {"error": "No PDF selected"}, 400

    reader = PdfReader(file)
    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return {
        "message": "PDF uploaded successfully",
        "text": text[:5000]
    }

if __name__ == "__main__":
    app.run(debug=True)