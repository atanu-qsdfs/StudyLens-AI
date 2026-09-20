from flask import Flask, render_template, request, jsonify
from pypdf import PdfReader
from dotenv import load_dotenv
from google import genai
from google.genai import types
import os
import json
import time
import re

# =========================================================
# STUDYLENS AI
# GEMINI AI BACKEND
# =========================================================

load_dotenv()

app = Flask(__name__)

# =========================================================
# GEMINI SETUP
# =========================================================

gemini_api_key = os.getenv("GEMINI_API_KEY")

if not gemini_api_key:
    print("WARNING: GEMINI_API_KEY is not configured.")

client = genai.Client(api_key=gemini_api_key)

# Keep the Gemini model that is currently working for you.
MODEL_NAME = "gemini-3.8-flash"


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# PDF TEXT EXTRACTION
# =========================================================

def extract_pdf_text(uploaded_file):
    reader = PdfReader(uploaded_file)

    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""

        if page_text.strip():
            pages.append(
                f"\n--- PAGE {page_number} ---\n{page_text}"
            )

    return "\n".join(pages)




class GeminiQuotaExceeded(Exception):
    pass


class GeminiOverloaded(Exception):
    pass


def call_gemini_with_retry(
    contents,
    response_schema,
    temperature,
    max_output_tokens,
    max_retries=3,
    base_delay=4,
):

    last_error = None

    for attempt in range(1, max_retries + 1):

        try:

            return client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                ),
            )

        except Exception as error:

            error_text = str(error)
            last_error = error

            # ---- quota exceeded: don't retry, fail fast ----
            if "RESOURCE_EXHAUSTED" in error_text or "429" in error_text:

                quota_match = re.search(
                    r"'quotaValue':\s*'(\d+)'", error_text
                )
                quota_value = quota_match.group(1) if quota_match else "your"

                raise GeminiQuotaExceeded(
                    f"Gemini free-tier daily quota reached "
                    f"({quota_value} requests/day for {MODEL_NAME}). "
                    f"Wait for the daily reset, use a different model, "
                    f"or enable billing on your Google Cloud project "
                    f"to raise the limit."
                ) from error

            # ---- model temporarily overloaded: retry ----
            if "UNAVAILABLE" in error_text or "503" in error_text:

                print(
                    f"Gemini overloaded (attempt {attempt}/{max_retries}), "
                    f"retrying in {base_delay * attempt}s..."
                )

                if attempt < max_retries:
                    time.sleep(base_delay * attempt)
                    continue

                raise GeminiOverloaded(
                    "Gemini is currently overloaded (high demand). "
                    "Please try again in a minute."
                ) from error

            # ---- anything else: don't retry, surface as-is ----
            raise

    raise last_error


# =========================================================
# AI ANALYSIS
# =========================================================

