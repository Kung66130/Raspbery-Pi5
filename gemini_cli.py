import os
import sys
import google.generativeai as genai

def get_api_key():
    key_path = os.path.expanduser('~/.gemini_key')
    if os.path.exists(key_path):
        with open(key_path, 'r') as f:
            return f.read().strip()
    return None

def main():
    api_key = get_api_key()
    if not api_key:
        print('Error: API Key not found in ~/.gemini_key')
        print('Please put your key in ~/.gemini_key file.')
        sys.exit(1)
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    if len(sys.argv) > 1:
        # One-off question
        prompt = ' '.join(sys.argv[1:])
        try:
            response = model.generate_content(prompt)
            print(response.text)
        except Exception as e:
            print(f'Error: {str(e)}')
    else:
        # Interactive mode
        chat = model.start_chat(history=[])
        print('Gemini CLI (Interactive Mode) - Type "exit" to quit')
        while True:
            try:
                user_input = input('You: ')
                if user_input.lower() in ['exit', 'quit']:
                    break
                response = chat.send_message(user_input)
                print(f'\nGemini: {response.text}\n')
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f'Error: {str(e)}')

if __name__ == '__main__':
    main()
