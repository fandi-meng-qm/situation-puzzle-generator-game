var BACKEND_URL = "https://situationpuzzlegenerator.azurewebsites.net";
// const backendUrl = BACKEND_URL || 'http://127.0.0.1:5000';
const backendUrl = 'http://127.0.0.1:5010';


const initialMaxNumCluesToConceal = 3;
var maxNumCluesToConceal = initialMaxNumCluesToConceal;
var numCluesToSelect = maxNumCluesToConceal;

const formConfig = [
    {
        question: "Select a period of time",
        options: ["Evening", "May", "Night", "1999", "Morning", "Monday"]
    },
    {
        question: "Select a location",
        options: ["Paris", "Street", "Hospital", "Car", "Grocery", "Downtown"]
    },
    {
        question: "Select a character",
        options: ["Hero", "Villain", "Sidekick", "Mentor", "Monster", "Princess"]
    },
    {
        question: "Select the object",
        options: ["Gun", "Wound", "Weapon","Scissors","Shoes", "Fruit"]
    }
];

const answers = {};
puzzles={};
draft_story="";
final_story="";

var cluesToHide = {};
function generateForm() {
    const formContainer = document.getElementById('form');
    formConfig.forEach((section, index) => {
        sectionDiv = document.createElement('div');
        sectionDiv.id = `section${index + 1}`;
        sectionDiv.className = 'form-container';

        if (index !== 0) {
            sectionDiv.style.display = 'none';
        }

        const rowDiv = document.createElement('div');
        rowDiv.className = 'row align-items-center';

        const buttonGroupCol = document.createElement('div');
        buttonGroupCol.className = 'col-8';

        questionDiv = document.createElement('div');
        questionDiv.className = 'question fs-4';
        questionDiv.textContent = section.question;
        sectionDiv.appendChild(questionDiv);

        buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        section.options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'button';
            button.onclick = () => selectAnswer(index + 1, option);
            buttonGroup.appendChild(button);
        });

        buttonGroupCol.appendChild(buttonGroup);

        const regenerateButtonCol = document.createElement('div');
        regenerateButtonCol.className = 'col-4 text-end';

        const regenerateButton = document.createElement('button');
        regenerateButton.textContent = 'Regenerate';
        regenerateButton.className = 'btn btn-outline-primary me-md-2';
        regenerateButton.onclick = () => regenerateOptions(index + 1);
        regenerateButtonCol.appendChild(regenerateButton);

        rowDiv.appendChild(buttonGroupCol);
        rowDiv.appendChild(regenerateButtonCol);

        sectionDiv.appendChild(rowDiv);

        formContainer.appendChild(sectionDiv);
    });
    // Generate story draft button
    const generateButtonDiv = document.getElementById("generate-button")
    const submitButton = document.createElement('button');
    submitButton.className = 'submit-button';
    submitButton.id="submit-button";
    submitButton.textContent = 'Generate';
    submitButton.style.display = 'none';
    submitButton.onclick = submitForm;
    generateButtonDiv.appendChild(submitButton);

    // Final generate button
    const finalGenerateButtonDiv = document.getElementById("final-generate-button")
    const finalSubmitButton = document.createElement('button');
    finalSubmitButton.className = 'submit-button';
    finalSubmitButton.id="final-submit-button";
    finalSubmitButton.textContent = 'Generate Final Story';
    finalSubmitButton.style.display = 'none';
    finalSubmitButton.onclick = submitDraft;
    finalGenerateButtonDiv.appendChild(finalSubmitButton);
}


function selectAnswer(section, answer) {
    answers['section' + section] = answer;
    const currentSection = document.getElementById('section' + section);
    currentSection.classList.add('active');
    updateButtonSelection(section, answer);

    const nextSection = document.getElementById('section' + (section + 1));
    if (nextSection) {
        nextSection.style.removeProperty('display');
    } else {
        document.getElementById("submit-button").style.display = 'block';
    }
}

function revealFinalGenerateButton() {
    document.getElementById("final-submit-button").style.display = 'block';
}

function validateInput(section, input) {
    if (input.trim() !== '') {
        selectAnswer(section, input);
        return true;
    }
    return false;
}