@app.route("/analyze", methods=["POST"])
def analyze():

    try:
        uploaded_file = request.files.get("pdf")

        if not uploaded_file:
            return jsonify({
                "error": "No PDF selected."
            }), 400

        filename = uploaded_file.filename or ""

        if not filename.lower().endswith(".pdf"):
            return jsonify({
                "error": "Please upload a PDF file."
            }), 400

        # -------------------------------------------------
        # EXTRACT PDF
        # -------------------------------------------------

        full_text = extract_pdf_text(uploaded_file)

        if not full_text.strip():
            return jsonify({
                "error": "No readable text found in PDF."
            }), 400

        print(
            f"PDF extracted successfully: "
            f"{len(full_text)} characters"
        )

        # -------------------------------------------------
        # IMPROVED STUDYLENS PROMPT
        # -------------------------------------------------

        prompt = f"""


SUMMARY
IMPORTANT TOPICS
REVISION
MCQS

STUDY MATERIAL:
{full_text}
"""

        # -------------------------------------------------
        # STRUCTURED JSON RESPONSE
        # -------------------------------------------------

        response_schema = {
            "type": "OBJECT",
            "properties": {

                "summary": {
                    "type": "STRING"
                },

                "important_topics": {
                    "type": "ARRAY",
                    "items": {
                        "type": "STRING"
                    }
                },

                "revision": {
                    "type": "ARRAY",
                    "items": {
                        "type": "STRING"
                    }
                },

                "mcqs": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {

                            "question": {
                                "type": "STRING"
                            },

                            "options": {
                                "type": "OBJECT",
                                "properties": {

                                    "A": {
                                        "type": "STRING"
                                    },

                                    "B": {
                                        "type": "STRING"
                                    },

                                    "C": {
                                        "type": "STRING"
                                    },

                                    "D": {
                                        "type": "STRING"
                                    }

                                },
                                "required": [
                                    "A",
                                    "B",
                                    "C",
                                    "D"
                                ]
                            },

                            "answer": {
                                "type": "STRING"
                            }

                        },

                        "required": [
                            "question",
                            "options",
                            "answer"
                        ]
                    }
                }
            },

            "required": [
                "summary",
                "important_topics",
                "revision",
                "mcqs"
            ]
        }

        print("Sending PDF to Gemini AI...")

        response = call_gemini_with_retry(
            contents=prompt,
            response_schema=response_schema,
            temperature=0.25,
            max_output_tokens=8000,
        )

        # -------------------------------------------------
        # SAFE GEMINI RESPONSE PARSING
        # -------------------------------------------------

        try:
            ai_result = json.loads(response.text)
        except json.JSONDecodeError as e:
            print("JSON ERROR:", e)
            print("Gemini response:")
            print(response.text[:3000])
            raise ValueError(
                "Gemini returned incomplete or invalid JSON. Please try again."
            )

        summary = ai_result.get("summary", "")

        important_topics = ai_result.get(
            "important_topics",
            []
        )

        revision = ai_result.get(
            "revision",
            []
        )

        mcqs = ai_result.get(
            "mcqs",
            []
        )

        print("Gemini analysis completed successfully.")

        # -------------------------------------------------
        # SEND TO FRONTEND
        # -------------------------------------------------

        return jsonify({
            "message": "PDF analyzed successfully with Gemini.",
            "summary": summary,
            "important_topics": important_topics,
            "revision": revision,
            "mcqs": mcqs,
            "text": full_text[:20000]
        })

    except GeminiQuotaExceeded as error:

        print("GEMINI QUOTA ERROR:", error)

        return jsonify({
            "error": str(error)
        }), 429

    except GeminiOverloaded as error:

        print("GEMINI OVERLOADED:", error)

        return jsonify({
            "error": str(error)
        }), 503

    except json.JSONDecodeError as error:

        print("JSON ERROR:", error)

        return jsonify({
            "error": "Gemini returned an invalid response. Please try again."
        }), 500

    except Exception as error:

        print("GEMINI ERROR:", error)

        return jsonify({
            "error": str(error)
        }), 500


# =========================================================
# GENERATE NEW MCQS
# =========================================================

@app.route("/generate-mcqs", methods=["POST"])
def generate_mcqs():

    try:

        data = request.get_json(silent=True) or {}

        notes = data.get("text", "")

        if not notes.strip():
            return jsonify({
                "error": "No study material available."
            }), 400

        prompt = f"""

Study material:

{notes}
"""

        response_schema = {
            "type": "OBJECT",
            "properties": {

                "mcqs": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {

                            "question": {
                                "type": "STRING"
                            },

                            "options": {
                                "type": "OBJECT",
                                "properties": {

                                    "A": {
                                        "type": "STRING"
                                    },

                                    "B": {
                                        "type": "STRING"
                                    },

                                    "C": {
                                        "type": "STRING"
                                    },

                                    "D": {
                                        "type": "STRING"
                                    }

                                },
                                "required": [
                                    "A",
                                    "B",
                                    "C",
                                    "D"
                                ]
                            },

                            "answer": {
                                "type": "STRING"
                            }

                        },

                        "required": [
                            "question",
                            "options",
                            "answer"
                        ]
                    }
                }
            },

            "required": [
                "mcqs"
            ]
        }

        response = call_gemini_with_retry(
            contents=prompt,
            response_schema=response_schema,
            temperature=0.4,
            max_output_tokens=3000,
        )

        result = json.loads(response.text)

        return jsonify({
            "mcqs": result.get("mcqs", [])
        })

    except GeminiQuotaExceeded as error:

        print("GEMINI QUOTA ERROR:", error)

        return jsonify({
            "error": str(error)
        }), 429

    except GeminiOverloaded as error:

        print("GEMINI OVERLOADED:", error)

        return jsonify({
            "error": str(error)
        }), 503

    except json.JSONDecodeError:

        return jsonify({
            "error": "Gemini returned an invalid MCQ response."
        }), 500

    except Exception as error:

        print("NEW MCQ ERROR:", error)

        return jsonify({
            "error": str(error)
        }), 500


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "StudyLens AI is running",
        "ai_configured": bool(gemini_api_key),
        "ai_provider": "Google Gemini",
        "model": MODEL_NAME
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":
    app.run(debug=True)