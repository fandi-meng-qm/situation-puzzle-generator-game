from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
client = OpenAI()
CORS(app)
history = []
draft_story_save = ""
puzzles = ""
final_story = ""
game_history = []

def generate_draft_story_message(time, place, character, objectname):
    history = []
    messages = [
        {"role": "user",
        "content": f"Please generate a complete short story of up to 50 words using the following keywords{time, place, character, objectname}. The story needs to have a complete narrative with cause and effect, as well as some non-daily factors."}
    ]
    history.append(messages[0])
    return messages, history

def generate_puzzle(story, history):
    messages = history.copy()
    messages.append({"role": "assistant", "content": f"{story}"})
    messages.append(
        {"role": "user", "content": f"Find five information puzzle informed or implied in the story or related to the natural, well-established traits of the time, place, character, or weapon that can be explain the cause-effect relationships. Return them in the following format without numerical numbering [\"sentence\",\"sentence\",\"sentence\",\"sentence\",\"sentence\"]"}
    )
    print(messages)
    history = messages.copy()
    return messages, history

def generate_final_story_prompt_v0(info_to_hide, puzzles, history):
    messages = history.copy()
    messages.append({"role": "assistant", "content": f"{puzzles}"})
    messages.append(
        {"role": "user", "content": f"Rewrite the story. The puzzle should be created by removing the selected parts from the complete story and rephrasing it as a coherent narrative with missing information. The puzzle should have a reasonable difficulty level and revolve around the hidden information. At the end of telling the story, propose a question that can be solved or explained by the hidden information. The information to be hidden are {info_to_hide}. Write the answer, which is the hidden information, in an answer narrative. Combine the story and the answer in an array like shown in the following example [\"The situation story\",\"The hidden information\"]. Return the array."}
    )
    print(messages)
    return messages

def generate_final_story_prompt_v1(info_to_hide, story, history):
    messages = history.copy()
    messages.append({"role": "assistant", "content": f"{story}"})
    messages.append(
        {"role": "user", "content": f"There is a story and the information {info_to_hide} which need to be hide, \
        please design a situation puzzle based on these. The puzzle should be created by removing the ‘hidden information’\
         from the complete story and rephrasing it as a coherent narrative with missing information. The puzzle should have \
         a reasonable difficulty level and revolve around the hidden information. After creating the situation puzzle, \
         please provide the answer to the puzzle, which should consist of the hidden parts of the story. \
         Combine the story and the answer in an array like shown in the following example [\"The situation story\",\"The hidden information\"]. Return the array. "}
    )
    print(messages)
    return messages

def generate_story_options(request):
    messages = [
        {"role": "user", "content": request}
    ]
    return messages

@app.route('/')
def index():
    backend_url = os.getenv('BACKEND_URL')
    return render_template('index.html', backend_url=backend_url)

@app.route('/generate_draft_story', methods=['POST'])
def draft_story():
    global draft_story_save, history
    data = request.get_json()
    print(data)
    time_data = data.get('section1')
    place_data = data.get('section2')
    character_data = data.get('section3')
    reason_data = data.get('section4')
    if not data:
        return jsonify({'error': 'No query provided'}), 400
    try:
        messages, history = generate_draft_story_message(time_data, place_data, character_data, reason_data)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        answer = response.choices[0].message.content
        print(response.choices[0].message)
        draft_story_save = answer
        return jsonify({'answer': answer})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500

@app.route('/get_options', methods=['GET'])
def get_options():
    print("get_options")
    query_type = request.args.get('type')
    if not query_type:
        return jsonify({'error': 'No query type provided'}), 400
    prompts = {
        "time": "Provide 6 different times, including various scales such as days, months, years, seasons, eras, or even abstract concepts related to time, in a json array format, for example, [\"Evening\", \"May\", \"Night\", \"1999\", \"Morning\", \"Monday\"]",
        "place": "Provide 6 different places, covering a wide range of places like cities, countries, continents, landmarks or even fictional locations, in a json array format, for example, [\"Paris\", \"New York\", \"Tokyo\", \"Beach\", \"Mountain\", \"Desert\"]",
        "character": "Provide 6 different characters, including diverse types even non-human creatures in a json array format, for example, [\"Hero\", \"Villain\", \"Sidekick\", \"Mentor\", \"Monster\", \"Princess\"]",
        "object": "Provide 6 different objects, ranging from everyday items to unique, mysterious, or technologically advanced objects in a json array format, for example, [\"Gun\", \"Wound\", \"Weapon\", \"Scissors\", \"Shoes\", \"Fruit\"]"
    }
    prompt = prompts.get(query_type)
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=generate_story_options(prompt)
        )
        answer = response.choices[0].message.content
        print(response.choices[0].message.content)
        return jsonify({'options': answer})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500

