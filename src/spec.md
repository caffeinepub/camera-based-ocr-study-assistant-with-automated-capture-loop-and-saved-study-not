# Specification

## Summary
**Goal:** Build a camera-based OCR study assistant that continuously captures text from a guided on-screen region, filters out duplicates/poor captures, and saves extracted text as persistent study notes (without any “correct answer/option” functionality).

**Planned changes:**
- Create a single-screen UI with a live camera viewfinder, transparent target box overlay, and a bottom results panel showing OCR text, status, and most recent saved capture.
- Add a Start/Stop automation toggle that runs a hands-free capture loop every ~3 seconds.
- Capture and OCR only the target box region locally on-device (no image uploads).
- Implement change detection: only accept/save new content when OCR text similarity vs last accepted text is below 80%.
- Implement blur/glare/blank rejection: discard OCR outputs under 15 characters and show a “not enough text” status.
- Add “Study Assistant” utilities: copy extracted text to clipboard, save as a study note, and an optional (disabled/placeholder) local summarization panel that does not produce “correct options/answers.”
- Persist notes via a single Motoko backend actor with create/list (most recent first)/delete operations, including id, extractedText, createdAt, and optional title/tag.
- Add error handling and safe pausing: on camera/OCR errors, stop the loop, show a readable error, and provide a one-click retry.
- Apply a consistent dark-mode “scanner” theme across viewfinder, overlays, controls, results panel, and notes list.

**User-visible outcome:** Users can grant camera access, start an automated scanning loop that extracts text from a target box, see live status and OCR results, copy/save new text as persistent study notes, review recent notes, and recover gracefully from camera/OCR errors—without any exam/quiz “answering” features.
