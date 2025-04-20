# Customizable Digital OMR Sheet Simulator

A simple, client-side web application that serves as a flexible digital OMR (Optical Mark Recognition) sheet. It allows users to create a custom answer-marking interface for specific multiple-choice questions they are practicing from external sources (like textbooks, worksheets, or practice tests).

## Live Demo

You can access the live version of this simulator hosted on GitHub Pages here:

**[https://samueladmand.github.io/Digital-OMR-Sheet/](https://samueladmand.github.io/Digital-OMR-Sheet/)**

## Core Purpose

The main goal is to provide a focused and efficient way to record answers only for the specific question numbers or ranges a user is currently working on, avoiding the need for a full, pre-printed OMR sheet. It's designed for targeted practice sessions.

## Key Features

*   **Custom Question Selection:** Specify exact question numbers or ranges (e.g., `1-10, 15-23, 28`). Non-contiguous sets are supported.
*   **Dynamic Interface:** Generates an OMR grid displaying rows only for the selected questions.
*   **Configurable Choices:** Set the number of options per question (e.g., 4: A-D, 5: A-E, 6: A-F). Defaults to 4.
*   **Interactive Marking:** Simple clickable bubbles for selecting answers (one per question).
*   **Integrated Answer Key Entry:** After submitting your own answers, a dedicated interface appears to visually mark the correct answers using bubbles. User's answers are hidden during this phase for clarity.
*   **Automatic Scoring & Feedback:** Calculates and displays score, accuracy, and visually highlights correct/incorrect rows based on the entered key. Shows both user's answer and the single correct key answer during results.
*   **Persistent State:** Uses browser `localStorage` to save your current sheet configuration, marked answers, and entered key entries across page reloads or browser sessions until explicitly cleared. Results display state is also persisted on refresh.
*   **Responsive Design:** Adapts layout for better usability on both desktop (two columns) and mobile devices (single column, stacked key entry).
*   **Clean Workflow:**
    *   Configuration panel hides after sheet generation for focused answering.
    *   Dynamic headings ("Your Answers", "Correct Key") provide context.
    *   User answers hide during key entry for clarity.
    *   Both user and the correct key answer are shown during results review.

## How to Use

1.  **(Configure)** On the initial screen, enter the desired question numbers or ranges in the "Question Numbers" input field (e.g., `1-5, 8, 11-13`).
2.  **(Set Options)** Select the number of choices per question from the dropdown (default is 4: A-D).
3.  **(Generate)** Click the "Generate OMR Sheet" button. The configuration panel will hide, and the custom OMR sheet will appear under a "Your Answers" heading.
4.  **(Mark Your Answers)** Click the bubbles corresponding to your answers for each generated question row.
5.  **(Submit & Enter Key)** When finished marking your answers, click the "Submit Answers & Enter Key" button. Your answers will hide, the heading changes to "Correct Key", and a new set of bubbles will appear.
6.  **(Enter Correct Key)** Click the bubbles in this second set corresponding to the *correct* answers for each question.
7.  **(Check)** Click the "Check Answers" button. The results (score, accuracy) will be displayed below the sheet. Both your answers and the single correct key answer will reappear under respective headings, and the rows will be highlighted green (correct) or red (incorrect).
8.  **(Review/Edit)**
    *   To go back and change your own answers (which will clear the results), click "Edit My Answers".
    *   To reset all selections (your answers and the key) on the *current* sheet, click "Clear All Selections".
9.  **(New Sheet)** To generate a completely new sheet with different numbers, click "Clear All Selections". This will clear the current sheet, hide the OMR section, and bring back the configuration panel.

## Technologies Used

*   HTML5
*   CSS3 (with Flexbox and Grid for layout)
*   Vanilla JavaScript (ES6+)
*   Browser Local Storage API (for persistence)

## Author

Created by Arpit Singh
