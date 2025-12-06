/**
 * Client-side logic for the main recipe generation page.
 */
const MAX_PROMPTS_ON_DISPLAY = 15;

let stage = 0;
let prompt_count = 0;

/**
 * Main entry: attach all home page event handlers
 */
document.addEventListener('DOMContentLoaded', (event) => {

    const modal = document.getElementById("modal");

    const modalClose = document.getElementById("modal-close");
    modalClose.addEventListener("click", function () {
        modal.style.display = "none";
    });

    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // Set up copy buttons for each response block
    for (let i = 1; i <= MAX_PROMPTS_ON_DISPLAY; i++) {

        const copyButton = document.getElementById(`copy-button-${i}`);

        const copyPrompt = () => {
            const promptText = document.getElementById(`response-text-${i}`);
            
            const chatGPT = document.getElementById("copyToggleCheckbox").checked;
            let textToCopy = promptText.innerText;
            if (chatGPT) {
                textToCopy = `https://chatgpt.com/?q=${encodeURIComponent(textToCopy)}`
            }

            navigator.clipboard.writeText(textToCopy).then(function () {
                copyButton.innerHTML = '<span class="material-symbols-outlined">check</span>';
                setTimeout(() => {
                    copyButton.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
                }, 3000);
            }, function (err) {
                showToast('Could not copy text');
            });
        }
        copyButton.addEventListener("click", copyPrompt);

    }

    document.getElementById("show-help").style.display = "flex";
    document.getElementById("show-help").addEventListener("click", showHelp);
    document.getElementById("hide-help").addEventListener('click', hideHelp);

    window.addEventListener('resize', checkOverflow);
    checkOverflow();
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    document.getElementById('scroll-indicator').addEventListener('click', scrollToBottom);

    loadSelections();

  document.addEventListener('click', hideBubbles);

// Safely wire up buttons and dropdowns only if they exist on this page
const generateButton = document.getElementById('generate-button');
if (generateButton) {
    generateButton.addEventListener("click", generatePrompts);
}

const generateMoreButton = document.getElementById('generate-more-button');
if (generateMoreButton) {
    generateMoreButton.addEventListener("click", generateMorePrompts);
}

const levelSelect = document.getElementById("level");
if (levelSelect) {
    // In this teacher-only build we are not loading subjects from the database
    // levelSelect.addEventListener("change", updateSubjectList);
}

const subjectSelect = document.getElementById("subject");
if (subjectSelect) {
    // Likewise, do not auto-load recipes when the subject changes
    // subjectSelect.addEventListener("change", loadRecipes);
}

const templatesSelect = document.getElementById("templates");
if (templatesSelect) {
    templatesSelect.addEventListener("change", displayTemplateSelectors);
}
// Wire up the new category dropdown
    const categorySelect = document.getElementById("activityCategory");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateActivityTasks);
    }

    const textarea = document.getElementById('topic');
    textarea.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            if (event.shiftKey) {
                const cursorPosition = textarea.selectionStart;
                textarea.value = textarea.value.slice(0, cursorPosition) + '\n' + textarea.value.slice(cursorPosition);
                textarea.selectionStart = textarea.selectionEnd = cursorPosition + 1;
                event.preventDefault();
            } else {
                event.preventDefault();
                generatePrompts();
            }
        }
    });

    document.getElementById("start-again").addEventListener("click", startAgain);
    document.getElementById("logout").addEventListener("click", confirmLogout);

    const copyToggleCheckbox = document.getElementById("copyToggleCheckbox");
    const copyToggleChecked = localStorage.getItem('copyToggleCheckbox');

    copyToggleCheckbox.checked = copyToggleChecked === "true";
    copyToggleCheckbox.addEventListener("change", () => {        
        localStorage.setItem('copyToggleCheckbox', copyToggleCheckbox.checked ? "true" : "false");
    });

    const voteButtons = document.getElementsByClassName("vote-button");
    for (let button of voteButtons) {
        button.addEventListener("click", () => {
            const isLike = button.classList.contains("like-button");
            const type   = isLike ? "like" : "dislike";
            const other  = isLike ? "dislike" : "like";

            const child = button.children[0];
            
            const promptText = document.getElementById(
                button.id.replace(`${type}-button-`, "response-text-")
            );

            let voteId = Number(promptText.dataset.voteid);
            if (isNaN(voteId)) voteId = -1;
            
            const recipeText = promptText.textContent.trim();
            const subjectSelector = document.getElementById('subject');
            const subjectId       = Number(subjectSelector.value);          
            const topic           = document.getElementById('topic')?.value;

            const alreadyClicked = child.classList.contains(`${type}-clicked`);
            const voteValue      = alreadyClicked ? 0 : (isLike ? 1 : -1);

            fetch('/vote', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({
                    voteId,
                    recipe  : recipeText,
                    value   : voteValue,
                    topic,
                    subjectId
                })
            })
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
            .then(data => {                
                promptText.dataset.voteid = data.voteId;

                child.classList.toggle(`${type}-clicked`);

                const siblingBtn = document.getElementById(
                    button.id.replace(type, other)
                );
                const siblingIcon = siblingBtn.children[0];
                if (siblingIcon.classList.contains(`${other}-clicked`)) {
                    siblingIcon.classList.toggle(`${other}-clicked`, false);
                }   

            })
            .catch(err => {                
                console.error('Voting failed:', err);
                child.classList.toggle(`${type}-clicked`, alreadyClicked);
                showToast('Sorry, something went wrong while recording your vote.');
            });

        });
    }

});
// --- Activity Menu Logic ---

const ACTIVITY_DATA = {
    "Assessments": [
        "Multiple Choice Questions (MCQ)",
        "True or False Questions",
        "Practice Exam Questions",
        "Open-ended / Essay Questions",
        "Comparison Tasks",
        "Fill in the Blanks"
    ],
    "In Class Tasks": [
        "Think-Pair-Share",
        "Socratic Questioning",
        "Debate Topics",
        "Group Discussion Prompts",
        "Starter Activity",
        "Plenary / Exit Ticket"
    ],
    "Research": [
        "Guided Research Task",
        "Fact-Checking Exercise",
        "Literature Review Basics",
        "Source Analysis"
    ],
    "Practical Tasks": [
        "Step-by-step Demonstration Guide",
        "Safety Checklist Creation",
        "Scenario / Case Study",
        "Role Play Scenario"
    ],
    "Feedback & Support": [
        "Common Misconceptions List",
        "Marking Rubric Generation",
        "Student Feedback Generator",
        "Revision Summary Notes"
    ]
};

function updateActivityTasks() {
    const category = document.getElementById("activityCategory").value;
    const taskSelect = document.getElementById("activityType");

    // Clear existing options
    taskSelect.innerHTML = "";

    if (category && ACTIVITY_DATA[category]) {
        // Enable the dropdown
        taskSelect.disabled = false;
        
        // Add options
        ACTIVITY_DATA[category].forEach(task => {
            const option = document.createElement("option");
            option.value = task;
            option.text = task;
            taskSelect.add(option);
        });
    } else {
        // Reset if no category selected
        taskSelect.disabled = true;
        const option = document.createElement("option");
        option.text = "Select a category first...";
        taskSelect.add(option);
    }
}
