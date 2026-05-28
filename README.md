<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5074e9c4-eb1b-45f0-ba47-8803b81922c1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `COZE_API_TOKEN` and `COZE_WORKFLOW_ID` in [.env.local](.env.local) to your Coze Personal Access Token and Workflow ID
3. Run the app:
   `npm run dev`

## Coze Workflow Inputs

The statistics AI sends these workflow parameters:

- `mode`: `stats_chat` or `policy_report`
- `prompt`: Full prompt with current statistics context
- `question`: User chat question
- `history`: Recent chat history as JSON string
- `stats_context`: Current statistics data as JSON string
- `attachments`: Uploaded media metadata and Coze `file_id` values as JSON string

Use `COZE_PARAMETERS_FORMAT="object"` for this workflow.
