/**
 * Utility functions to display generated prompts on the home page.
 */

/**
 * Populate the page with newly generated prompts
 */
function displayPrompts(data) {
    document.getElementById("main-loader").classList.add("hidden");

    document.getElementById("start-again-container").classList.remove("hidden");

    const toggle = document.getElementById("copy-toggle");
    document.getElementById("toggle-container-2").appendChild(toggle);

    document.getElementById(`generate-more-container`).classList.remove('hidden');

    // Loop through results and build UI entries
    for (let i = prompt_count; i < data.prompts.length + prompt_count; i++) {

        const prompt_index = i - prompt_count;

        const originalPrompt = data.prompts[prompt_index].prompt;

        let headingText = data.prompts[prompt_index].prompt_heading;
        if (headingText.length > 40) headingText = headingText.substring(0, 40) + "...";

        replaceAndListen(`reason-button-${i + 1}`, 'click', (event) => {
            event.stopPropagation();
            hideBubbles();
            const bubble = document.getElementById(`response-reason-${i + 1}`);
            bubble.classList.add('speech-bubble-visible');
            const reason = data.prompts[prompt_index].reason_for_choosing;
            bubble.innerText = reason;
        });

        document.getElementById(`response-heading-text-${i + 1}`).innerText = headingText;
        document.getElementById(`response-text-${i + 1}`).innerText = originalPrompt;
        document.getElementById(`original-prompt-text-${i + 1}`).innerHTML = originalPrompt;
        document.getElementById(`response-container-${i + 1}`).classList.remove('hidden');
        document.getElementById(`copy-button-${i + 1}`).innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
        document.getElementById(`spec-button-${i + 1}`).classList.add('hidden');
        resetRatings(i + 1);

        const clarifyTopic = async () => {

            if (document.getElementById(`clarify-topic-${i + 1}`).classList.contains('disabled')) return;

            let fullCurrentPrompt = document.getElementById(`response-text-${i + 1}`).innerText.split("\n\nAdditional context");
            let original = fullCurrentPrompt[0];

            const topic = document.getElementById('topic').value;

            if (document.getElementById(`clarify-topic-${i + 1}`).classList.contains('disabled')) return;
            setButtonState(i + 1, false);
            document.getElementById(`little-loader-${i + 1}`).classList.remove('hidden');
            const response = await fetchApi("/api/clarifyTopic", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: original, subjectId: Number(document.getElementById('subject').value), topic })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {

                applyPromptUpdate(i + 1, data.prompt);

                let specButton = document.getElementById(`spec-button-${i + 1}`);
                specButton.classList.remove('hidden');
                replaceAndListen(`spec-button-${i + 1}`, 'click', () => {
                    displayModal(data.specDetails);
                    MathJax.typeset();
                })

                document.getElementById(`clarify-topic-${i + 1}`).classList.add("disabled");

            }
        }
        replaceAndListen(`clarify-topic-${i + 1}`, 'click', clarifyTopic);

        const saveToRecipeBook = async () => {

            if (document.getElementById(`save-recipe-${i + 1}`).classList.contains('disabled')) return;

            const prompt = document.getElementById(`response-text-${i + 1}`).innerText;
            const subjectId = Number(document.getElementById('subject').value);
            const topic = document.getElementById('topic').value;

            const response = await fetch("/recipes/new", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjectId, topic, prompt })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {
                console.log("Recipe saved successfully")
                document.getElementById(`save-recipe-${i + 1}`).classList.add("disabled");
            }

        }
        replaceAndListen(`save-recipe-${i + 1}`, 'click', saveToRecipeBook);

        const thinkDeeper = async () => {

            let fullCurrentPrompt = document.getElementById(`response-text-${i + 1}`).innerText.split("\n\nAdditional context");
            let currentPrompt = fullCurrentPrompt[0]
            let additionalContext = (fullCurrentPrompt.length == 1 ? "" : `\n\nAdditional context${fullCurrentPrompt[1]}`)

            if (document.getElementById(`think-deeper-${i + 1}`).classList.contains('disabled')) return;
            setButtonState(i + 1, false);
            document.getElementById(`little-loader-${i + 1}`).classList.remove('hidden');
            const response = await fetchApi("/api/thinkDeeper", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt, subjectId: Number(document.getElementById('subject').value) })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {
                applyPromptUpdate(i + 1, data.prompt + additionalContext);
            }
        }
        replaceAndListen(`think-deeper-${i + 1}`, 'click', thinkDeeper);

        const reduceComplexity = async () => {

            let fullCurrentPrompt = document.getElementById(`response-text-${i + 1}`).innerText.split("\n\nAdditional context");
            let currentPrompt = fullCurrentPrompt[0]
            let additionalContext = (fullCurrentPrompt.length == 1 ? "" : `\n\nAdditional context${fullCurrentPrompt[1]}`)

            const topic = document.getElementById('topic').value;

            if (document.getElementById(`reduce-complexity-${i + 1}`).classList.contains('disabled')) return;
            setButtonState(i + 1, false);
            document.getElementById(`little-loader-${i + 1}`).classList.remove('hidden');
            const response = await fetchApi("/api/reduceComplexity", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt, subjectId: Number(document.getElementById('subject').value), topic })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {
                applyPromptUpdate(i + 1, data.prompt + additionalContext);
            }

        }
        replaceAndListen(`reduce-complexity-${i + 1}`, 'click', reduceComplexity);

        const generateVariations = async () => {

            let fullCurrentPrompt = document.getElementById(`response-text-${i + 1}`).innerText.split("\n\nAdditional context");
            let currentPrompt = fullCurrentPrompt[0]
            let additionalContext = (fullCurrentPrompt.length == 1 ? "" : `\n\nAdditional context${fullCurrentPrompt[1]}`)

            if (document.getElementById(`explore-variations-${i + 1}`).classList.contains('disabled')) return;
            setButtonState(i + 1, false);
            document.getElementById(`little-loader-${i + 1}`).classList.remove('hidden');
            const response = await fetchApi("/api/generateVariations", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');

                setButtonState(i + 1, true);
                displayModal(data.prompts, 3, additionalContext, i + 1);
            }
        }
        replaceAndListen(`explore-variations-${i + 1}`, 'click', generateVariations);

        const generatePreview = async () => {

            let currentPrompt = document.getElementById(`response-text-${i + 1}`).innerText;

            if (document.getElementById(`get-preview-${i + 1}`).classList.contains('disabled')) return;
            setButtonState(i + 1, false);
            document.getElementById(`little-loader-${i + 1}`).classList.remove('hidden');
            const response = await fetchApi("/api/generatePreview", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt })
            });

            if (response == null) {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
                return;
            }
            const data = await response.json();
            if (data.error !== undefined) {
                showToast(data.error)
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');
                setButtonState(i + 1, true);
            } else {
                document.getElementById(`little-loader-${i + 1}`).classList.add('hidden');

                let output = data.text;
                output = output
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/###\s*(.*?)\n/g, '<h2>$1</h2>')
                    .replaceAll("\n", "<br />");

                setButtonState(i + 1, true);
                displayModal(output, 2, currentPrompt);
                MathJax.typeset();
            }
        }
        replaceAndListen(`get-preview-${i + 1}`, 'click', generatePreview);
    }

    prompt_count += data.prompts.length;

    if (prompt_count >= 15) {
        document.getElementById(`generate-more-container`).classList.add('hidden');
    }

}