@app.route('/get_puzzle_options', methods=['GET'])
def get_puzzle_options():
    global draft_story_save, history
    try:
        messages, history = generate_puzzle(draft_story_save, history)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        answer = response.choices[0].message.content
        print(response.choices[0].message.content)
        return jsonify({'options': answer})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500

@app.route('/generate_final_story', methods=['POST'])
def generate_final_story():
    global draft_story_save, history
    hiddeninfo = request.get_json()
    print(hiddeninfo)
    try:
        messages = generate_final_story_prompt_v1(hiddeninfo, draft_story_save, history)
        print(messages)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        answer = response.choices[0].message.content
        print(response.choices[0].message.content)
        return jsonify({'story': answer})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500

def generate_ai_game_play(puzzle, game_history):
    # global n_question
    messages = game_history.copy()
    messages.append({"role": "assistant", "content": f"Puzzle: {puzzle}, Game_history: {game_history}"})
    messages.append(
        {"role": "user", "content": f"There is a situation puzzle and please play it, the game host should give you yes or no answer\
         for your question and you can do the reasoning based on the game history,\
         it would be better if you can find out the truth in fewer steps. Now you can ask question like the example [\"Question\"], \
         or if you already know the truth, you can just reply with the truth. Please return the array format. "}
    )
    print(messages)
    # n_question += 1
    return messages

@app.route('/ai_game_play', methods=['POST'])
def ai_game_play():
    global draft_story_save, history
    puzzle = request.get_json()
    print(puzzle)
    try:
        messages = generate_ai_game_play(puzzle, game_history)
        print(messages)
        # response = client.chat.completions.create(
        #     model="gpt-3.5-turbo",
        #     messages=messages
        # )
        # answer = response.choices[0].message.content
        # print(response.choices[0].message.content)
        return jsonify({'question': ["Is it a bird?"]})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500


def generate_ai_game_host(puzzle, true_answer, question):
    messages = game_history.copy()
    messages.append({"role": "assistant", "content": f"Puzzle:{puzzle}, Answer:{true_answer}, Player's question:{question}"})
    messages.append(
        {"role": "user",
         "content": f"You are the host of a situation puzzle game. This is the puzzle and its answer, please based on \
         this to answer ['yes'] or ['no'] to the player's question in an array format. And if the player's question is \
         the truth roughly match the puzzle answer, please respond ['solved']"}
    )
    print(messages)
    return messages

@app.route('/ai_game_host', methods=['POST'])
def ai_game_host():
    data = request.get_json()
    print(data)
    puzzle = data["puzzle"]
    true_answer = data["true_answer"]
    question = data["question"]
    try:
        messages = generate_ai_game_host(puzzle, true_answer, question)
        print(messages)
        # response = client.chat.completions.create(
        #     model="gpt-3.5-turbo",
        #     messages=messages
        # )
        # answer = response.choices[0].message.content
        # print(response.choices[0].message.content)
        return jsonify({'answer': ["Yes"]}) # TODO:
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500


def generate_split_story(story, history):
    messages = history.copy()
    messages.append({"role": "assistant", "content": f"{story}"})
    messages.append(
        {"role": "user", "content":
        f"Please split the provided story text into fragmented segments, with each segment containing at least one piece of information related to 'Environment or scene details', 'Specific roles or identities', 'Time or sequence', 'Abnormal emotions or motivations', or 'Domain knowledge or common sense'. \
        Return them in a json list like [\"segment 1\",\"segment 2\", ...] \
        Here's the story: {story}."}
    )
    print(messages)
    history = messages.copy()
    return messages, history

@app.route('/split_story', methods=['POST'])
def split_story():
    global history
    data = request.get_json()
    print(data)
    story = data["story"]
    try:
        messages, history = generate_split_story(story, history)
        print(messages)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        answer = response.choices[0].message.content
        print(response.choices[0].message.content)
        return jsonify({'split_story_segments': answer})
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': f"General error: {e}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5010, debug=True)
