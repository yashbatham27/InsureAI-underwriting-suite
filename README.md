
# InsureAI Underwriting Suite

## Overview

**InsureAI Underwriting Suite** is a modern, AI-driven web application designed to automate the initial stages of life insurance underwriting. By leveraging Google's **Gemini models** for intelligent data extraction and a deterministic rule engine for risk assessment, the tool bridges the gap between unstructured applicant data and standardized actuarial decisions.

This application was developed as an internal group assignment for the **PGDM – IBM Life Insurance UW** course.

---

## 🚀 Key Functionalities

### 1. Multi-Modal Input Processing
*   **Manual Text Entry:** Separate input fields for "Proposal Extract" (demographics, employment) and "Medical Details" (clinical history, labs).
*   **PDF Document Upload:** Users can upload full case files (PDF). The system converts the PDF to base64 and sends it to Gemini's multimodal API to extract relevant entities.
*   **Sample Data Generator:** A "Load Sample Text" button generates realistic, randomized applicant scenarios (names, occupations, diseases, severities) for testing purposes.

### 2. Intelligent Information Extraction (AI)
*   **Entity Recognition:** Uses **Gemini 2.5/3 Flash** to parse unstructured text into a strict JSON schema.
*   **Data Points:** Extracts Applicant Name, Age, Gender, Occupation, Income, Smoker Status, Medical Conditions (with severity classification: Mild/Moderate/Severe/Critical), and Requested Riders.
*   **Robust Fallback:** Includes a Regex-based fallback mechanism to ensure critical fields like Age and Occupation are captured even if the LLM output varies.
*   **Visual Validation:** The UI highlights extracted entities within the input text fields (e.g., medical terms in amber, occupational details in purple) to allow underwriters to verify AI accuracy.

### 3. Automated Risk Assessment (Rule Engine)
*   **Medical Risk Scoring:** Maps extracted conditions to a `MORTALITY_CHART` (e.g., Hypertension, Diabetes) and assigns Extra Mortality (EM) points based on severity.
*   **Occupational Risk:** Assigns risk loadings based on profession (e.g., Mining vs. IT).
*   **Lifestyle Loading:** Automatically applies standard loads for smokers.
*   **Decision Logic:** Aggregates total points to categorize risk into:
    *   **Preferred / Standard:** Standard Acceptance.
    *   **Substandard:** Acceptance with Loading (higher premium) or Exclusions.
    *   **Decline:** Rejection based on excessive risk threshold.

### 4. Premium Computation
*   **Actuarial Calculation:** Calculates base premiums using age-banded mortality tables.
*   **Loading Application:** Applies monetary loading proportional to the calculated EM points.
*   **Rider Costing:** Adds costs for optional covers like Accident Benefit or Critical Illness.

### 5. Reporting & Output
*   **Interactive Dashboard:** Visualizes risk breakdown using bar charts and color-coded badges.
*   **PDF Generation:** Client-side generation of a professional PDF report containing the applicant profile, medical evaluation table, risk summary, and premium quote.
*   **History Management:** Saves assessed cases to `localStorage`, allowing users to retrieve or delete past assessments.

### 6. UI/UX Features
*   **Dark Mode:** Fully supported dark theme for low-light environments.
*   **Responsive Design:** Optimized for desktops, tablets, and mobile devices.
*   **Simulation UI:** specific loading states ("Reading data...", "Cross-referencing mortality tables...") to simulate the underwriting workflow.

---

## 🏗 System Design

The application follows a **Hybrid AI-Deterministic Architecture**. This is crucial for insurance compliance:
1.  **AI Layer (The "Eyes"):** Responsible *only* for understanding text and standardizing data. It does not make decisions.
2.  **Logic Layer (The "Brain"):** A hard-coded, audit-safe TypeScript engine makes the actual underwriting decisions based on pre-defined actuarial tables. This prevents AI hallucinations from approving risky policies.

### Tech Stack
*   **Frontend:** React 19 (TypeScript)
*   **Styling:** Tailwind CSS (Utility-first)
*   **AI Model:** Google GenAI SDK (`@google/genai`) - Gemini 1.5/2.5 Flash
*   **Visualization:** Recharts
*   **PDF Engine:** jsPDF & jsPDF-AutoTable
*   **Build Tool:** ES Modules (via browser native imports in `index.html`)

---

## 🧩 Component Architecture

### `App.tsx` (Controller)
The root component acting as the orchestrator.
*   **State Management:** Holds `proposalText`, `medicalText`, `result`, `history`, and `theme`.
*   **Workflow:** Manages the async flow: Input -> API Call (`extractUnderwritingData`) -> Logic (`runUnderwriting`) -> Result Display.
*   **History Sync:** Syncs state with `localStorage`.

### `components/InputPanel.tsx` (Data Entry)
Handles user inputs.
*   **Features:** Drag-and-drop PDF zone, text areas with "Clear" functionality.
*   **Sub-component:** `HighlightedTextarea` - A custom component that overlays a transparent `div` with `<mark>` tags over a standard `<textarea>` to achieve the highlighting effect for extracted entities.

### `components/ReportView.tsx` (Output)
Displays the underwriting decision.
*   **Visualization:** Renders the Risk Contribution Analysis bar chart.
*   **PDF Logic:** Contains the `handleDownloadPDF` function which draws the report onto a canvas context for download.

### `components/Header.tsx` (Navigation)
*   Contains the application branding, Theme Toggle (Sun/Moon), and History Toggle.

### `components/HistoryPanel.tsx` (Sidebar)
*   Displays a list of previous cases with summary chips (Risk Category, Name, Date). Allows reloading or deleting cases.

### `services/geminiService.ts` (AI Gateway)
*   **Prompt Engineering:** Contains the specific system instructions to force Gemini to output strictly formatted JSON conforming to the `ApplicantInfo` TypeScript interface.
*   **Normalization:** Includes logic to clean Markdown code blocks from JSON strings and run Regex fallbacks if the JSON is incomplete.

### `logic/underwriter.ts` (Rule Engine)
*   **Pure Functions:** Contains `runUnderwriting(applicant)` which is a synchronous, pure function returning the `UnderwritingResult`.
*   **Constants:** Imports risk tables from `constants.ts` to perform lookups.

---

## 🛠 Setup & Usage

1.  **API Key:** The application requires a valid `API_KEY` for Google Gemini in the environment variables.
2.  **Running:** Serve the directory using a static server (e.g., `serve`, `live-server`, or VS Code Live Server).
3.  **Dependencies:** All dependencies are loaded via ESM from CDNs (`esm.sh`), so no `npm install` is strictly necessary for a browser-based run, though a build step is recommended for production.

---

## 🛡 Disclaimer
This tool is for **educational and simulation purposes only**. The mortality tables and premium calculations are simplified representations and should not be used for actual insurance issuance.