function updateButtonSelection(section, answer) {
    const buttons = document.querySelectorAll(`#section${section} .button-group button`);
    buttons.forEach(button => {
        if (button.textContent === answer) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
}

function regenerateOptions(section) {
    const typeMapping = {
        1: 'time',
        2: 'place',
        3: 'character',
        4: 'object'
    };
    const type = typeMapping[section];
    console.log("regenerateOPtions");

    fetch(`${backendUrl}/get_options?type=${type}`)
        .then(response => response.json())
        .then(data => {
            let options = data[`options`];
            console.log(options);
            // Check if options is a string and try to parse it
            if (typeof options === 'string') {
                try {
                    options = JSON.parse(options);
                } catch (e) {
                    console.error('Error parsing options:', e);
                    return;
                }
            }

            if (Array.isArray(options)) {
                const buttonGroup = document.querySelector(`#section${section} .button-group`);
                buttonGroup.innerHTML = ''; // Clear existing options

                options.forEach(option => {
                    const button = document.createElement('button');
                    button.textContent = option;
                    button.onclick = () => selectAnswer(section, option);
                    buttonGroup.appendChild(button);
                });
            } else {
                console.error('Error: options is not an array');
            }
        })
        .catch(error => console.error('Error:', error));
}

async function submitForm() {
    console.log(JSON.stringify(answers));
    const responseDiv = document.getElementById('response');
    responseDiv.style.removeProperty('display');
    responseDiv.innerHTML = 'Loading...';
    revealFinalGenerateButton();
    try {
        const response = await fetch(`${backendUrl}/generate_draft_story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(answers)
        });
        const data = await response.json();
        // data = "In 1999, in a remote car park, a popular reality TV show contestant known as \"Sidekick\" was found dead. The cause of death was determined to be a mysterious wound that appeared to have been inflicted with a sharp object. Despite there being no witnesses to the crime, the police began to investigate the other contestants on the show, as tensions had been running high among the competitors. As they delved deeper into the lives of the contestants, they uncovered a web of jealousy, rivalry, and betrayal that ultimately led to the shocking murder of \"Sidekick.\" Through careful examination of the evidence left behind at the scene, the police were able to piece together the sequence of events that had led to the tragic death of the reality TV star."
        console.log(data)
        // Split the text into sentences
        let sentences = data.answer.split(/[.!?]+/).filter(i => i); // Remove empty
        // let sentences = data.split(/[.!?]+/);
        maxNumCluesToConceal = Math.min(initialMaxNumCluesToConceal, sentences.length)
        sentences.forEach((sentence) => {
        console.log("Sentence " + sentence)
        }
        )
        console.log("Sentence length" + sentences.length)
        numCluesToSelect = maxNumCluesToConceal;
        responseDiv.innerHTML = "";
        storyTitleDiv = document.createElement('div');
        storyTitleDiv.className = 'question fs-4';
        storyTitleDiv.textContent = "Situation Story Draft. Max number of clues to hide: " + maxNumCluesToConceal;
        responseDiv.appendChild(storyTitleDiv);

        storyDraft = document.createElement('p');
        storyDraft.className = "button-group"
        sentences.forEach((sentence) => {
            if(sentence.trim() !== '') {
                sentence = sentence.trim()
                sentence += "." // TODO: add original punctuation

                let buttonSpan = document.createElement('span');
                buttonSpan.textContent = sentence;
                buttonSpan.className = "draft";
                buttonSpan.addEventListener('click', () => {
                    console.log(buttonSpan.style.backgroundColor)
                    if (buttonSpan.getAttribute("data-state") == "selected") {
                            buttonSpan.className = "draft";
                            numCluesToSelect += 1;
                            buttonSpan.setAttribute("data-state", "unselected");
                            delete cluesToHide[buttonSpan.textContent];
                    }
                    else {
                        if (numCluesToSelect > 0) {
                            buttonSpan.className = "draft_selected";
                            numCluesToSelect -= 1;
                            buttonSpan.setAttribute("data-state", "selected");
                            cluesToHide[buttonSpan.textContent] = true;
                        }
                        else {
                            console.log("numCluesExceeded");
                        }
                    }
                    console.log("numClues: " + numCluesToSelect);
                });
                storyDraft.appendChild(buttonSpan);
            }
        });

        responseDiv.appendChild(storyDraft);

        draft_story = data.answer;
    } catch (error) {
        responseDiv.innerHTML = 'Error: ' + error.message;
    }
}

/**
 * Submit draft (for final story)
 */
async function submitDraft() {
    console.log("submitDraft")
    if (numCluesToSelect == 0) {
        // TODO: submit
        console.log(cluesToHide)
        finalstorydiv=document.getElementById("final-story");
        finalstorydiv.textContent = JSON.stringify(cluesToHide);
        finalstorydiv.style.display = "block";
    };
}

// async function generatePuzzleQuestion(sentences) {
//     const puzzleDiv = document.getElementById('puzzle-form');
//     puzzleDiv.style.removeProperty('display');
//     puzzleDiv.innerHTML = '';

//     sentences.forEach((sentence) => {
//         if(sentence.trim() !== '') {
//             let button = document.createElement('button');
//             button.className = "btn btn-outline-primary mb-2 mt-2";
//             button.textContent = sentence.trim(); // Set the sentence as the button text
//             button.onclick = () => selectPuzzleAnswer(sentence);
//             puzzleDiv.appendChild(button);
//         }
//     });
// }

// function selectPuzzleAnswer(answer) {
//     if (!puzzles[answer]) {
//         puzzles[answer] = true;
//     } else {
//         delete puzzles[answer];
//     }
//     updatePuzzleButtonSelection();
//     const puzzleCount = Object.keys(puzzles).length;
//     const confirmButton = document.getElementById('confirm-button');
//     if (puzzleCount > 0 && puzzleCount < 5) {
//         confirmButton.style.removeProperty('display');
//     } else {
//         confirmButton.style.display = 'none';
//     }
// }

// function updatePuzzleButtonSelection() {
//     const puzzlebuttons = document.querySelectorAll('#puzzle-form button');
//     puzzlebuttons.forEach(button => {
//         if (puzzles[button.textContent]) {
//             button.classList.remove('btn-outline-primary');
//             button.classList.add('btn-primary');
//         } else {
//             button.classList.remove('btn-primary');
//             button.classList.add('btn-outline-primary');
//         }
//     });
// }

async function generateFinalStory() {
    // Placeholder function for final story generation
    console.log('Generating final story with selected puzzles: ' + Object.keys(puzzles).join(', '));
    finalstorydiv=document.getElementById("final-story");
    finalstorydiv.style.removeProperty('display');
    finalstorydiv.innerHTML = "";
    try {
        const response = await fetch(`${backendUrl}/generate_final_story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(puzzles)
        });
        data = await response.json();
        final_story = data[`story`];
        console.log(final_story);
        // Check if options is a string and try to parse it
        if (typeof final_story === 'string') {
            try {
                final_story = JSON.parse(final_story);
            } catch (e) {
                console.error('Error parsing story and answer:', e);
                return;
            }
        }

        if (Array.isArray(final_story)) {


            storyTitleTextDiv = document.createElement('div')
            storyTitleText = document.createElement('h1');
            storyTitleText.className = "text-uppercase fs-4 mb-3 mt-2";
            storyTitleText.textContent = "Situation\n";
            storyTitleTextDiv.appendChild(storyTitleText);
            finalstorydiv.appendChild(storyTitleTextDiv);

            storyTextDiv = document.createElement('div')
            storyText = document.createElement('text-start');
            storyText.className = "mb-5";
            storyText.textContent = final_story[0];
            storyTextDiv.appendChild(storyText);
            finalstorydiv.appendChild(storyTextDiv);

            answerTitleTextDiv = document.createElement('div')
            answerTitleText = document.createElement('h1');
            answerTitleText.className = "text-uppercase fs-4 mb-3 mt-5";
            answerTitleText.textContent = "Answer\n";
            answerTitleTextDiv.appendChild(answerTitleText);
            finalstorydiv.appendChild(answerTitleTextDiv);

            answerTextDiv = document.createElement('div')
            answerText = document.createElement('text-start');
            answerText.className = "mb-3";
            answerText.textContent = final_story[1];
            answerTextDiv.appendChild(answerText);
            finalstorydiv.appendChild(answerTextDiv);

        } else {
            console.error('Error: options is not an array');
        }
    } catch (error) {
        finalstorydiv.innerHTML = 'Error: ' + error.message;
    }
}

document.addEventListener('DOMContentLoaded', generateForm);