/**
 * Request additional prompts using the current form values
 */
async function generateMorePrompts() {

    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value;
    const subjectId = 1; // TEMP: treat everything as subject 1 until we wire the dropdown

    document.getElementById("main-loader").classList.remove("hidden");

    let response = null;

    let existing = [];
    for (let i = 0; i < prompt_count; i++) {
        existing.push(document.getElementById(`response-text-${i + 1}`).innerText);
    }

    let templates = "";
    const checkboxes = document.getElementsByClassName('checkbox');
    for (let checkbox of checkboxes) {
        if (checkbox.checked) templates += checkbox.value;
    }

    response = await fetchApi("/api/generatePrompts", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subjectId, topic, existing, templates })
    });

    if (response == null) {
        document.getElementById("main-loader").classList.add("hidden");
        return;
    }
    const data = await response.json();

    if (data.error !== undefined) {
        showToast(data.error)
        document.getElementById("main-loader").classList.add("hidden");
    } else {
        displayPrompts(data)
    }

}

/**
 * Generate the initial set of prompts from the API
 */
async function generatePrompts() {

    // 1. Read values from the page
    // ADDED: We need to read the level too!
    const level = document.getElementById('level').value; 
    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value;
    const unit = document.getElementById('unit').value;
    const learningOutcome = document.getElementById('learningOutcome').value;
    const activityType = document.getElementById('activityType').value;

    // Templates dropdown is optional – default to "auto" if it is missing
    let templates = "auto";
    const templatesElement = document.getElementById('templates');
    if (templatesElement) {
        templates = templatesElement.value;
    }

    // TEMP: hard-code a subject id so the rest of the system has something to work with
    const subjectId = 1;

    // Build template lists as the original code did
    let templateList = "";
    const categoryCheckboxes = document.getElementsByClassName('category-checkbox');
    for (let checkbox of categoryCheckboxes) {
        if (checkbox.checked) templateList += checkbox.value;
    }

    let individualList = "";
    if (templates === "individual") {
        const individualCheckboxes = document.getElementsByClassName('individual-checkbox');
        for (let checkbox of individualCheckboxes) {
            if (checkbox.checked) {
                if (individualList.length > 0) individualList += ";";
                individualList += checkbox.value;
            }
        }
    }

    // Minimal validation so we definitely hit the API
    if (topic === "") {
        alert("Type something in the Topic box first.");
        return;
    }

    // Show loaders, hide choices – same as original behaviour
    stage = 1;
    updateHelp();

    document.getElementById('help-container').style.display = 'none';
    document.getElementById('choice-container').classList.add("hidden");
    document.getElementById('main-loader').classList.remove("hidden");

    let response = null;

    try {
        response = await fetch('/api/generatePrompts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subjectId,
                level,         // <--- ADDED THIS (Sends "GCSE", "A Level" etc)
                subject,       // <--- ADDED THIS (Sends "Computer Science", etc)
                topic,
                existing: [],
                templates: templateList,
                individuals: individualList,
                unit,
                learningOutcome,
                activityType
            })
        });
    } catch (err) {
        console.error('Error calling /api/generatePrompts', err);
    }

    if (response == null) {
        document.getElementById('main-loader').classList.add("hidden");
        document.getElementById('choice-container').classList.remove("hidden");
        stage = 0;
        updateHelp();
        return;
    }

    const data = await response.json();

    if (data.error !== undefined) {
        showToast(data.error)
        document.getElementById("main-loader").classList.add("hidden");
        document.getElementById("choice-container").classList.remove("hidden");
        stage = 0;
        updateHelp();
    } else {
        displayPrompts(data);
    }

    checkOverflow();
    handleScroll();

    // These listeners only need to be attached once really, but leaving them here as per original code
    // wrapped in guards to prevent errors if elements don't exist
    const dashboardBtn = document.getElementById("goto-dashboard");
    if(dashboardBtn) dashboardBtn.addEventListener("click", confirmNavigation);
    
    const recipesBtn = document.getElementById("goto-recipes");
    if(recipesBtn) recipesBtn.addEventListener("click", confirmNavigation);

}
