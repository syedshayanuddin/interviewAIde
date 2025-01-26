from groq import Groq
import os
import json
import requests
import gradio as gr

client = Groq(api_key=os.getenv('GROQ_API_KEY'))
MODEL = 'llama3-70b-8192'

def get_interview_questions(domain):
    """Get interview questions for a given domain by querying the Flask API."""
    url = f'http://127.0.0.1:5000/questions?domain={domain}'
    response = requests.get(url)
    if response.status_code == 200:
        return json.dumps(response.json())
    else:
        return json.dumps({"error": "API request failed", "status_code": response.status_code})

def run_conversation(user_prompt):
    messages = [
        {
            "role": "system",
            "content": "You are an AI assistant that helps generate relevant interview questions based on a user's background and the position they're applying for. Analyze the user's input to determine the most relevant domain(s) for interview questions. Then use the get_interview_questions function to retrieve questions for each identified domain."
        },
        {
            "role": "user",
            "content": user_prompt,
        }
    ]
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_interview_questions",
                "description": "Get interview questions for a given domain",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "domain": {
                            "type": "string",
                            "description": "The domain or field of interest (e.g. 'artificial intelligence', 'machine learning')",
                        }
                    },
                    "required": ["domain"],
                },
            },
        }
    ]
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",  
        max_tokens=4096
    )

    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls
    if tool_calls:
        available_functions = {
            "get_interview_questions": get_interview_questions,
        }
        all_questions = []
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_to_call = available_functions[function_name]
            function_args = json.loads(tool_call.function.arguments)
            function_response = function_to_call(
                domain=function_args.get("domain")
            )
            response_data = json.loads(function_response)
            all_questions.extend(response_data.get("questions", []))
        
        # Format all questions into a single string with correct numbering
        formatted_questions = "\n".join([f"{i}. {q}" for i, q in enumerate(all_questions[:5], 1)])
        
        return formatted_questions

def gradio_interface(user_prompt):
    return run_conversation(user_prompt)

interface = gr.Interface(fn=gradio_interface, inputs="text", outputs="text")
interface.launch()
