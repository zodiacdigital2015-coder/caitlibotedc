/**
 * API endpoints for OpenAI powered recipe generation.
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const openai = require('openai');
const zod = require('zod');
const { zodResponseFormat } = require("openai/helpers/zod");

const { setInitError } = require('../utils/initStatus');

// -- API Key Setup --
let openai_api_key = "";
const apiKeyPath = path.join(__dirname, '../../data/openai_api_key.txt');

if (fs.existsSync(apiKeyPath)) {
    try {
        openai_api_key = fs.readFileSync(apiKeyPath, 'utf8').trim();
    } catch (err) {
        setInitError('Cannot read OpenAI API Key.');
    }
} else if (process.env.OPENAI_API_KEY) {
    openai_api_key = process.env.OPENAI_API_KEY;
} else {
    setInitError('Cannot establish OpenAI API Key.');
}

const API_CONFIG = { apiKey: openai_api_key };
const PRIMARY_MODEL = "gpt-4o"; 
const PREVIEW_MODEL = "gpt-4o-mini";

// -- Zod Schemas for Structured Output --

const GeneratedPromptWithReason = zod.object({
    prompt_heading: zod.string(),
    prompt: zod.string(),
    reason_for_choosing: zod.string(),
});

const GeneratedPromptWithReasonList = zod.object({
    prompts: zod.array(GeneratedPromptWithReason),
});

const GeneratedPromptVariation = zod.object({
    prompt: zod.string(),
    what_makes_it_different: zod.string(),
});

const GeneratedPromptVariationList = zod.object({
    prompts: zod.array(GeneratedPromptVariation),
});

// -- Middleware to log API calls --
router.use((req, res, next) => {
    next();
});

// -- Async Handler Wrapper --
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


/**
 * POST /api/generatePrompts
 * Generates a structured Teacher Prompt based on Level, Subject, Unit, LO, Activity Type
 */
router.post('/generatePrompts', asyncHandler(async (req, res, next) => {

    // 1. Extract plain text values from the request
    const level = req.body.level || "FE Level";
    const subject = req.body.subject || "General";
    const unit = req.body.unit || "";
    const learningOutcome = req.body.learningOutcome || "";
    const topic = (req.body.topic || "").toLowerCase();
    
    // THE CHANGE: We take the full text directly from the menu
    // If they picked "Assessments" -> "MCQ", this string is "Multiple Choice Questions (MCQ)"
    const activityDescription = req.body.activityType || "a suitable learning activity";

    // 2. Build the System Instruction
    // We tell the AI to create whatever the user asked for
    const systemPrompt = `
You are an expert pedagogical consultant for Further Education (FE). 
Your task is to write a high-quality "AI Prompt" that a teacher can copy and paste into a tool like ChatGPT.

The teacher wants an AI prompt that will generate: ${activityDescription}.

When writing this prompt for the teacher:
- Contextualise it for the subject: ${subject} (${level}).
- Explicitly mention the Unit: "${unit}" and Learning Outcome: "${learningOutcome}" (if provided).
- Ensure the prompt asks for output suitable for 16-19 year old learners.
- The prompt should be clear, instructional, and structured.

Output your response as a JSON object containing a list with ONE item.
- "prompt_heading": A short title (e.g. "Prompt for ${activityDescription}").
- "prompt": The actual text the teacher should copy.
- "reason_for_choosing": A brief explanation of why this prompt structure works for this topic.
`.trim();

    // 3. Build the User Context
    const userPrompt = `The topic is: '${topic}'. Please generate the teacher-facing prompt now.`;

    const OpenAI = new openai(API_CONFIG);

    // 4. Call OpenAI
    const completion = await OpenAI.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 1.0,
        response_format: zodResponseFormat(GeneratedPromptWithReasonList, "generated_prompt_list"),
    });

    const generated_list = completion.choices[0].message;

    if (generated_list.refusal) {
        res.json({ error: generated_list.refusal });
    } else {
        const parsed = JSON.parse(generated_list.content);
        res.json(parsed);
    }
}));

// -- Stubs for other endpoints to prevent crashes --

router.post('/thinkDeeper', asyncHandler(async (req, res) => {
     res.json({ prompt: req.body.prompt, what_makes_it_different: "Generated via bypass" });
}));

router.post('/generateVariations', asyncHandler(async (req, res) => {
     res.json({ prompts: [] });
}));

router.post('/generatePreview', asyncHandler(async (req, res) => {
    const prompt = req.body.prompt;
    res.json({ text: "Preview mode is currently simplified. The AI would respond to: " + prompt.substring(0, 50) + "..." });
}));

router.post('/clarifyTopic', asyncHandler(async (req, res) => {
    res.json({ 
        prompt: req.body.prompt, 
        specDetails: "<p>Specification data not available in this mode.</p>" 
    });
}));

router.post('/reduceComplexity', asyncHandler(async (req, res) => {
     res.json({ prompt: req.body.prompt });
}));

module.exports = router;